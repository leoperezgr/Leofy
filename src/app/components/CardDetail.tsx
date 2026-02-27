import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import * as LucideIcons from "lucide-react";
import { formatMoney } from "../utils/formatMoney";
import { getCategoryIcon } from "../utils/mockData"; // si ya tienes un mapper real, lo cambiamos luego
import { LoadingScreen } from "./LoadingScreen";
import "../../styles/components/CardDetail.css";

type ApiCard = {
  id: string | number;
  name: string;
  last4: string | null;
  credit_limit: number | string | null;
  color?: string | null;
};

type ApiCategory = {
  id: string | number;
  name: string;
  icon?: string | null;
};

type ApiTx = {
  id: string | number;
  type: "INCOME" | "EXPENSE" | "income" | "expense";
  amount: number | string;
  description: string | null;
  occurred_at: string;
  category?: string | { name?: string | null } | null;
  category_name?: string | null; // por si backend manda nombre
  category_id?: string | number | null;
  categoryId?: string | number | null;
  card_id?: string | number | null;
  metadata?: {
    category_name?: string | null;
    categoryName?: string | null;
  } | null;
};

function toId(v: string | number) {
  return typeof v === "number" ? String(v) : String(v);
}
function toNumber(v: any) {
  const n = typeof v === "string" ? Number(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function colorToGradient(color?: string | null) {
  switch ((color || "OTHER").toUpperCase()) {
    case "RED":
      return "from-red-500 to-rose-600";
    case "ORANGE":
      return "from-orange-500 to-amber-600";
    case "BLUE":
      return "from-blue-500 to-sky-600";
    case "GOLD":
      return "from-yellow-500 to-amber-600";
    case "BLACK":
      return "from-zinc-900 to-zinc-700";
    case "PLATINUM":
      return "from-slate-500 to-slate-700";
    case "SILVER":
      return "from-gray-400 to-gray-600";
    case "PURPLE":
      return "from-purple-500 to-fuchsia-600";
    case "GREEN":
      return "from-emerald-500 to-teal-600";
    default:
      return "from-[#2DD4BF] to-[#14B8A6]";
  }
}

export function CardDetail() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const { cardId } = useParams<{ cardId: string }>();

  const [card, setCard] = useState<ApiCard | null>(null);
  const [tx, setTx] = useState<ApiTx[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = (): Headers => {
    const token = localStorage.getItem("leofy_token");
    const h = new Headers();
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  };

  useEffect(() => {
    let cancelled = false;
    if (!cardId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const h = authHeaders();

        // 1) cargar cards y encontrar la tarjeta (porque tu backend actual solo tiene GET /api/cards)
        const resCards = await fetch(`${API_BASE}/api/cards`, { headers: h });
        const cardsJson = await resCards.json().catch(() => null);
        if (!resCards.ok) throw new Error(cardsJson?.error || cardsJson?.message || "Failed to load cards");

        const found = (Array.isArray(cardsJson) ? cardsJson : []).find(
          (c: any) => toId(c.id) === String(cardId)
        );

        if (!found) {
          if (!cancelled) setCard(null);
          return;
        }

        // 2) cargar transacciones
        const resTx = await fetch(`${API_BASE}/api/transactions`, { headers: h });
        const txJson = await resTx.json().catch(() => null);
        if (!resTx.ok) throw new Error(txJson?.error || txJson?.message || "Failed to load transactions");

        // 3) cargar categorias (si falla, no romper detalle)
        let categoriesJson: any[] = [];
        try {
          const resCategories = await fetch(`${API_BASE}/api/categories`, { headers: h });
          if (resCategories.ok) {
            const data = await resCategories.json().catch(() => []);
            categoriesJson = Array.isArray(data) ? data : [];
          }
        } catch {
          categoriesJson = [];
        }

        if (cancelled) return;

        setCard(found);
        setTx(Array.isArray(txJson) ? txJson : []);
        setCategories(categoriesJson);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Error loading card details");
          setCard(null);
          setTx([]);
          setCategories([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, cardId]);

  const creditLimit = useMemo(() => toNumber(card?.credit_limit), [card]);
  const categoryById = useMemo(
    () => new Map(categories.map((c) => [toId(c.id), c])),
    [categories]
  );

  const cardTransactions = useMemo(() => {
    if (!cardId) return [];
    return tx
      .filter((t) => {
        const cid = (t as any).card_id ?? (t as any).cardId ?? null;
        return cid !== null && toId(cid) === String(cardId);
      })
      .map((t) => {
        const rawCategory = (t as any).category;
        const categoryIdRaw = (t as any).category_id ?? (t as any).categoryId ?? null;
        const categoryFromMap =
          categoryIdRaw !== null && categoryIdRaw !== undefined ? categoryById.get(toId(categoryIdRaw)) : null;
        const categoryFromObject =
          rawCategory && typeof rawCategory === "object" && typeof (rawCategory as any).name === "string"
            ? String((rawCategory as any).name).trim()
            : "";
        const categoryFromString = typeof rawCategory === "string" ? rawCategory.trim() : "";
        const categoryFromField =
          typeof (t as any).category_name === "string" ? String((t as any).category_name).trim() : "";
        const categoryFromMetadata =
          typeof (t as any)?.metadata?.category_name === "string"
            ? String((t as any).metadata.category_name).trim()
            : typeof (t as any)?.metadata?.categoryName === "string"
              ? String((t as any).metadata.categoryName).trim()
              : "";
        const categoryResolved =
          categoryFromObject ||
          categoryFromString ||
          categoryFromField ||
          categoryFromMetadata ||
          (categoryFromMap?.name
            ? String(categoryFromMap.name)
            : categoryIdRaw !== null && categoryIdRaw !== undefined
              ? "Category"
              : "Uncategorized");

        return {
          id: toId(t.id),
          amount: toNumber(t.amount),
          description: t.description ?? "—",
          category: categoryResolved,
          date: t.occurred_at,
        };
      });
  }, [tx, cardId, categoryById]);

  const usedAmount = useMemo(() => {
    // sum de EXPENSE de esa tarjeta
    return tx.reduce((sum, t) => {
      const type = String((t as any).type || "").toUpperCase();
      const cid = (t as any).card_id ?? null;
      if (!cid || toId(cid) !== String(cardId)) return sum;
      if (type !== "EXPENSE") return sum;
      return sum + toNumber((t as any).amount);
    }, 0);
  }, [tx, cardId]);

  const usagePercent = creditLimit > 0 ? (usedAmount / creditLimit) * 100 : 0;
  const isHighUsage = usagePercent > 80;

  const last30Days = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const iso = date.toISOString().split("T")[0];

      const daySpending = cardTransactions
        .filter((t) => new Date(t.date).toISOString().split("T")[0] === iso)
        .reduce((sum, t) => sum + t.amount, 0);

      return { date: date.getDate(), amount: daySpending };
    });

    return days;
  }, [cardTransactions]);

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  if (loading) {
    return (
      <LoadingScreen
        title="Card Details"
        message="Loading card movements..."
      />
    );
  }

  if (error) {
    return (
      <div className="cd-page">
        <div className="cd-error-box">
          <p className="cd-error-text">{error}</p>
        </div>

        <Link
          to="/cards"
          className="cd-back-link"
        >
          <ArrowLeft className="cd-back-icon" />
          <span className="cd-back-text">Back to Cards</span>
        </Link>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="cd-page">
        <div className="cd-not-found">
          <p className="cd-subtitle">Card not found</p>
          <Link to="/cards" className="cd-not-found-link">
            Back to Cards
          </Link>
        </div>
      </div>
    );
  }

  const gradient = colorToGradient(card.color);
  const available = Math.max(0, creditLimit - usedAmount);

  return (
    <div className="cd-page">
      {/* Back Button */}
      <Link
        to="/cards"
        className="cd-back-link cd-back-link-top"
      >
        <ArrowLeft className="cd-back-icon" />
        <span className="cd-back-text">Back to Cards</span>
      </Link>

      {/* Card Visual */}
      <div
        className={`cd-card-visual ${gradient}`}
      >
        <div className="cd-card-orb-large" />
        <div className="cd-card-orb-small" />

        <div className="cd-card-content">
          <div>
            <p className="cd-card-kind">Credit Card</p>
            <h2 className="cd-card-name">{card.name}</h2>
          </div>
          <div>
            <p className="cd-card-last4">{"\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022"} {card.last4 ?? "----"}</p>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="cd-box cd-box-spacing">
        <div className="cd-stats-grid">
          <div>
            <p className="cd-label">Used Amount</p>
            <p className="cd-stat-value">${formatMoney(usedAmount)}</p>
          </div>
          <div>
            <p className="cd-label">Credit Limit</p>
            <p className="cd-stat-value">${formatMoney(creditLimit)}</p>
          </div>
          <div>
            <p className="cd-label">Available Credit</p>
            <p className="cd-stat-value cd-stat-value-green">${formatMoney(available)}</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div>
          <div className="cd-usage-header">
            <span className="cd-usage-label">Credit Usage</span>
            <div className="cd-usage-right">
              <span className={`cd-usage-percent ${isHighUsage ? "cd-usage-high" : "cd-usage-normal"}`}>
                {usagePercent.toFixed(1)}%
              </span>
              {isHighUsage && <AlertTriangle className="cd-usage-icon" />}
            </div>
          </div>
          <div className="cd-usage-track">
            <div
              className={`cd-usage-fill ${isHighUsage ? "cd-usage-fill-high" : "cd-usage-fill-normal"}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {isHighUsage && (
          <div className="cd-warning-box">
            <AlertTriangle className="cd-warning-icon" />
            <div>
              <p className="cd-warning-title">High usage warning</p>
              <p className="cd-warning-text">
                You've used more than 80% of your credit limit. Consider paying down your balance to avoid fees.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spending Chart */}
      <div className="cd-box cd-box-spacing">
        <h3 className="cd-section-title">Monthly Spending</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={last30Days}>
            <XAxis dataKey="date" stroke="#94A3B8" style={{ fontSize: "12px" }} />
            <YAxis stroke="#94A3B8" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
                fontSize: "14px",
              }}
              formatter={(value: number) => [`$${formatMoney(Number(value))}`, "Amount"]}
            />
            <Line type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions */}
      <div className="cd-box">
        <h3 className="cd-section-title">
          Transactions ({cardTransactions.length})
        </h3>

        {cardTransactions.length > 0 ? (
          <div className="cd-transactions-list">
            {cardTransactions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((transaction, index) => {
                const IconComponent = getIconComponent(getCategoryIcon(transaction.category));
                return (
                  <div
                    key={transaction.id}
                    className={`cd-transaction-item ${
                      index !== cardTransactions.length - 1 ? "cd-transaction-item-divider" : ""
                    }`}
                  >
                    <div className="cd-transaction-left">
                      <div className="cd-transaction-icon-wrap">
                        <IconComponent className="cd-transaction-icon" />
                      </div>
                      <div className="cd-transaction-main">
                        <p className="cd-transaction-description">{transaction.description}</p>
                        <p className="cd-transaction-category">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="cd-transaction-right">
                      <p className="cd-transaction-amount">
                        -${formatMoney(transaction.amount)}
                      </p>
                      <p className="cd-transaction-date">
                        {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="cd-empty-state">
            <p className="cd-subtitle">No transactions yet with this card</p>
          </div>
        )}
      </div>
    </div>
  );
}


