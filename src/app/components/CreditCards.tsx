import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/formatMoney";
import "../../styles/components/CreditCards.css";

type ApiCard = {
  id: string | number;
  name: string;
  last4: string | null;
  brand: "VISA" | "MASTERCARD" | "AMEX" | "OTHER" | null;
  credit_limit: number | string | null;
  closing_day?: number | null;
  due_day?: number | null;
  color?: string | null; // enum en backend, lo tratamos como string aquí
};

type UiCard = {
  id: string;
  name: string;
  last4: string;
  creditLimit: number;
  usedAmount: number;
  colorClass: string; // tailwind gradient class
};

type ApiTx = {
  id: string | number;
  type: "INCOME" | "EXPENSE" | "income" | "expense";
  amount: number | string;
  occurred_at?: string;
  card_id?: string | number | null;
  cardId?: string | number | null; // por si tu normalizador lo usa
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

export function CreditCards() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  const [cards, setCards] = useState<ApiCard[]>([]);
  const [tx, setTx] = useState<ApiTx[]>([]);
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

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const h = authHeaders();

        // 1) cards
        const resCards = await fetch(`${API_BASE}/api/cards`, { headers: h });
        const cardsJson = await resCards.json().catch(() => null);
        if (!resCards.ok) {
          throw new Error(cardsJson?.error || cardsJson?.message || "Failed to load cards");
        }

        // 2) transactions (para calcular usedAmount)
        const resTx = await fetch(`${API_BASE}/api/transactions`, { headers: h });
        const txJson = await resTx.json().catch(() => null);
        if (!resTx.ok) {
          throw new Error(txJson?.error || txJson?.message || "Failed to load transactions");
        }

        if (!cancelled) {
          setCards(Array.isArray(cardsJson) ? cardsJson : []);
          setTx(Array.isArray(txJson) ? txJson : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Error loading credit cards");
          setCards([]);
          setTx([]);
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
  }, [API_BASE]);

  // calcular usedAmount por card_id (solo EXPENSE)
  const usedByCard = useMemo(() => {
    const map = new Map<string, number>();

    for (const t of tx) {
      const type = String((t as any).type || "").toUpperCase();
      if (type !== "EXPENSE") continue;

      const cardIdRaw = (t as any).card_id ?? (t as any).cardId ?? null;
      if (!cardIdRaw) continue;

      const cid = toId(cardIdRaw);
      const amt = toNumber((t as any).amount);

      map.set(cid, (map.get(cid) || 0) + amt);
    }

    return map;
  }, [tx]);

  // UI cards: solo credit (credit_limit > 0)
  const uiCards: UiCard[] = useMemo(() => {
    return cards
      .map((c) => {
        const creditLimit = toNumber(c.credit_limit);
        const id = toId(c.id);
        return {
          id,
          name: c.name,
          last4: c.last4 || "----",
          creditLimit,
          usedAmount: usedByCard.get(id) || 0,
          colorClass: colorToGradient(c.color),
        };
      })
      .filter((c) => c.creditLimit > 0);
  }, [cards, usedByCard]);

  const totals = useMemo(() => {
    const totalUsed = uiCards.reduce((sum, c) => sum + c.usedAmount, 0);
    const totalLimit = uiCards.reduce((sum, c) => sum + c.creditLimit, 0);
    return { totalUsed, totalLimit };
  }, [uiCards]);
  const usagePercent = totals.totalLimit > 0 ? (totals.totalUsed / totals.totalLimit) * 100 : 0;
  const clampedUsagePercent = Math.min(Math.max(usagePercent, 0), 100);
  const isHighGlobalUsage = usagePercent > 80;
  const totalAvailable = Math.max(totals.totalLimit - totals.totalUsed, 0);

  return (
    <div className="cc-page">
      {/* Header */}
      <div className="cc-header">
        <h1 className="cc-title">Credit Cards</h1>
        <p className="cc-subtitle">Manage your credit cards and track usage</p>
      </div>

      {error && (
        <div className="cc-error-box">
          <p className="cc-error-text">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="cc-summary-grid">
        <div className="cc-summary-card">
          <p className="cc-summary-label">Total Credit Used</p>
          <p className="cc-summary-value">
            ${formatMoney(totals.totalUsed)}
          </p>
        </div>

        <div className="cc-summary-card">
          <p className="cc-summary-label">Total Credit Limit</p>
          <p className="cc-summary-value">
            ${formatMoney(totals.totalLimit)}
          </p>
        </div>
      </div>

      <div className="cc-summary-card cc-global-usage-card">
        <div className="cc-usage-header">
          <span className="cc-card-label">Total Usage</span>
          <div className="cc-usage-right">
            <span className={`cc-usage-percent ${isHighGlobalUsage ? "cc-usage-high" : "cc-usage-normal"}`}>
              {usagePercent.toFixed(0)}%
            </span>
          </div>
        </div>
        <div className="cc-usage-track cc-usage-track-interactive">
          <div
            className={`cc-usage-fill ${isHighGlobalUsage ? "cc-usage-fill-high" : "cc-usage-fill-normal"}`}
            style={{ width: `${clampedUsagePercent}%` }}
          >
            <span className="cc-usage-shimmer" />
          </div>
          <span className="cc-usage-marker" style={{ left: `calc(${clampedUsagePercent}% - 0.5rem)` }} />
        </div>
        <div className="cc-global-usage-footer">
          <span className="cc-card-label">Used: ${formatMoney(totals.totalUsed)}</span>
          <span className="cc-card-label">Available: ${formatMoney(totalAvailable)}</span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="cc-content-box">
          <p className="cc-muted-text">Loading cards…</p>
        </div>
      ) : uiCards.length === 0 ? (
        <div className="cc-content-box">
          <p className="cc-muted-text">No credit cards found.</p>
          <p className="cc-tip-text">Tip: add a card with a credit limit in Manage Cards.</p>
        </div>
      ) : (
        <div className="cc-list">
          {uiCards.map((card) => {
            const usagePercent = card.creditLimit > 0 ? (card.usedAmount / card.creditLimit) * 100 : 0;
            const isHighUsage = usagePercent > 80;

            return (
                <Link
                  key={card.id}
                  to={`/cards/${card.id}`}
                  className="cc-card-link"
                >
                  {/* Card Visual */}
                  <div
                    className={`cc-card-visual ${card.colorClass}`}
                  >
                    <div className="cc-card-orb-large" />
                    <div className="cc-card-orb-small" />

                    <div className="cc-card-visual-content">
                      <div>
                        <p className="cc-card-kind">Credit Card</p>
                        <h3 className="cc-card-name">{card.name}</h3>
                      </div>
                      <div>
                        <p className="cc-card-last4">•••• •••• •••• {card.last4}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Details */}
                  <div className="cc-card-body">
                    <div className="cc-card-row">
                      <div>
                        <p className="cc-card-label">Used Amount</p>
                        <p className="cc-card-used-value">
                          ${formatMoney(card.usedAmount)}
                        </p>
                      </div>
                      <div className="cc-card-limit-col">
                        <p className="cc-card-label">Credit Limit</p>
                        <p className="cc-card-limit-value">
                          ${formatMoney(card.creditLimit)}
                        </p>
                      </div>
                  </div>

                  {/* Usage Bar */}
                  <div>
                    <div className="cc-usage-header">
                      <span className="cc-card-label">Usage</span>
                      <div className="cc-usage-right">
                        <span className={`cc-usage-percent ${isHighUsage ? "cc-usage-high" : "cc-usage-normal"}`}>
                          {usagePercent.toFixed(0)}%
                        </span>
                        {isHighUsage && <AlertTriangle className="cc-usage-icon" />}
                      </div>
                    </div>
                    <div className="cc-usage-track">
                      <div
                        className={`cc-usage-fill ${isHighUsage ? "cc-usage-fill-high" : "cc-usage-fill-normal"}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>

                  {isHighUsage && (
                    <div className="cc-warning-box">
                      <AlertTriangle className="cc-warning-icon" />
                      <div>
                        <p className="cc-warning-title">High usage warning</p>
                        <p className="cc-warning-text">
                          You've used more than 80% of your credit limit
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="cc-view-details">
                    <span className="cc-view-details-text">View Details</span>
                    <ArrowRight className="cc-view-details-icon" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
