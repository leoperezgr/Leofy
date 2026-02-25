// src/components/ManageCards.tsx
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Pencil, Trash2, X } from "lucide-react";
import { formatMoney } from "../utils/formatMoney";
import visaLogo from "../../assets/brands/visa.svg";
import mastercardLogo from "../../assets/brands/mastercard.svg";
import amexLogo from "../../assets/brands/amex.svg";

type CardColor =
  | "RED"
  | "ORANGE"
  | "BLUE"
  | "GOLD"
  | "BLACK"
  | "PLATINUM"
  | "SILVER"
  | "PURPLE"
  | "GREEN"
  | "OTHER";

type Card = {
  id: string;
  name: string;
  last4: string | null;
  brand?: string | null;
  credit_limit?: number | string | null;

  // ✅ nuevos
  color?: CardColor | string | null;
  closing_day?: number | null;
  due_day?: number | null;
};

type Filter = "all" | "credit" | "debit";

function cardColorToGradient(color: CardColor | string | null | undefined) {
  switch (color) {
    case "RED":
      return "from-red-500 to-rose-600";
    case "ORANGE":
      return "from-orange-500 to-amber-600";
    case "BLUE":
      return "from-blue-500 to-indigo-600";
    case "GOLD":
      return "from-yellow-400 to-amber-600";
    case "BLACK":
      return "from-gray-900 to-gray-700";
    case "PLATINUM":
      return "from-slate-300 to-slate-500";
    case "SILVER":
      return "from-gray-300 to-gray-500";
    case "PURPLE":
      return "from-purple-500 to-fuchsia-600";
    case "GREEN":
      return "from-emerald-500 to-teal-600";
    default:
      return "from-[#2DD4BF] to-[#14B8A6]";
  }
}

const COLOR_OPTIONS: Array<{ key: CardColor; label: string; dot: string }> = [
  { key: "RED", label: "Red", dot: "bg-red-500" },
  { key: "ORANGE", label: "Orange", dot: "bg-orange-500" },
  { key: "BLUE", label: "Blue", dot: "bg-blue-500" },
  { key: "GOLD", label: "Gold", dot: "bg-yellow-400" },
  { key: "BLACK", label: "Black", dot: "bg-gray-900" },
  { key: "PLATINUM", label: "Platinum", dot: "bg-slate-300" },
  { key: "SILVER", label: "Silver", dot: "bg-gray-300" },
  { key: "PURPLE", label: "Purple", dot: "bg-purple-500" },
  { key: "GREEN", label: "Green", dot: "bg-emerald-500" },
  { key: "OTHER", label: "Other", dot: "bg-[#2DD4BF]" },
];

function colorLabel(c: CardColor) {
  return COLOR_OPTIONS.find((x) => x.key === c)?.label ?? "Other";
}

export function ManageCards() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState<Card | null>(null);
  const [saving, setSaving] = useState(false);

  // form
  const [name, setName] = useState("");
  const [last4, setLast4] = useState("");
  const [brand, setBrand] = useState("OTHER");
  const [kind, setKind] = useState<"credit" | "debit">("debit"); // UI only
  const [limit, setLimit] = useState(""); // string for input

  // ✅ nuevos
  const [color, setColor] = useState<CardColor>("OTHER");
  const [closingDay, setClosingDay] = useState(""); // "1".."31" o ""
  const [dueDay, setDueDay] = useState(""); // "1".."31" o ""

  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(() => {
    const h = new Headers();
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  }, [token]);

  const isCredit = (c: Card) => {
    const v = c.credit_limit;
    if (v === null || v === undefined) return false;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) && n > 0;
  };

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "credit") return items.filter(isCredit);
    return items.filter((c) => !isCredit(c));
  }, [items, filter]);

  const totals = useMemo(() => {
    const credit = items.filter(isCredit);
    const debit = items.filter((c) => !isCredit(c));

    const totalLimit = credit.reduce((sum, c) => {
      const n = Number(c.credit_limit || 0);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    return {
      creditCount: credit.length,
      debitCount: debit.length,
      totalLimit,
    };
  }, [items]);

  async function loadCards() {
    try {
      setLoading(true);
      setError(null);

      const h = new Headers(authHeaders);

      const res = await fetch(`${API_BASE}/api/cards`, { headers: h });
      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to load cards");

      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || "Error loading cards");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_BASE]);

  function resetForm() {
    setName("");
    setLast4("");
    setBrand("OTHER");
    setKind("debit");
    setLimit("");
    setColor("OTHER");
    setClosingDay("");
    setDueDay("");
    setEditing(null);
  }

  function openAdd() {
    resetForm();
    setOpenModal(true);
  }

  function openEdit(card: Card) {
    setEditing(card);
    setName(card.name || "");
    setLast4((card.last4 || "").toString());
    setBrand((card.brand || "OTHER").toString());

    const credit = isCredit(card);
    setKind(credit ? "credit" : "debit");
    setLimit(credit ? String(card.credit_limit ?? "") : "");

    setColor(((card.color as CardColor) || "OTHER") as CardColor);
    setClosingDay(card.closing_day != null ? String(card.closing_day) : "");
    setDueDay(card.due_day != null ? String(card.due_day) : "");

    setOpenModal(true);
  }

  async function onDelete(card: Card) {
    const ok = confirm(`Delete "${card.name}"? This cannot be undone.`);
    if (!ok) return;

    try {
      setError(null);
      const h = new Headers(authHeaders);

      const res = await fetch(`${API_BASE}/api/cards/${card.id}`, {
        method: "DELETE",
        headers: h,
      });

      // Si tu backend responde 204, esto no rompe porque hacemos catch.
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to delete card");

      await loadCards();
    } catch (e: any) {
      setError(e?.message || "Error deleting card");
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();

    const n = name.trim();
    if (!n) return alert("Please enter a name");

    const l4 = last4.trim();
    if (l4 && !/^\d{4}$/.test(l4)) return alert("Last4 must be 4 digits (or leave empty)");

    let limitNum: number | null = null;
    if (kind === "credit") {
      const parsed = Number(limit.replace(/,/g, ""));
      if (!Number.isFinite(parsed) || parsed <= 0) return alert("Please enter a valid credit limit");
      limitNum = parsed;
    }

    const closingNum = closingDay.trim() ? Number(closingDay) : null;
    const dueNum = dueDay.trim() ? Number(dueDay) : null;

    if (kind === "credit") {
      if (closingNum != null && (!Number.isInteger(closingNum) || closingNum < 1 || closingNum > 31)) {
        return alert("Closing day must be a number between 1 and 31");
      }
      if (dueNum != null && (!Number.isInteger(dueNum) || dueNum < 1 || dueNum > 31)) {
        return alert("Due day must be a number between 1 and 31");
      }
    }

    try {
      setSaving(true);
      setError(null);

      const h = new Headers(authHeaders);
      h.set("Content-Type", "application/json");

      const payload: any = {
        name: n,
        last4: l4 || null,
        brand,
        color,
        credit_limit: kind === "credit" ? limitNum : null, // debit => null
        closing_day: kind === "credit" ? closingNum : null,
        due_day: kind === "credit" ? dueNum : null,
      };

      const url = editing ? `${API_BASE}/api/cards/${editing.id}` : `${API_BASE}/api/cards`;
      const method = editing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: h,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || "Failed to save card");

      setOpenModal(false);
      resetForm();
      await loadCards();
    } catch (e: any) {
      setError(e?.message || "Error saving card");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Manage Cards</h1>
          <p className="text-[#64748B]">Add, edit, delete, and update your debit & credit accounts</p>
        </div>

        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#2DD4BF] text-white rounded-xl hover:bg-[#14B8A6] transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Card
        </button>
      </div>

      {error && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Credit Accounts</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">{totals.creditCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Debit Accounts</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">{totals.debitCount}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100 col-span-2 lg:col-span-1">
          <p className="text-sm text-[#64748B] mb-2">Total Credit Limit</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">
          {formatMoney(totals.totalLimit)}
        </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <div className="inline-flex gap-2 p-1 bg-gray-100 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "all" ? "bg-white text-[#1F2933] shadow-sm" : "text-[#64748B]"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("credit")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "credit" ? "bg-white text-[#1F2933] shadow-sm" : "text-[#64748B]"
            }`}
          >
            Credit
          </button>
          <button
            onClick={() => setFilter("debit")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === "debit" ? "bg-white text-[#1F2933] shadow-sm" : "text-[#64748B]"
            }`}
          >
            Debit
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <p className="text-sm text-[#64748B]">Loading cards…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-[#64748B]">No cards found.</p>
          </div>
        ) : (
          filtered.map((card, idx) => {
            const credit = isCredit(card);
            const limitVal = credit ? Number(card.credit_limit || 0) : 0;

            return (
              <div
                key={card.id}
                className={`flex items-center justify-between p-4 ${
                  idx !== filtered.length - 1 ? "border-b border-gray-50" : ""
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* color dot */}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cardColorToGradient(card.color)} flex items-center justify-center`}>
                    <CreditCard className="w-6 h-6 text-white/90" />
                  </div>

                  <div className="min-w-0">
                    <p className="font-medium text-[#1F2933] truncate">{card.name}</p>
                    <p className="text-sm text-[#64748B]">
                      {credit ? "Credit" : "Debit"} {card.last4 ? `• •••• ${card.last4}` : ""}
                      {credit && card.closing_day ? ` • Cut: ${card.closing_day}` : ""}
                      {credit && card.due_day ? ` • Pay: ${card.due_day}` : ""}
                    </p>
                  </div>
                </div>

                <div className="text-right mr-4 hidden sm:block">
                  {credit ? (
                    <>
                      <p className="text-sm text-[#64748B]">Limit</p>
                      <p className="font-semibold text-[#1F2933]">${formatMoney(limitVal)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-[#64748B]">Account</p>
                      <p className="font-semibold text-[#1F2933]">—</p>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(card)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4 text-[#64748B]" />
                  </button>
                  <button
                    onClick={() => onDelete(card)}
                    className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpenModal(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-w-md bg-white rounded-3xl p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-[#1F2933]">
                {editing ? "Edit Card" : "Add Card"}
              </h2>
              <button
                onClick={() => setOpenModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* preview */}
            <div className={`relative h-24 rounded-2xl bg-gradient-to-br ${cardColorToGradient(color)} p-4 mb-6 overflow-hidden`}>
              <div className="absolute -right-6 -top-6 w-20 h-20 rounded-full bg-white/10" />
              <div className="relative z-10 h-full flex flex-col justify-between text-white">
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-80">{kind === "credit" ? "Credit Card" : "Debit Card"}</p>
                  <CreditCard className="w-5 h-5 opacity-90" />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold truncate max-w-[70%]">{name || "Card name"}</p>
                  <p className="text-sm font-mono">•••• {last4 || "----"}</p>
                </div>
              </div>
            </div>

            <form onSubmit={onSave} className="space-y-5">
              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Type</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setKind("debit")}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      kind === "debit" ? "bg-white text-[#1F2933] shadow-sm" : "text-[#64748B]"
                    }`}
                  >
                    Debit
                  </button>
                  <button
                    type="button"
                    onClick={() => setKind("credit")}
                    className={`py-3 rounded-lg font-medium transition-colors ${
                      kind === "credit" ? "bg-white text-[#1F2933] shadow-sm" : "text-[#64748B]"
                    }`}
                  >
                    Credit
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., BBVA Debit"
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                />
              </div>

              {/* Last 4 */}
              <div>
                <label className="block text-sm font-medium text-[#64748B] mb-2">Last 4 digits</label>
                <input
                  value={last4}
                  onChange={(e) => setLast4(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                  placeholder="1234"
                  className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                />
              </div>

              {/* Brand */}
                <div>
                <label className="block text-sm font-medium text-[#64748B] mb-3">Brand</label>

                <div className="grid grid-cols-4 gap-3">
                    {[
                    { key: "VISA", img: visaLogo },
                    { key: "MASTERCARD", img: mastercardLogo },
                    { key: "AMEX", img: amexLogo },
                    { key: "OTHER", img: null },
                    ].map((b) => {
                    const selected = brand === b.key;

                    return (
                        <button
                        key={b.key}
                        type="button"
                        onClick={() => setBrand(b.key)}
                        className={`h-16 rounded-2xl border flex items-center justify-center transition-all ${
                            selected
                            ? "border-[#2DD4BF] ring-2 ring-[#2DD4BF]/20 bg-white"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                        >
                        {b.img ? (
                            <img
                            src={b.img}
                            alt={b.key}
                            className="h-8 object-contain"
                            />
                        ) : (
                            <span className="text-sm font-medium text-[#64748B]">Other</span>
                        )}
                        </button>
                    );
                    })}
                </div>
                </div>

              {/* Color */}
            <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#64748B]">Color</label>
                <span className="text-xs text-[#94A3B8]">{colorLabel(color)}</span>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
                <div className="flex flex-wrap gap-3">
                {COLOR_OPTIONS.map((opt) => {
                    const selected = color === opt.key;

                    return (
                    <button
                        key={opt.key}
                        type="button"
                        onClick={() => setColor(opt.key)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        selected
                            ? "ring-2 ring-[#2DD4BF] ring-offset-2 ring-offset-gray-50 scale-[1.02]"
                            : "hover:scale-[1.02]"
                        }`}
                        title={opt.label}
                        aria-label={`Select color ${opt.label}`}
                    >
                        <span
                        className={`w-8 h-8 rounded-full ${opt.dot} shadow-sm`}
                        />
                    </button>
                    );
                })}
                </div>

                {/* Preview mini */}
                <div className="mt-3 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cardColorToGradient(color)} shadow-sm`} />
                <div className="min-w-0">
                    <p className="text-sm font-medium text-[#1F2933] truncate">Selected: {colorLabel(color)}</p>
                    <p className="text-xs text-[#64748B] truncate">Used to style your card in CreditCards</p>
                </div>
                </div>
            </div>
            </div>

              {/* Credit fields */}
              {kind === "credit" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#64748B] mb-2">Credit Limit</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]">$</span>
                      <input
                      inputMode="decimal"
                      value={
                        limit
                          ? formatMoney(Number(limit))
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value.replace(/,/g, "");

                        // Solo números y decimal
                        if (!/^\d*\.?\d*$/.test(raw)) return;

                        setLimit(raw);
                      }}
                      placeholder="e.g., 50,000"
                      className="w-full pl-8 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                    />
                    </div>
                    <p className="text-xs text-[#94A3B8] mt-2">
                      Tip: you can type “50000” (formatting is applied in display, not saved).
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-[#64748B] mb-2">Closing day</label>
                      <input
                        inputMode="numeric"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                        placeholder="e.g., 20"
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#64748B] mb-2">Due day</label>
                      <input
                        inputMode="numeric"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
                        placeholder="e.g., 5"
                        className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-[#2DD4BF] text-white font-semibold rounded-xl hover:bg-[#14B8A6] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Card"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}