import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { LoadingScreen } from "./LoadingScreen";
import "../../styles/components/TransactionDetail.css";

type Card = {
  id: string | number;
  name: string;
  last4: string | null;
  credit_limit?: number | string | null;
};

type TransferResponse = {
  transferId: string;
  amount: number | string;
  description: string;
  date: string;
  fromCardId: string;
  toCardId: string;
  toCardIsCredit?: boolean;
  outgoingTransactionId: string;
  incomingTransactionId: string;
};

function stringifyCardId(value: string | number) {
  return String(value);
}

function cleanAmountInput(value: string) {
  let cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);
  cleaned = parts.join(".");
  return cleaned;
}

function formatAmountInput(value: string) {
  if (!value) return "";
  const cleaned = value.replace(/,/g, "");
  if (!cleaned) return "";

  const [integer, decimal] = cleaned.split(".");
  const intNum = Number(integer || 0);
  const formattedInteger = new Intl.NumberFormat("en-US").format(Number.isFinite(intNum) ? intNum : 0);

  if (decimal !== undefined) return `${formattedInteger}.${decimal}`;
  return formattedInteger;
}

export function TransferDetail() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const { transferId } = useParams<{ transferId: string }>();
  const nav = useNavigate();

  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(() => {
    const headers = new Headers();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [fromCardId, setFromCardId] = useState("");
  const [toCardId, setToCardId] = useState("");

  const debitCardsOnly = useMemo(() => {
    return cards.filter((card) => {
      const limit = Number(card.credit_limit ?? 0);
      return !Number.isFinite(limit) || limit <= 0;
    });
  }, [cards]);

  useEffect(() => {
    let cancelled = false;
    if (!transferId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const headers = new Headers(authHeaders);
        headers.set("Content-Type", "application/json");

        const [transferRes, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/api/transfers/${transferId}`, { headers }),
          fetch(`${API_BASE}/api/cards`, { headers }),
        ]);

        const transferData = await transferRes.json().catch(() => null);
        const cardsData = await cardsRes.json().catch(() => null);

        if (!transferRes.ok) {
          throw new Error(transferData?.error || transferData?.message || "Failed to load transfer");
        }
        if (!cardsRes.ok) {
          throw new Error(cardsData?.error || cardsData?.message || "Failed to load cards");
        }

        if (cancelled) return;

        const transfer = transferData as TransferResponse;
        setCards(Array.isArray(cardsData) ? cardsData : []);
        setAmount(String(transfer.amount ?? ""));
        setDescription(String(transfer.description || ""));
        setDate(String(transfer.date || "").split("T")[0] || "");
        setFromCardId(String(transfer.fromCardId || ""));
        setToCardId(String(transfer.toCardId || ""));
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Error loading transfer");
          setCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, authHeaders, transferId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!transferId) return;

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return alert("Please enter a valid amount");
    }

    const finalDescription = description.trim();
    if (!finalDescription) {
      return alert("Please enter a description");
    }

    if (!fromCardId) {
      return alert("Please select FROM account");
    }
    if (!toCardId) {
      return alert("Please select TO account");
    }
    if (fromCardId === toCardId) {
      return alert("FROM and TO accounts must be different");
    }

    try {
      setSaving(true);
      setError(null);

      const headers = new Headers(authHeaders);
      headers.set("Content-Type", "application/json");

      const payload = {
        fromCardId,
        toCardId,
        amount: parsedAmount,
        description: finalDescription,
        date: date ? new Date(`${date}T00:00:00`).toISOString() : undefined,
      };

      const res = await fetch(`${API_BASE}/api/transfers/${transferId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (res.status !== 204) {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || data?.message || "Failed to save transfer");
        }
      }

      nav("/transactions");
    } catch (e: any) {
      setError(e?.message || "Error saving transfer");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!transferId) return;

    const confirmed = window.confirm("Delete this transfer permanently?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      const res = await fetch(`${API_BASE}/api/transfers/${transferId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (res.status !== 204) {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(data?.error || data?.message || "Failed to delete transfer");
        }
      }

      nav("/transactions");
    } catch (e: any) {
      setError(e?.message || "Error deleting transfer");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <LoadingScreen title="Transfer Detail" message="Loading transfer..." />;
  }

  return (
    <div className="td-page">
      <div className="td-top-bar">
        <Link to="/transactions" className="td-back-link">
          <ArrowLeft className="td-back-icon" />
          <span className="td-back-text">Back to Transactions</span>
        </Link>

        <div className="td-tx-id-wrap">
          <p className="td-tx-id-label">Transfer</p>
          <p className="td-tx-id-value">#{transferId}</p>
        </div>
      </div>

      {error && (
        <div className="td-error-box">
          <p className="td-error-text">{error}</p>
        </div>
      )}

      <div className="td-card">
        <div className="td-card-header">
          <h1 className="td-title">Edit Transfer</h1>
          <p className="td-subtitle">
            Update amount, description, date, and linked accounts together.
          </p>
        </div>

        <form onSubmit={onSave} className="td-form">
          <div>
            <label className="td-label">Amount</label>
            <div className="td-amount-wrap">
              <span className="td-currency">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={formatAmountInput(amount)}
                onChange={(e) => {
                  const cleaned = cleanAmountInput(e.target.value);
                  if (cleaned === null) return;
                  setAmount(cleaned);
                }}
                placeholder="0.00"
                className="td-amount-input"
              />
            </div>
          </div>

          <div>
            <label className="td-label">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Credit card payment"
              className="td-text-input"
            />
          </div>

          <div>
            <label className="td-label">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="td-text-input"
            />
          </div>

          <div>
            <label className="td-label td-label-spaced">From Account</label>
            <div className="td-card-list">
              {debitCardsOnly.map((card) => (
                <button
                  key={stringifyCardId(card.id)}
                  type="button"
                  onClick={() => setFromCardId(stringifyCardId(card.id))}
                  className={`td-card-btn ${
                    fromCardId === stringifyCardId(card.id)
                      ? "td-card-btn-active"
                      : "td-card-btn-inactive"
                  }`}
                >
                  <div className="td-card-row">
                    <span className="td-card-name">{card.name}</span>
                    <span className="td-card-last4">•••• {card.last4 ?? "----"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="td-label td-label-spaced">To Account</label>
            <div className="td-card-list">
              {cards.map((card) => (
                <button
                  key={stringifyCardId(card.id)}
                  type="button"
                  onClick={() => setToCardId(stringifyCardId(card.id))}
                  className={`td-card-btn ${
                    toCardId === stringifyCardId(card.id)
                      ? "td-card-btn-active"
                      : "td-card-btn-inactive"
                  }`}
                >
                  <div className="td-card-row">
                    <span className="td-card-name">{card.name}</span>
                    <span className="td-card-last4">•••• {card.last4 ?? "----"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="td-actions-row">
            <button
              type="submit"
              disabled={saving || deleting}
              className="td-save-btn"
            >
              <Save className="td-save-icon" />
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <Link to="/transactions" className="td-cancel-link">
              Cancel
            </Link>
          </div>
        </form>

        <div className="td-danger-zone">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving || deleting}
            className="td-delete-btn"
          >
            <Trash2 className="td-delete-icon" />
            {deleting ? "Deleting..." : "Delete Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
