import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Pencil } from "lucide-react";
import { getCategoryIcon } from "../utils/mockData";
import { UiTransaction, normalizeTransactions } from "../utils/transactionsMapper";
import * as LucideIcons from "lucide-react";
import { formatMoney } from "../utils/formatMoney";
import "../../styles/components/Transactions.css";

type FilterType = "all" | "income" | "expense";
type UiTransactionRow = UiTransaction & { cardName?: string; cardId?: string; categoryIcon?: string };
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

export function Transactions() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<UiTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);

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

      {loading && (
        <div className="tx-state-box">
          <p className="tx-muted">Loading transactions...</p>
        </div>
      )}

      {!loading && (
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
                        className={`group tx-row ${index !== dayTransactions.length - 1 ? "tx-row-divider" : ""}`}
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
                            className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                            aria-label="Edit transaction"
                            title="Edit transaction"
                          >
                            <Pencil className="w-4 h-4 text-[#64748B]" />
                          </Link>
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
      )}
    </div>
  );
}
