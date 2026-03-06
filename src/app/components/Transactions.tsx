import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, LayoutGrid, ArrowRight, Receipt } from "lucide-react";
import { getCategoryIcon, categories as mockCategories } from "../utils/mockData";
import { UiTransaction, normalizeTransactions } from "../utils/transactionsMapper";
import * as LucideIcons from "lucide-react";
import { formatMoney } from "../utils/formatMoney";
import { useAppDate } from "../contexts/AppDateContext";
import { LoadingScreen } from "./LoadingScreen";
import { DEFAULT_EXPENSE_CATEGORIES, getCategoryIconName } from "./SettingsCategories";
import "../../styles/components/Transactions.css";

type FilterType = "all" | "income" | "expense" | "credit_payment";
type InstallmentsInfo = {
  months: number;
  monthlyAmount: number;
  currentMonth: number;
  remainingMonths: number;
};

type UiTransactionRow = UiTransaction & {
  kind: "transaction";
  cardName?: string;
  cardId?: string;
  cardColor?: string;
  categoryIcon?: string;
  installments?: InstallmentsInfo;
};

type TransferListRow = {
  kind: "transfer";
  id: string;
  transferId: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  fromCardId: string;
  toCardId: string;
  fromCardName: string;
  toCardName: string;
  toCardIsCredit: boolean;
  section: "all" | "credit_payment";
};

type ListRow = UiTransactionRow | TransferListRow;
type ManagedCategory = { id: string; name: string; icon: string; type: "income" | "expense"; aliases?: string[] };

type PaymentSource = {
  payment_method?: string | null;
  paymentMethod?: string | null;
  card_id?: string | number | null;
  cardId?: string | number | null;
  credit_limit?: number | string | null;
  name?: string | null;
  metadata?: {
    payment_method?: string | null;
    paymentMethod?: string | null;
    transferRole?: string | null;
    fromCardId?: string | number | null;
    toCardId?: string | number | null;
    installments?: {
      months?: number | string;
      monthlyAmount?: number | string;
      startAt?: string;
    } | null;
  } | null;
  transfer_id?: string | null;
  transferId?: string | null;
  type?: string | null;
  amount?: number | string | null;
  description?: string | null;
  occurred_at?: string | null;
  date?: string | null;
  created_at?: string | null;
};

const CATEGORY_STORAGE_KEY = "leofy_settings_categories_v1";
const TRANSFER_NAMES = new Set(["transfer", "transfers", "transferencia", "transferencias"]);

const getPaymentMethodFromApi = (tx: PaymentSource | null | undefined, fallback = "") => {
  const raw =
    tx?.payment_method ??
    tx?.paymentMethod ??
    tx?.metadata?.payment_method ??
    tx?.metadata?.paymentMethod;

  return raw ? String(raw).toLowerCase() : fallback;
};

const cardToMethod = (card: PaymentSource | null | undefined) => {
  const limit = Number(card?.credit_limit ?? 0);
  return Number.isFinite(limit) && limit > 0 ? "credit" : "debit";
};

const toNumber = (value: unknown) => {
  const n = typeof value === "string" ? Number(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const dateToDay = (value: string | null | undefined) => {
  const source = value || new Date().toISOString();
  const parsed = new Date(source);
  if (Number.isNaN(parsed.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const getInstallmentsInfo = (row: any, referenceDate: Date): InstallmentsInfo | null => {
  const installments = row?.metadata?.installments;
  if (!installments || typeof installments !== "object") return null;

  const months = Math.trunc(toNumber((installments as any).months));
  if (months < 2 || months > 60) return null;

  const amount = toNumber(row?.amount);
  const monthlyAmountRaw =
    (installments as any).monthlyAmount !== undefined
      ? toNumber((installments as any).monthlyAmount)
      : Number((amount / months).toFixed(2));
  if (monthlyAmountRaw <= 0) return null;

  const startRaw = (installments as any).startAt || row?.occurred_at || row?.date || row?.created_at;
  const startAt = startRaw ? new Date(startRaw) : null;
  const now = referenceDate;

  let currentMonth = 1;
  if (startAt && !Number.isNaN(startAt.getTime())) {
    const monthsElapsed =
      (now.getFullYear() - startAt.getFullYear()) * 12 + (now.getMonth() - startAt.getMonth());
    currentMonth = Math.max(1, Math.min(months, monthsElapsed + 1));
  }

  return {
    months,
    monthlyAmount: Number(monthlyAmountRaw.toFixed(2)),
    currentMonth,
    remainingMonths: Math.max(0, months - currentMonth),
  };
};

function isTransferRow(row: ListRow): row is TransferListRow {
  return row.kind === "transfer";
}

function getIconNameForRow(row: ListRow): string {
  if (isTransferRow(row)) return "ArrowLeftRight";
  if (row.categoryIcon) return row.categoryIcon;

  const cat = String(row.category || "").trim().toLowerCase();

  if (TRANSFER_NAMES.has(cat)) return "ArrowLeftRight";

  const typedMatch = mockCategories.find((category) => category.name.toLowerCase() === cat && category.type === row.type);
  if (typedMatch) return typedMatch.icon;

  if (row.type === "income") {
    if (cat.includes("salary") || cat.includes("wage") || cat.includes("sueldo")) return "Briefcase";
    if (cat.includes("freelance") || cat.includes("consulting")) return "Laptop2";
    if (cat.includes("bonus")) return "Gift";
    if (cat.includes("rent") || cat.includes("renta")) return "Building2";
    if (cat.includes("investment") || cat.includes("dividend")) return "TrendingUp";
    if (cat.includes("allowance") || cat.includes("mesada")) return "Wallet";
    if (cat.includes("pending")) return "Clock";
    return "CircleDollarSign";
  }

  const defaultMatch = DEFAULT_EXPENSE_CATEGORIES.find(
    (c) => c.name.toLowerCase() === cat
  );
  if (defaultMatch) return defaultMatch.icon;

  const settingsIcon = getCategoryIconName(row.category);
  if (settingsIcon !== "Tag") return settingsIcon;

  return getCategoryIcon(row.category);
}

function getSearchText(row: ListRow) {
  if (isTransferRow(row)) {
    return [
      row.description,
      row.category,
      row.fromCardName,
      row.toCardName,
      row.toCardIsCredit ? "credit payment" : "",
    ]
      .join(" ")
      .toLowerCase();
  }

  return [row.description, row.category, row.cardName, row.paymentMethod].join(" ").toLowerCase();
}

function getSortKey(row: ListRow) {
  if (isTransferRow(row)) return row.transferId;
  return row.id;
}

function getRowTypeClass(row: ListRow): string {
  if (isTransferRow(row)) {
    return row.toCardIsCredit ? "tx-row--credit-payment" : "tx-row--transfer";
  }
  return row.type === "income" ? "tx-row--income" : "tx-row--expense";
}

function getIconWrapClass(row: ListRow): string {
  if (isTransferRow(row)) {
    return row.toCardIsCredit ? "tx-icon-wrap-credit-payment" : "tx-icon-wrap-transfer";
  }
  return row.type === "income" ? "tx-icon-wrap-income" : "tx-icon-wrap-expense";
}

function getIconClass(row: ListRow): string {
  if (isTransferRow(row)) {
    return row.toCardIsCredit ? "tx-icon-credit-payment" : "tx-icon-transfer";
  }
  return row.type === "income" ? "tx-icon-income" : "tx-icon-expense";
}

function getAmountClass(row: ListRow): string {
  if (isTransferRow(row)) {
    return row.toCardIsCredit ? "tx-amount-credit-payment" : "tx-amount-transfer";
  }
  return row.type === "income" ? "tx-amount-income" : "tx-amount-expense";
}

function getPaymentBadgeClass(method: string): string {
  switch (method) {
    case "credit": return "tx-badge--credit";
    case "debit": return "tx-badge--debit";
    default: return "tx-badge--cash";
  }
}

export function Transactions() {
  const { getAppDate } = useAppDate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const LONG_PRESS_MS = 450;

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileEditTxId, setMobileEditTxId] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isTouchDevice = () =>
    typeof window !== "undefined" && window.matchMedia("(hover: none) and (pointer: coarse)").matches;

  const clearLongPress = () => {
    if (!longPressTimerRef.current) return;
    clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const handleRowTouchStart = (rowId: string) => {
    if (!isTouchDevice()) return;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setMobileEditTxId(rowId);
      longPressTimerRef.current = null;
    }, LONG_PRESS_MS);
  };

  const handleRowTouchEnd = () => {
    clearLongPress();
  };

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("leofy_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const referenceDate = getAppDate();

        const headers = {
          ...authHeaders(),
          "Content-Type": "application/json",
        };

        const [res, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/api/transactions`, { headers }),
          fetch(`${API_BASE}/api/cards`, { headers }),
        ]);

        const data = await res.json().catch(() => null);
        const cardsData = await cardsRes.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error || data?.message || `Failed to load transactions (${res.status})`;
          throw new Error(msg);
        }

        if (!cardsRes.ok) {
          const msg = cardsData?.error || cardsData?.message || `Failed to load cards (${cardsRes.status})`;
          throw new Error(msg);
        }

        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
            ? data.transactions
            : Array.isArray(data?.recentTransactions)
              ? data.recentTransactions
              : [];

        const aliasToCurrent = new Map<string, { name: string; icon: string }>();
        try {
          const rawCategories = localStorage.getItem(CATEGORY_STORAGE_KEY);
          const parsedCategories: ManagedCategory[] = rawCategories ? JSON.parse(rawCategories) : [];
          if (Array.isArray(parsedCategories)) {
            for (const category of parsedCategories) {
              const currentName = String(category?.name || "").trim();
              const currentIcon = String(category?.icon || "Circle");
              if (!currentName) continue;
              aliasToCurrent.set(currentName.toLowerCase(), { name: currentName, icon: currentIcon });
              if (Array.isArray(category?.aliases)) {
                for (const alias of category.aliases) {
                  const aliasKey = String(alias || "").trim().toLowerCase();
                  if (!aliasKey) continue;
                  aliasToCurrent.set(aliasKey, { name: currentName, icon: currentIcon });
                }
              }
            }
          }
        } catch {
          // Ignore malformed local category overrides
        }

        const cardsList: any[] = Array.isArray(cardsData) ? cardsData : [];
        const cardMethodById = new Map<string, string>();
        const cardNameById = new Map<string, string>();
        const cardIsCreditById = new Map<string, boolean>();
        const cardColorById = new Map<string, string>();
        for (const card of cardsList) {
          if (!card?.id) continue;
          const cardId = String(card.id);
          const isCredit = cardToMethod(card) === "credit";
          cardMethodById.set(cardId, isCredit ? "credit" : "debit");
          cardNameById.set(cardId, card?.name ? String(card.name) : `Card ${cardId}`);
          cardIsCreditById.set(cardId, isCredit);
          if (card?.color) cardColorById.set(cardId, String(card.color));
        }

        const paymentById = new Map<string, string>();
        const cardNameByTxId = new Map<string, string>();
        const cardIdByTxId = new Map<string, string>();
        const cardColorByTxId = new Map<string, string>();
        const installmentsByTxId = new Map<string, InstallmentsInfo>();
        const metaIconByTxId = new Map<string, string>();
        for (const row of rawList) {
          if (!row?.id) continue;
          const txId = String(row.id);
          const explicit = getPaymentMethodFromApi(row, "");
          const cardId = row?.card_id ?? row?.cardId ?? null;
          const fromCard = cardId != null ? cardMethodById.get(String(cardId)) : null;
          const method = explicit || fromCard || "cash";
          if (method) paymentById.set(txId, method);
          if (cardId != null) {
            cardIdByTxId.set(txId, String(cardId));
            const cardName = cardNameById.get(String(cardId));
            if (cardName) cardNameByTxId.set(txId, cardName);
            const cardColor = cardColorById.get(String(cardId));
            if (cardColor) cardColorByTxId.set(txId, cardColor);
          }
          const installmentsInfo = getInstallmentsInfo(row, referenceDate);
          if (installmentsInfo) installmentsByTxId.set(txId, installmentsInfo);
          const metaIcon = row?.metadata?.category?.icon;
          if (metaIcon && typeof metaIcon === "string") metaIconByTxId.set(txId, metaIcon);
        }

        const normalizedById = new Map<string, UiTransactionRow>();
        const normalizedTransactions: UiTransactionRow[] = normalizeTransactions(data).map((tx) => {
          const mapped = aliasToCurrent.get(String(tx.category || "").trim().toLowerCase());
          const row: UiTransactionRow = {
            ...tx,
            kind: "transaction",
            category: mapped?.name || tx.category,
            categoryIcon: mapped?.icon || metaIconByTxId.get(String(tx.id)) || undefined,
            paymentMethod: paymentById.get(String(tx.id)) || tx.paymentMethod || "cash",
            cardName: cardNameByTxId.get(String(tx.id)),
            cardId: cardIdByTxId.get(String(tx.id)),
            cardColor: cardColorByTxId.get(String(tx.id)),
            installments: installmentsByTxId.get(String(tx.id)),
          };
          normalizedById.set(String(tx.id), row);
          return row;
        });

        const transferGroups = new Map<string, any[]>();
        for (const row of rawList) {
          const transferId = String(row?.transfer_id ?? row?.transferId ?? "").trim();
          if (!transferId) continue;
          const group = transferGroups.get(transferId) || [];
          group.push(row);
          transferGroups.set(transferId, group);
        }

        const consumedIds = new Set<string>();
        const transferRows: TransferListRow[] = [];
        for (const [transferId, group] of transferGroups.entries()) {
          const outgoingRaw =
            group.find((row) => String(row?.metadata?.transferRole || "").toLowerCase() === "outgoing") ||
            group.find((row) => String(row?.type || "").toUpperCase() === "EXPENSE") ||
            null;
          const incomingRaw =
            group.find((row) => String(row?.metadata?.transferRole || "").toLowerCase() === "incoming") ||
            group.find((row) => String(row?.type || "").toUpperCase() === "INCOME") ||
            null;

          if (!outgoingRaw || !incomingRaw || group.length < 2) continue;

          const outgoingId = String(outgoingRaw.id);
          const incomingId = String(incomingRaw.id);
          const outgoing = normalizedById.get(outgoingId);
          const incoming = normalizedById.get(incomingId);
          if (!outgoing || !incoming) continue;

          consumedIds.add(outgoingId);
          consumedIds.add(incomingId);

          const fromCardId =
            String(outgoingRaw?.metadata?.fromCardId || outgoingRaw?.card_id || outgoing.cardId || "").trim();
          const toCardId =
            String(incomingRaw?.metadata?.toCardId || incomingRaw?.card_id || incoming.cardId || "").trim();

          const fromCardName = cardNameById.get(fromCardId) || "Unknown account";
          const toCardName = cardNameById.get(toCardId) || "Unknown account";
          const toCardIsCredit = Boolean(cardIsCreditById.get(toCardId));

          transferRows.push({
            kind: "transfer",
            id: transferId,
            transferId,
            amount: outgoing.amount,
            description: outgoing.description || incoming.description || "Transfer",
            category: "Transfer",
            date: outgoing.date || incoming.date || dateToDay(outgoingRaw?.occurred_at),
            fromCardId,
            toCardId,
            fromCardName,
            toCardName,
            toCardIsCredit,
            section: toCardIsCredit ? "credit_payment" : "all",
          });
        }

        // Fallback: detect legacy cash transfers without transfer_id
        // These are single INCOME transactions with transferRole=incoming and no transfer_id
        const legacyTransferRows: TransferListRow[] = [];
        for (const row of rawList) {
          if (!row?.id) continue;
          const txId = String(row.id);
          if (consumedIds.has(txId)) continue;

          const transferIdVal = String(row?.transfer_id ?? row?.transferId ?? "").trim();
          if (transferIdVal) continue; // already handled above

          const meta = row?.metadata;
          if (!meta || typeof meta !== "object") continue;

          const transferRole = String(meta.transferRole || "").toLowerCase();
          const catName = String(meta.category_name || row?.category || "").toLowerCase();

          if (transferRole !== "incoming" || catName !== "transfer") continue;

          const normalized = normalizedById.get(txId);
          if (!normalized) continue;

          consumedIds.add(txId);

          const toId = String(meta.toCardId || row?.card_id || row?.cardId || "").trim();
          const fromId = String(meta.fromCardId || "").trim();
          const toCardIsCredit = Boolean(cardIsCreditById.get(toId));

          legacyTransferRows.push({
            kind: "transfer",
            id: txId,
            transferId: `legacy-${txId}`,
            amount: normalized.amount,
            description: normalized.description || "Cash Transfer",
            category: "Transfer",
            date: normalized.date || dateToDay(row?.occurred_at),
            fromCardId: fromId || "cash",
            toCardId: toId,
            fromCardName: fromId ? (cardNameById.get(fromId) || "Unknown") : "Cash",
            toCardName: cardNameById.get(toId) || "Unknown account",
            toCardIsCredit,
            section: toCardIsCredit ? "credit_payment" : "all",
          });
        }

        const nonTransferRows = normalizedTransactions.filter((row) => !consumedIds.has(String(row.id)));
        const nextItems: ListRow[] = [...nonTransferRows, ...transferRows, ...legacyTransferRows];

        if (!cancelled) setItems(nextItems);
      } catch (e) {
        console.error("LOAD TRANSACTIONS ERROR:", e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  useEffect(() => () => clearLongPress(), []);

  useEffect(() => {
    if (!mobileEditTxId) return;

    const handleOutsidePress = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      const selectedRow = document.querySelector(".tx-row-selected");
      if (!selectedRow) {
        setMobileEditTxId(null);
        return;
      }
      if (target && selectedRow.contains(target)) return;
      setMobileEditTxId(null);
    };

    document.addEventListener("mousedown", handleOutsidePress);
    document.addEventListener("touchstart", handleOutsidePress);
    return () => {
      document.removeEventListener("mousedown", handleOutsidePress);
      document.removeEventListener("touchstart", handleOutsidePress);
    };
  }, [mobileEditTxId]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return items
      .filter((row) => {
        if (isTransferRow(row)) {
          if (filter === "all") return true;
          if (filter === "credit_payment") return row.toCardIsCredit;
          return false;
        }

        if (filter === "credit_payment") return false;
        if (filter === "all") return true;
        return row.type === filter;
      })
      .filter((row) => {
        if (!query) return true;
        return getSearchText(row).includes(query);
      })
      .sort((a, b) => {
        const byDay = String(b.date || "").localeCompare(String(a.date || ""));
        if (byDay !== 0) return byDay;

        const bId = Number(getSortKey(b));
        const aId = Number(getSortKey(a));
        if (Number.isFinite(bId) && Number.isFinite(aId)) return bId - aId;
        return String(getSortKey(b)).localeCompare(String(getSortKey(a)));
      });
  }, [items, filter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, transaction) => {
      const date = transaction.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, ListRow[]>);
  }, [filteredTransactions]);

  const formatDate = (dateString: string) => {
    const [y, m, d] = dateString.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const today = getAppDate();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  if (loading) {
    return <LoadingScreen title="Transactions" message="Loading your latest movements..." />;
  }

  let globalRowIndex = 0;

  return (
    <div className="tx-page">
      <div className="tx-header">
        <div>
          <h1 className="tx-title">Transactions</h1>
          <p className="tx-subtitle">Track all your income, expenses, and card payments</p>
        </div>
      </div>

      <div className="tx-toolbar">
        <div className="tx-search-wrap">
          <Search className="tx-search-icon" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="tx-search-input"
          />
        </div>

        <div className="tx-tabs">
          <button
            onClick={() => setFilter("all")}
            className={`tx-tab ${filter === "all" ? "tx-tab--active" : ""}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`tx-tab ${filter === "income" ? "tx-tab--active" : ""}`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`tx-tab ${filter === "expense" ? "tx-tab--active" : ""}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilter("credit_payment")}
            className={`tx-tab ${filter === "credit_payment" ? "tx-tab--active" : ""}`}
          >
            Credit Payments
          </button>
        </div>
      </div>

      <>
        <div className="tx-groups">
          {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
            <div key={date}>
              <h3 className="tx-group-date">{formatDate(date)}</h3>

              <div className="tx-day-card">
                {dayTransactions.map((transaction, index) => {
                  let IconComponent = LucideIcons.Circle;

                  try {
                    IconComponent = getIconComponent(getIconNameForRow(transaction));
                  } catch {
                    IconComponent = LucideIcons.Circle;
                  }

                  const rowId = isTransferRow(transaction) ? transaction.transferId : transaction.id;
                  const rowLink = isTransferRow(transaction)
                    ? `/transactions/transfers/${transaction.transferId}`
                    : `/transactions/${transaction.id}`;

                  const staggerDelay = Math.min(globalRowIndex * 0.03, 0.6);
                  globalRowIndex++;

                  return (
                    <div
                      key={rowId}
                      className={`group tx-row ${getRowTypeClass(transaction)} ${mobileEditTxId === rowId ? "tx-row-selected" : ""} ${
                        index !== dayTransactions.length - 1 ? "tx-row-divider" : ""
                      }`}
                      style={{ animationDelay: `${staggerDelay}s` }}
                      onTouchStart={() => handleRowTouchStart(rowId)}
                      onTouchEnd={handleRowTouchEnd}
                      onTouchCancel={handleRowTouchEnd}
                      onTouchMove={handleRowTouchEnd}
                    >
                      <div className="tx-row-left">
                        <div className={`tx-icon-wrap ${getIconWrapClass(transaction)}`}>
                          <IconComponent className={`tx-icon ${getIconClass(transaction)}`} />
                        </div>

                        <div className="tx-main">
                          <p className="tx-category">{transaction.category}</p>
                          {(() => {
                            const desc = isTransferRow(transaction)
                              ? transaction.description
                              : (transaction.description && transaction.description !== "-" ? transaction.description : "");
                            return desc ? <p className="tx-description">{desc}</p> : null;
                          })()}
                          <div className="tx-meta-row">
                            {isTransferRow(transaction) ? (
                              <>
                                <span className={`tx-badge ${transaction.toCardIsCredit ? "tx-badge--credit-pay" : "tx-badge--transfer"}`}>
                                  {transaction.toCardIsCredit ? "Credit Pay" : "Transfer"}
                                </span>
                                <span className="tx-transfer-label">
                                  {transaction.fromCardName}
                                  <ArrowRight size={10} className="tx-transfer-arrow" />
                                  {transaction.toCardName}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`tx-badge ${getPaymentBadgeClass(transaction.paymentMethod)}`}>
                                  {transaction.paymentMethod === "cash"
                                    ? "Cash"
                                    : transaction.paymentMethod === "credit"
                                      ? "Credit"
                                      : "Debit"}
                                </span>
                                {transaction.cardName && (
                                  <>
                                    <span className="tx-dot">&middot;</span>
                                    <span className={`tx-card-badge tx-card-badge--${transaction.cardColor || "OTHER"}`}>{transaction.cardName}</span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                          {!isTransferRow(transaction) && transaction.installments && (
                            <div className="tx-installment-row">
                              <span className="tx-installment-chip">
                                MSI {transaction.installments.currentMonth}/{transaction.installments.months}
                              </span>
                              <div className="tx-installment-progress">
                                <div className="tx-installment-bar">
                                  <div
                                    className="tx-installment-bar-fill"
                                    style={{
                                      width: `${(transaction.installments.currentMonth / transaction.installments.months) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="tx-installment-info">
                                ${formatMoney(transaction.installments.monthlyAmount)}/mo
                                {" \u2022 "}
                                {transaction.installments.remainingMonths > 0
                                  ? `${transaction.installments.remainingMonths} left`
                                  : "Done"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="tx-right">
                        <p className={`tx-amount ${getAmountClass(transaction)}`}>
                          {isTransferRow(transaction) ? "$" : transaction.type === "income" ? "+$" : "-$"}
                          {formatMoney(transaction.amount)}
                        </p>
                        <Link
                          to={rowLink}
                          state={
                            isTransferRow(transaction)
                              ? undefined
                              : {
                                  paymentMethod: transaction.paymentMethod,
                                  cardId: transaction.cardId ?? null,
                                }
                          }
                          className="tx-edit-link-desktop"
                          aria-label="Edit transaction"
                          title="Edit transaction"
                        >
                          <Pencil className="tx-edit-icon" />
                        </Link>
                        {mobileEditTxId === rowId && (
                          <div className="tx-mobile-actions">
                            <Link
                              to={rowLink}
                              state={
                                isTransferRow(transaction)
                                  ? undefined
                                  : {
                                      paymentMethod: transaction.paymentMethod,
                                      cardId: transaction.cardId ?? null,
                                    }
                              }
                              className="tx-mobile-edit-grid"
                              aria-label="Edit transaction"
                              title="Edit transaction"
                            >
                              <LayoutGrid className="tx-mobile-grid-icon" />
                              <span>Edit</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {filteredTransactions.length === 0 && (
          <div className="tx-state-box">
            <Receipt className="tx-empty-icon" />
            <p className="tx-muted">No transactions found</p>
            <p className="tx-muted-sub">Try adjusting your search or filters</p>
          </div>
        )}
      </>
    </div>
  );
}
