import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, LayoutGrid } from "lucide-react";
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
  if (Number.isNaN(parsed.getTime())) return new Date().toISOString().split("T")[0];
  return parsed.toISOString().split("T")[0];
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

  // Use DEFAULT_EXPENSE_CATEGORIES for exact match first
  const defaultMatch = DEFAULT_EXPENSE_CATEGORIES.find(
    (c) => c.name.toLowerCase() === cat
  );
  if (defaultMatch) return defaultMatch.icon;

  // Use getCategoryIconName (keyword-based) from SettingsCategories
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

function getDestinationLabel(row: TransferListRow) {
  return row.toCardIsCredit
    ? `Credit Payment to ${row.toCardName} from ${row.fromCardName}`
    : `From ${row.fromCardName} -> ${row.toCardName}`;
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
        for (const card of cardsList) {
          if (!card?.id) continue;
          const cardId = String(card.id);
          const isCredit = cardToMethod(card) === "credit";
          cardMethodById.set(cardId, isCredit ? "credit" : "debit");
          cardNameById.set(cardId, card?.name ? String(card.name) : `Card ${cardId}`);
          cardIsCreditById.set(cardId, isCredit);
        }

        const paymentById = new Map<string, string>();
        const cardNameByTxId = new Map<string, string>();
        const cardIdByTxId = new Map<string, string>();
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

        const nonTransferRows = normalizedTransactions.filter((row) => !consumedIds.has(String(row.id)));
        const nextItems: ListRow[] = [...nonTransferRows, ...transferRows];

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

  return (
    <div className="tx-page">
      <div className="tx-header">
        <h1 className="tx-title">Transactions</h1>
        <p className="tx-subtitle">Track all your income, expenses, and card payments</p>
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

        <div className="tx-filter-row">
          <button
            onClick={() => setFilter("all")}
            className={`tx-filter-btn ${filter === "all" ? "tx-filter-btn-all-active" : "tx-filter-btn-inactive"}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("income")}
            className={`tx-filter-btn ${filter === "income" ? "tx-filter-btn-income-active" : "tx-filter-btn-inactive"}`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter("expense")}
            className={`tx-filter-btn ${filter === "expense" ? "tx-filter-btn-expense-active" : "tx-filter-btn-inactive"}`}
          >
            Expenses
          </button>
          <button
            onClick={() => setFilter("credit_payment")}
            className={`tx-filter-btn ${
              filter === "credit_payment" ? "tx-filter-btn-credit-payment-active" : "tx-filter-btn-inactive"
            }`}
          >
            Credit Payment
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

                  return (
                    <div
                      key={rowId}
                      className={`group tx-row ${mobileEditTxId === rowId ? "tx-row-selected" : ""} ${
                        index !== dayTransactions.length - 1 ? "tx-row-divider" : ""
                      }`}
                      onTouchStart={() => handleRowTouchStart(rowId)}
                      onTouchEnd={handleRowTouchEnd}
                      onTouchCancel={handleRowTouchEnd}
                      onTouchMove={handleRowTouchEnd}
                    >
                      <div className="tx-row-left">
                        <div
                          className={`tx-icon-wrap ${
                            !isTransferRow(transaction) && transaction.type === "income"
                              ? "tx-icon-wrap-income"
                              : "tx-icon-wrap-expense"
                          }`}
                        >
                          <IconComponent
                            className={`tx-icon ${
                              !isTransferRow(transaction) && transaction.type === "income"
                                ? "tx-icon-income"
                                : "tx-icon-expense"
                            }`}
                          />
                        </div>

                        <div className="tx-main">
                          <p className="tx-description">{transaction.description || "-"}</p>
                          <div className="tx-meta-row">
                            <span className="tx-meta-text">{transaction.category}</span>
                            <span className="tx-dot">|</span>
                            <span className={`tx-meta-text ${isTransferRow(transaction) ? "" : "tx-meta-capitalize"}`}>
                              {isTransferRow(transaction)
                                ? getDestinationLabel(transaction)
                                : transaction.paymentMethod === "cash"
                                  ? "Cash"
                                  : transaction.cardName || transaction.paymentMethod}
                            </span>
                          </div>
                          {!isTransferRow(transaction) && transaction.installments && (
                            <div className="tx-installment-row">
                              <span className="tx-installment-chip">Installments</span>
                              <span className="tx-installment-info">
                                {transaction.installments.currentMonth}/{transaction.installments.months}
                                {" \u2022 "}
                                ${formatMoney(transaction.installments.monthlyAmount)}/mo
                                {" \u2022 "}
                                {transaction.installments.remainingMonths > 0
                                  ? `${transaction.installments.remainingMonths} left`
                                  : "Completed"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="tx-right">
                        <p
                          className={`tx-amount ${
                            !isTransferRow(transaction) && transaction.type === "income"
                              ? "tx-amount-income"
                              : "tx-amount-expense"
                          }`}
                        >
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
            <p className="tx-muted">No transactions found</p>
          </div>
        )}
      </>
    </div>
  );
}
