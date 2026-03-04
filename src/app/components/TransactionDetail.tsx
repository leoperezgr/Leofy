import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { categories as mockCategories } from "../utils/mockData";
import { UiTransaction, normalizeTransactions } from "../utils/transactionsMapper";
import { formatMoney } from "../utils/formatMoney";
import { useAppDate } from "../contexts/AppDateContext";
import { LoadingScreen } from "./LoadingScreen";

type Card = {
  id: string;
  name: string;
  last4: string | null;
  brand?: string | null;
  credit_limit?: number | string | null;
  color?: string | null;
};

type UiCategory = {
  id: string;
  name: string;
  icon: string;
  type: "EXPENSE" | "INCOME";
  source: "api" | "managed" | "default" | "mock";
};

const CATEGORY_STORAGE_KEY = "leofy_settings_categories_v1";

const DEFAULT_EXPENSE_CATEGORIES: UiCategory[] = [
  { id: "default_groceries", name: "Groceries", icon: "ShoppingCart", type: "EXPENSE", source: "default" },
  { id: "default_dining", name: "Dining", icon: "Utensils", type: "EXPENSE", source: "default" },
  { id: "default_coffee", name: "Coffee", icon: "Coffee", type: "EXPENSE", source: "default" },
  { id: "default_transportation", name: "Transportation", icon: "Car", type: "EXPENSE", source: "default" },
  { id: "default_shopping", name: "Shopping", icon: "ShoppingBag", type: "EXPENSE", source: "default" },
  { id: "default_bills", name: "Bills & Subscriptions", icon: "Receipt", type: "EXPENSE", source: "default" },
  { id: "default_health", name: "Health & Personal", icon: "Heart", type: "EXPENSE", source: "default" },
];

const DEFAULT_INCOME_CATEGORIES: UiCategory[] = mockCategories
  .filter((cat) => cat.type === "income")
  .map((cat) => ({
    id: `mock_${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`,
    name: cat.name,
    icon: cat.icon,
    type: "INCOME" as const,
    source: "mock" as const,
  }));

function getCategoryIconName(name: string) {
  const normalized = String(name || "").trim().toLowerCase();

  if (normalized.includes("grocery")) return "ShoppingCart";
  if (normalized.includes("dining") || normalized.includes("food") || normalized.includes("restaurant")) return "Utensils";
  if (normalized.includes("coffee")) return "Coffee";
  if (normalized.includes("transport") || normalized.includes("gas") || normalized.includes("car")) return "Car";
  if (normalized.includes("shop")) return "ShoppingBag";
  if (normalized.includes("bill") || normalized.includes("subscription")) return "Receipt";
  if (normalized.includes("health") || normalized.includes("personal")) return "Heart";

  const fromMock = mockCategories.find((cat) => cat.name.trim().toLowerCase() === normalized);
  return fromMock?.icon || "Tag";
}

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
  const { getAppDate } = useAppDate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const { transactionId } = useParams<{ transactionId: string }>();
  const nav = useNavigate();
  const location = useLocation();
  const routeState = (location.state as {
    paymentMethod?: "cash" | "debit" | "credit";
    cardId?: string | null;
  } | null) ?? null;

  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(() => {
    const h = new Headers();
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  }, [token]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tx, setTx] = useState<UiTransaction | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [apiCategories, setApiCategories] = useState<UiCategory[]>([]);
  const [managedCategories, setManagedCategories] = useState<UiCategory[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [cardsLoaded, setCardsLoaded] = useState(false);
  const [rawTx, setRawTx] = useState<any | null>(null);
  const [didInitPaymentSelection, setDidInitPaymentSelection] = useState(false);
  const [userTouchedPaymentMethod, setUserTouchedPaymentMethod] = useState(false);

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [cardId, setCardId] = useState<string>(routeState?.cardId ? String(routeState.cardId) : "");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "debit" | "credit">(
    routeState?.paymentMethod === "credit" || routeState?.paymentMethod === "debit" || routeState?.paymentMethod === "cash"
      ? routeState.paymentMethod
      : "cash"
  );

  const filteredCategories = useMemo(() => {
    const desiredType = tx?.type === "income" ? "INCOME" : "EXPENSE";
    const managedMatches = managedCategories.filter((cat) => cat.type === desiredType);
    const apiMatches = apiCategories.filter((cat) => cat.type === desiredType);

    if (apiMatches.length > 0) return apiMatches;
    if (managedMatches.length > 0) return managedMatches;
    if (desiredType === "EXPENSE") return DEFAULT_EXPENSE_CATEGORIES;
    return DEFAULT_INCOME_CATEGORIES;
  }, [apiCategories, managedCategories, tx?.type]);

  const creditCardsOnly = useMemo(() => {
    return cards.filter((c) => c.credit_limit !== null && c.credit_limit !== undefined);
  }, [cards]);

  const debitCardsOnly = useMemo(() => {
    return cards.filter((c) => c.credit_limit === null || c.credit_limit === undefined);
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
      setCardsLoaded(true);
    }
  }

  async function loadTransaction() {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const h = new Headers(authHeaders);
      h.set("Content-Type", "application/json");
      setDidInitPaymentSelection(false);
      setUserTouchedPaymentMethod(false);

      let foundUi: UiTransaction | null = null;
      let foundRaw: any = null;
      const res = await fetch(`${API_BASE}/api/transactions`, { headers: h });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load transaction");
      const rawList: any[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.transactions)
          ? data.transactions
          : Array.isArray(data?.recentTransactions)
            ? data.recentTransactions
            : [];
      foundRaw = rawList.find((t) => String(t?.id) === String(transactionId)) ?? null;
      const normalized: UiTransaction[] = normalizeTransactions(data);
      foundUi = normalized.find((t) => String(t.id) === String(transactionId)) ?? null;

      if (!foundUi) {
        setTx(null);
        setRawTx(null);
        setError("Transaction not found.");
        return;
      }

      setTx(foundUi);
      setRawTx(foundRaw ?? null);
      setAmount(String(foundUi.amount ?? ""));
      setDescription(foundUi.description ?? "");
      setCategory(foundUi.category ?? "");
      setCustomCategory("");
    } catch (e: any) {
      setError(e?.message || "Error loading transaction");
      setTx(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!raw) {
        setManagedCategories([]);
        return;
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setManagedCategories([]);
        return;
      }

      const normalized = parsed
        .map((item: any): UiCategory | null => {
          const name = String(item?.name || "").trim();
          if (!name) return null;

          return {
            id: String(item?.id || `managed_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`),
            name,
            icon: String(item?.icon || getCategoryIconName(name)),
            type: String(item?.type || "").toLowerCase() === "income" ? "INCOME" : "EXPENSE",
            source: "managed",
          };
        })
        .filter((item): item is UiCategory => Boolean(item));

      setManagedCategories(normalized);
    } catch {
      setManagedCategories([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          method: "GET",
          headers: authHeaders,
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || "Failed to load categories");

        const normalized = Array.isArray(data)
          ? data
              .map((item: any): UiCategory | null => {
                const name = String(item?.name || "").trim();
                if (!name) return null;

                return {
                  id: String(item?.id ?? name),
                  name,
                  icon: getCategoryIconName(name),
                  type: String(item?.type || "").toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE",
                  source: "api",
                };
              })
              .filter((item: UiCategory | null): item is UiCategory => Boolean(item))
          : [];

        if (!cancelled) setApiCategories(normalized);
      } catch {
        if (!cancelled) setApiCategories([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  useEffect(() => {
    loadTransaction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE, transactionId]);

  useEffect(() => {
    if (didInitPaymentSelection || userTouchedPaymentMethod) return;
    if (!rawTx || !cardsLoaded) return;

    const rawCardId = rawTx?.card_id ?? rawTx?.cardId ?? null;
    const explicit =
      rawTx?.payment_method ??
      rawTx?.paymentMethod ??
      rawTx?.metadata?.payment_method ??
      rawTx?.metadata?.paymentMethod ??
      null;

    let inferred: "cash" | "debit" | "credit";
    if (explicit === "credit" || explicit === "debit" || explicit === "cash") {
      inferred = explicit;
    } else if (rawCardId != null) {
      const hit = cards.find((c) => String(c.id) === String(rawCardId));
      inferred = hit && hit.credit_limit !== null && hit.credit_limit !== undefined ? "credit" : "debit";
    } else {
      inferred = "cash";
    }

    setPaymentMethod(inferred);
    setCardId(inferred === "cash" || rawCardId == null ? "" : String(rawCardId));
    setDidInitPaymentSelection(true);
  }, [didInitPaymentSelection, userTouchedPaymentMethod, rawTx, cardsLoaded, cards]);

  useEffect(() => {
    if (paymentMethod === "cash") {
      if (cardId) setCardId("");
      return;
    }

    if (!cardId) return;

    const allowed = paymentMethod === "credit" ? creditCardsOnly : debitCardsOnly;
    const isValid = allowed.some((c) => String(c.id) === String(cardId));
    if (!isValid) setCardId("");
  }, [paymentMethod, cardId, creditCardsOnly, debitCardsOnly]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!tx || !transactionId) return;

    const desc = description.trim();
    if (!desc) return alert("Please enter a description");

    const finalCategory = category === "Other" ? customCategory.trim() : category;
    if (!finalCategory) return alert("Please select a category");

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return alert("Please enter a valid amount");
    const occurredAt =
      rawTx?.occurred_at ||
      rawTx?.created_at ||
      (tx.date ? new Date(tx.date).toISOString() : getAppDate().toISOString());

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
        occurred_at: occurredAt,
        paymentMethod,
        card_id: paymentMethod === "cash" ? null : cardId || null,
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
          setPaymentMethod(
            normalized[0].paymentMethod === "credit" || normalized[0].paymentMethod === "debit"
              ? normalized[0].paymentMethod
              : "cash"
          );
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

  async function onDelete() {
    if (!transactionId) return;

    const confirmed = window.confirm("Delete this transaction permanently?");
    if (!confirmed) return;

    try {
      setDeleting(true);
      setError(null);

      const h = new Headers(authHeaders);
      const res = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
        method: "DELETE",
        headers: h,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to delete transaction");

      nav("/transactions");
    } catch (e: any) {
      setError(e?.message || "Error deleting transaction");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Transaction Detail"
        message="Loading transaction data..."
      />
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

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(["credit", "debit", "cash"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => {
                    setUserTouchedPaymentMethod(true);
                    setPaymentMethod(method);
                  }}
                  className={`py-3 rounded-xl border-2 font-medium transition-all ${
                    paymentMethod === method
                      ? "border-[#2DD4BF] bg-[#2DD4BF]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {method === "credit" ? "Credit" : method === "debit" ? "Debit" : "Cash"}
                </button>
              ))}
            </div>
          </div>

          {(paymentMethod === "credit" || paymentMethod === "debit") && (
            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-3">
                {paymentMethod === "credit" ? "Select Credit Card" : "Select Debit Account"}
              </label>

              {cardsLoading ? (
                <div className="text-sm text-[#64748B]">Loading cards...</div>
              ) : (
                <div className="space-y-2">
                  {(paymentMethod === "credit" ? creditCardsOnly : debitCardsOnly).map((card) => (
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

                  {(paymentMethod === "credit" ? creditCardsOnly : debitCardsOnly).length === 0 && (
                    <div className="text-sm text-[#64748B]">
                      {paymentMethod === "credit" ? "No credit cards found." : "No debit accounts found."}
                    </div>
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
              {filteredCategories.map((cat) => {
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
            {deleting ? "Deleting..." : "Delete Transaction"}
          </button>
        </div>
      </div>
    </div>
  );
}
