import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil, LayoutGrid } from "lucide-react";
import { getCategoryIcon } from "../utils/mockData";
import { UiTransaction, normalizeTransactions } from "../utils/transactionsMapper";
import * as LucideIcons from "lucide-react";
import { formatMoney } from "../utils/formatMoney";
import { LoadingScreen } from "./LoadingScreen";
import "../../styles/components/Transactions.css";

type FilterType = "all" | "income" | "expense";
type InstallmentsInfo = {
  months: number;
  monthlyAmount: number;
  currentMonth: number;
  remainingMonths: number;
};

type UiTransactionRow = UiTransaction & {
  cardName?: string;
  cardId?: string;
  categoryIcon?: string;
  installments?: InstallmentsInfo;
};
type ManagedCategory = { id: string; name: string; icon: string; type: "income" | "expense"; aliases?: string[] };
const CATEGORY_STORAGE_KEY = "leofy_settings_categories_v1";

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
  } | null;
};

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

const getInstallmentsInfo = (row: any): InstallmentsInfo | null => {
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
  const now = new Date();

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

export function Transactions() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const LONG_PRESS_MS = 450;

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<UiTransactionRow[]>([]);
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

  const handleRowTouchStart = (transactionId: string) => {
    if (!isTouchDevice()) return;
    clearLongPress();
    longPressTimerRef.current = setTimeout(() => {
      setMobileEditTxId(transactionId);
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
            for (const c of parsedCategories) {
              const currentName = String(c?.name || "").trim();
              const currentIcon = String(c?.icon || "Circle");
              if (!currentName) continue;
              aliasToCurrent.set(currentName.toLowerCase(), { name: currentName, icon: currentIcon });
              if (Array.isArray(c?.aliases)) {
                for (const alias of c.aliases) {
                  const aliasKey = String(alias || "").trim().toLowerCase();
                  if (!aliasKey) continue;
                  aliasToCurrent.set(aliasKey, { name: currentName, icon: currentIcon });
                }
              }
            }
          }
        } catch {
          // ignore local category mapping errors
        }

        const cardsList: any[] = Array.isArray(cardsData) ? cardsData : [];
        const cardMethodById = new Map<string, string>();
        const cardNameById = new Map<string, string>();
        for (const card of cardsList) {
          if (!card?.id) continue;
          cardMethodById.set(String(card.id), cardToMethod(card));
          if (card?.name) cardNameById.set(String(card.id), String(card.name));
        }

        const paymentById = new Map<string, string>();
        const cardNameByTxId = new Map<string, string>();
        const cardIdByTxId = new Map<string, string>();
        const installmentsByTxId = new Map<string, InstallmentsInfo>();
        for (const row of rawList) {
          if (!row?.id) continue;
          const explicit = getPaymentMethodFromApi(row, "");
          const cardId = row?.card_id ?? row?.cardId ?? null;
          const fromCard = cardId != null ? cardMethodById.get(String(cardId)) : null;
          const method = explicit || fromCard || "cash";
          if (method) paymentById.set(String(row.id), method);
          if (cardId != null) {
            cardIdByTxId.set(String(row.id), String(cardId));
            const cardName = cardNameById.get(String(cardId));
            if (cardName) cardNameByTxId.set(String(row.id), cardName);
          }
          const installmentsInfo = getInstallmentsInfo(row);
          if (installmentsInfo) {
            installmentsByTxId.set(String(row.id), installmentsInfo);
          }
        }

        const normalized: UiTransactionRow[] = normalizeTransactions(data).map((tx) => {
          const mapped = aliasToCurrent.get(String(tx.category || "").trim().toLowerCase());
          return {
            ...tx,
            category: mapped?.name || tx.category,
            categoryIcon: mapped?.icon || undefined,
            paymentMethod: paymentById.get(String(tx.id)) || tx.paymentMethod || "cash",
            cardName: cardNameByTxId.get(String(tx.id)),
            cardId: cardIdByTxId.get(String(tx.id)),
            installments: installmentsByTxId.get(String(tx.id)),
          };
        });

        if (!cancelled) setItems(normalized);
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
    return items
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;

        return (
          (t.description || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, filter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, transaction) => {
      const date = transaction.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, UiTransactionRow[]>);
  }, [filteredTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
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
    return (
      <LoadingScreen
        title="Transactions"
        message="Loading your latest movements..."
      />
    );
  }

  return (
    <div className="tx-page">
      <div className="tx-header">
        <h1 className="tx-title">Transactions</h1>
        <p className="tx-subtitle">Track all your income and expenses</p>
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
                      const iconName = transaction.categoryIcon || getCategoryIcon(transaction.category);
                      IconComponent = getIconComponent(iconName);
                    } catch {
                      IconComponent = LucideIcons.Circle;
                    }

                    return (
                      <div
                        key={transaction.id}
                        className={`group tx-row ${mobileEditTxId === transaction.id ? "tx-row-selected" : ""} ${
                          index !== dayTransactions.length - 1 ? "tx-row-divider" : ""
                        }`}
                        onTouchStart={() => handleRowTouchStart(transaction.id)}
                        onTouchEnd={handleRowTouchEnd}
                        onTouchCancel={handleRowTouchEnd}
                        onTouchMove={handleRowTouchEnd}
                      >
                        <div className="tx-row-left">
                          <div
                            className={`tx-icon-wrap ${transaction.type === "income" ? "tx-icon-wrap-income" : "tx-icon-wrap-expense"}`}
                          >
                            <IconComponent
                              className={`tx-icon ${transaction.type === "income" ? "tx-icon-income" : "tx-icon-expense"}`}
                            />
                          </div>

                          <div className="tx-main">
                            <p className="tx-description">{transaction.description || "-"}</p>
                            <div className="tx-meta-row">
                              <span className="tx-meta-text">{transaction.category}</span>
                              <span className="tx-dot">|</span>
                              <span className="tx-meta-text tx-meta-capitalize">
                                {transaction.paymentMethod === "cash"
                                  ? "Cash"
                                  : transaction.cardName || transaction.paymentMethod}
                              </span>
                            </div>
                            {transaction.installments && (
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
                            className={`tx-amount ${transaction.type === "income" ? "tx-amount-income" : "tx-amount-expense"}`}
                          >
                            {transaction.type === "income" ? "+" : "-"}${formatMoney(transaction.amount)}
                          </p>
                          <Link
                            to={`/transactions/${transaction.id}`}
                            state={{
                              paymentMethod: transaction.paymentMethod,
                              cardId: transaction.cardId ?? null,
                            }}
                            className="tx-edit-link-desktop"
                            aria-label="Edit transaction"
                            title="Edit transaction"
                          >
                            <Pencil className="tx-edit-icon" />
                          </Link>
                          {mobileEditTxId === transaction.id && (
                            <div className="tx-mobile-actions">
                              <Link
                                to={`/transactions/${transaction.id}`}
                                state={{
                                  paymentMethod: transaction.paymentMethod,
                                  cardId: transaction.cardId ?? null,
                                }}
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
