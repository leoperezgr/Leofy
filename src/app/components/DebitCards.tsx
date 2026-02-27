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
  color?: string | null;
};

type UiCard = {
  id: string;
  name: string;
  last4: string;
  creditLimit: number;
  balance: number;
  income: number;
  expense: number;
  txCount: number;
  colorClass: string;
};

type ApiTx = {
  id: string | number;
  type: "INCOME" | "EXPENSE" | "income" | "expense";
  amount: number | string;
  occurred_at?: string;
  card_id?: string | number | null;
  cardId?: string | number | null;
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

export function DebitCards() {
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

        const resCards = await fetch(`${API_BASE}/api/cards`, { headers: h });
        const cardsJson = await resCards.json().catch(() => null);
        if (!resCards.ok) {
          throw new Error(cardsJson?.error || cardsJson?.message || "Failed to load cards");
        }

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
          setError(e?.message || "Error loading debit cards");
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

  const statsByCard = useMemo(() => {
    const map = new Map<string, { income: number; expense: number; txCount: number }>();

    for (const t of tx) {
      const cardIdRaw = (t as any).card_id ?? (t as any).cardId ?? null;
      if (!cardIdRaw) continue;

      const cid = toId(cardIdRaw);
      const amt = toNumber((t as any).amount);
      const type = String((t as any).type || "").toUpperCase();
      const current = map.get(cid) || { income: 0, expense: 0, txCount: 0 };

      if (type === "INCOME") current.income += amt;
      if (type === "EXPENSE") current.expense += amt;
      current.txCount += 1;

      map.set(cid, current);
    }

    return map;
  }, [tx]);

  const uiCards: UiCard[] = useMemo(() => {
    return cards
      .map((c) => {
        const id = toId(c.id);
        const creditLimit = toNumber(c.credit_limit);
        const stats = statsByCard.get(id) || { income: 0, expense: 0, txCount: 0 };
        const balance = stats.income - stats.expense;

        return {
          id,
          name: c.name,
          last4: c.last4 || "----",
          creditLimit,
          balance,
          income: stats.income,
          expense: stats.expense,
          txCount: stats.txCount,
          colorClass: colorToGradient(c.color),
        };
      })
      .filter((c) => c.creditLimit <= 0);
  }, [cards, statsByCard]);

  const totals = useMemo(() => {
    const totalBalance = uiCards.reduce((sum, c) => sum + c.balance, 0);
    const cardsCount = uiCards.length;
    return { totalBalance, cardsCount };
  }, [uiCards]);

  return (
    <div className="cc-page">
      <div className="cc-header">
        <h1 className="cc-title">Debit Cards</h1>
        <p className="cc-subtitle">Manage your debit cards and track balances</p>
      </div>

      {error && (
        <div className="cc-error-box">
          <p className="cc-error-text">{error}</p>
        </div>
      )}

      <div className="cc-summary-grid">
        <div className="cc-summary-card">
          <p className="cc-summary-label">Total in Debit Cards</p>
          <p className="cc-summary-value">
            ${formatMoney(totals.totalBalance)}
          </p>
        </div>

        <div className="cc-summary-card">
          <p className="cc-summary-label">Cards Count</p>
          <p className="cc-summary-value">{totals.cardsCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="cc-content-box">
          <p className="cc-muted-text">Loading cards…</p>
        </div>
      ) : uiCards.length === 0 ? (
        <div className="cc-content-box">
          <p className="cc-muted-text">No debit cards found.</p>
          <p className="cc-tip-text">Tip: add a card without a credit limit in Manage Cards.</p>
        </div>
      ) : (
        <div className="cc-list">
          {uiCards.map((card) => {
            const hasNegativeBalance = card.balance < 0;

            return (
              <Link
                key={card.id}
                to={`/debit-cards/${card.id}`}
                className="cc-card-link"
              >
                <div className={`cc-card-visual ${card.colorClass}`}>
                  <div className="cc-card-orb-large" />
                  <div className="cc-card-orb-small" />

                  <div className="cc-card-visual-content">
                    <div>
                      <p className="cc-card-kind">Debit Card</p>
                      <h3 className="cc-card-name">{card.name}</h3>
                    </div>
                    <div>
                      <p className="cc-card-last4">•••• •••• •••• {card.last4}</p>
                    </div>
                  </div>
                </div>

                <div className="cc-card-body">
                  <div className="cc-card-row">
                    <div>
                      <p className="cc-card-label">Balance</p>
                      <p className="cc-card-used-value">
                        ${formatMoney(card.balance)}
                      </p>
                    </div>
                    <div className="cc-card-limit-col">
                      <p className="cc-card-label">Transactions</p>
                      <p className="cc-card-limit-value">{card.txCount}</p>
                    </div>
                  </div>

                  {hasNegativeBalance && (
                    <div className="cc-warning-box">
                      <AlertTriangle className="cc-warning-icon" />
                      <div>
                        <p className="cc-warning-title">Negative balance warning</p>
                        <p className="cc-warning-text">
                          Expenses are currently higher than income
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
