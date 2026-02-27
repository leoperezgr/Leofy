import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { categories } from "../utils/mockData";
import { UiTransaction, normalizeTransactions } from "../utils/transactionsMapper";
import { formatMoney } from "../utils/formatMoney";

type Card = {
  id: string;
  name: string;
  last4: string | null;
  brand?: string | null;
  credit_limit?: number | string | null;
  color?: string | null;
};

function formatAmountInput(value: string) {
  if (!value) return "";
  const cleaned = value.replace(/,/g, "");
  if (!cleaned) return "";

  const [integer, decimal] = cleaned.split(".");
  const intNum = Number(integer || 0);

  const formattedInteger = new Intl.NumberFormat("en-US").format(
    Number.isFinite(intNum) ? intNum : 0
  );

  if (decimal !== undefined) return `${formattedInteger}.${decimal}`;
  return formattedInteger;
}

function cleanAmountInput(value: string) {
  let cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) return null;
  if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);
  cleaned = parts.join(".");
  return cleaned;
}

export function TransactionDetail() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const { transactionId } = useParams<{ transactionId: string }>();
  const nav = useNavigate();

  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(() => {
    const h = new Headers();
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tx, setTx] = useState<UiTransaction | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [cardId, setCardId] = useState<string>("");

  const filteredCategories = useMemo(() => {
    const t = tx?.type === "income" ? "income" : "expense";
    return categories.filter((c) => c.type === t);
  }, [tx?.type]);

  const creditCardsOnly = useMemo(() => {
    return cards.filter((c) => {
      const n = Number((c as any).credit_limit ?? 0);
      return Number.isFinite(n) && n > 0;
    });
  }, [cards]);

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  async function loadCards() {
    try {
      setCardsLoading(true);
      const h = new Headers(authHeaders);
      const res = await fetch(`${API_BASE}/api/cards`, { headers: h });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load cards");
      setCards(Array.isArray(data) ? data : []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }

  async function loadTransaction() {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const h = new Headers(authHeaders);
      h.set("Content-Type", "application/json");

      let direct: any = null;
      try {
        const res = await fetch(`${API_BASE}/api/transactions/${transactionId}`, { headers: h });
        const data = await res.json().catch(() => null);
        if (res.ok) direct = data;
      } catch {
      }

      let foundUi: UiTransaction | null = null;

      if (direct) {
        const normalized = normalizeTransactions([direct] as any);
        foundUi = normalized?.[0] ?? null;
      } else {
        const res = await fetch(`${API_BASE}/api/transactions`, { headers: h });
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load transaction");
        const normalized: UiTransaction[] = normalizeTransactions(data);
        foundUi = normalized.find((t) => String(t.id) === String(transactionId)) ?? null;
      }

      if (!foundUi) {
        setTx(null);
        setError("Transaction not found.");
        return;
      }

      setTx(foundUi);
      setAmount(String(foundUi.amount ?? ""));
      setDescription(foundUi.description ?? "");
      setCategory(foundUi.category ?? "");
      setCustomCategory("");
      setCardId((foundUi as any).cardId ? String((foundUi as any).cardId) : "");
    } catch (e: any) {
      setError(e?.message || "Error loading transaction");
      setTx(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  useEffect(() => {
    loadTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, transactionId]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tx || !transactionId) return;

    const desc = description.trim();
    if (!desc) return alert("Please enter a description");

    const finalCategory = category === "Other" ? customCategory.trim() : category;
    if (!finalCategory) return alert("Please select a category");

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return alert("Please enter a valid amount");

    try {
      setSaving(true);
      setError(null);

      const h = new Headers(authHeaders);
      h.set("Content-Type", "application/json");

      const payload: any = {
        type: tx.type,
        amount: amountNum,
        description: desc,
        category: finalCategory,
        date: tx.date ? new Date(tx.date).toISOString() : new Date().toISOString(),
        card_id: cardId ? Number(cardId) : null,
      };

      const res = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
        method: "PUT",
        headers: h,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to save transaction");

      try {
        const normalized = normalizeTransactions([data] as any);
        if (normalized?.[0]) {
          setTx(normalized[0]);
          setAmount(String(normalized[0].amount ?? ""));
          setDescription(normalized[0].description ?? "");
          setCategory(normalized[0].category ?? "");
        }
      } catch {
      }

      nav("/transactions");
    } catch (e: any) {
      setError(e?.message || "Error saving transaction");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B]">Loading transaction...</p>
        </div>
      </div>
    );
  }

  if (!tx) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <Link
          to="/transactions"
          className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1F2933] mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Transactions</span>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-red-600">{error || "Transaction not found."}</p>
        </div>
      </div>
    );
  }

  const amountDisplay = formatAmountInput(amount);

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
          <p className="text-sm text-[#64748B]">Transaction</p>
          <p className="font-semibold text-[#1F2933]">#{String(tx.id)}</p>
        </div>
      </div>

      {error && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1F2933]">Edit Transaction</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Update amount, card, description, or category.
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
                value={amountDisplay}
                onChange={(e) => {
                  const cleaned = cleanAmountInput(e.target.value);
                  if (cleaned === null) return;
                  setAmount(cleaned);
                }}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
              />
            </div>
            <div className="mt-2 text-xs text-[#94A3B8]">
              Display: ${formatMoney(Number(amount || 0))}
            </div>
          </div>

          {tx.type === "expense" && tx.paymentMethod === "credit" && (
            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-3">
                Select Credit Card
              </label>

              {cardsLoading ? (
                <div className="text-sm text-[#64748B]">Loading cards...</div>
              ) : (
                <div className="space-y-2">
                  {creditCardsOnly.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCardId(card.id)}
                      className={`w-full rounded-xl border-2 p-4 transition-all ${
                        cardId === card.id
                          ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#1F2933]">{card.name}</span>
                        <span className="text-sm text-[#64748B]">•••• {card.last4 ?? "----"}</span>
                      </div>
                    </button>
                  ))}

                  {creditCardsOnly.length === 0 && (
                    <div className="text-sm text-[#64748B]">No credit cards found.</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery shopping"
              required
              minLength={2}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories
                .filter((cat) => cat.type === tx.type)
                .map((cat) => {
                  const IconComponent = getIconComponent(cat.icon);
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                        category === cat.name
                          ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <IconComponent className="w-6 h-6 text-[#64748B]" />
                      <span className="text-xs text-center line-clamp-1">{cat.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          {category === "Other" && (
            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-2">
                Custom Category
              </label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter category name"
                required
                className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
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
      </div>
    </div>
  );
}
