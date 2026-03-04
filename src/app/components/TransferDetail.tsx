import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { LoadingScreen } from "./LoadingScreen";

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
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/transactions"
          className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1F2933] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Transactions</span>
        </Link>

        <div className="text-right">
          <p className="text-sm text-[#64748B]">Transfer</p>
          <p className="font-semibold text-[#1F2933]">#{transferId}</p>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1F2933]">Edit Transfer</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Update amount, description, date, and linked accounts together.
          </p>
        </div>

        <form onSubmit={onSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Amount</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-4 flex items-center text-[#64748B]">$</span>
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
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Credit card payment"
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">From Account</label>
            <div className="space-y-2">
              {debitCardsOnly.map((card) => (
                <button
                  key={stringifyCardId(card.id)}
                  type="button"
                  onClick={() => setFromCardId(stringifyCardId(card.id))}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    fromCardId === stringifyCardId(card.id)
                      ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[#1F2933]">{card.name}</span>
                    <span className="text-sm text-[#64748B]">•••• {card.last4 ?? "----"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">To Account</label>
            <div className="space-y-2">
              {cards.map((card) => (
                <button
                  key={stringifyCardId(card.id)}
                  type="button"
                  onClick={() => setToCardId(stringifyCardId(card.id))}
                  className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                    toCardId === stringifyCardId(card.id)
                      ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-[#1F2933]">{card.name}</span>
                    <span className="text-sm text-[#64748B]">•••• {card.last4 ?? "----"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || deleting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-4 bg-[#2DD4BF] text-white font-semibold rounded-xl hover:bg-[#14B8A6] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Changes"}
            </button>

            <Link
              to="/transactions"
              className="flex-1 inline-flex items-center justify-center py-4 bg-gray-50 text-[#1F2933] font-semibold rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>

        <div className="mt-8 border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={onDelete}
            disabled={saving || deleting}
            className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-red-50 text-red-700 font-semibold rounded-xl hover:bg-red-100 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Deleting..." : "Delete Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}
