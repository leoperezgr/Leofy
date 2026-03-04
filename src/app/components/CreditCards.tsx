import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "../utils/formatMoney";
import { LoadingScreen } from "./LoadingScreen";
import { applyCardOrder } from "../utils/cardOrder";
import {
  type ApiCard,
  type ApiTx,
  toId,
  toNumber,
  cardColorToGradient,
  computeNetUsedByCard,
} from "../utils/creditCycleCalculator";
import "../../styles/components/CreditCards.css";

type UiCard = {
  id: string;
  name: string;
  last4: string;
  creditLimit: number;
  usedAmount: number;
  colorClass: string; // tailwind gradient class
};

export function CreditCards() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  const [cards, setCards] = useState<ApiCard[]>([]);
  const [tx, setTx] = useState<ApiTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("leofy_token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [resCards, resTx] = await Promise.all([
          fetch(`${API_BASE}/api/cards`, { headers }),
          fetch(`${API_BASE}/api/transactions`, { headers }),
        ]);

        const cardsJson = await resCards.json().catch(() => null);
        if (!resCards.ok) {
          throw new Error(cardsJson?.error || cardsJson?.message || "Failed to load cards");
        }

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
  }, [API_BASE]);

  // calcular usedAmount neto por card_id (EXPENSE suma, INCOME resta)
  const usedByCard = useMemo(() => {
    return computeNetUsedByCard(tx);
  }, [tx]);

  // UI cards: solo credit (credit_limit > 0)
  const uiCards: UiCard[] = useMemo(() => {
    return applyCardOrder(cards.filter((c) => toNumber(c.credit_limit) > 0))
      .map((c) => {
        const creditLimit = toNumber(c.credit_limit);
        const id = toId(c.id);
        return {
          id,
          name: c.name,
          last4: c.last4 || "----",
          creditLimit,
          usedAmount: usedByCard.get(id) || 0,
          colorClass: cardColorToGradient(c.color),
        };
      });
  }, [cards, usedByCard]);

  const totals = useMemo(() => {
    const totalUsed = uiCards.reduce((sum, c) => sum + c.usedAmount, 0);
    const totalLimit = uiCards.reduce((sum, c) => sum + c.creditLimit, 0);
    return { totalUsed, totalLimit };
  }, [uiCards]);

  if (loading) {
    return (
      <LoadingScreen
        title="Credit Cards"
        message="Loading your credit cards..."
      />
    );
  }

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

      {/* List */}
      {uiCards.length === 0 ? (
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
