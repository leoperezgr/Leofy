import { useEffect, useMemo, useState } from "react";
import { User, DollarSign, Download, Tag } from "lucide-react";

type MeResponse = {
  id: string | number;
  name: string | null;
  email: string;
  // si tu backend también devuelve currency, puedes mapearla aquí
  currency?: "MXN" | "USD";
};

export function Settings() {
  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // profile data
  const [me, setMe] = useState<MeResponse | null>(null);

  // form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");

  // edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function loadMe() {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError("No hay token. Inicia sesión de nuevo.");
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:4000/api/auth/me", {
        method: "GET",
        headers: authHeaders,
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        throw new Error(msg || "No se pudo obtener el perfil.");
      }

      const data: MeResponse = await res.json();
      setMe(data);

      setFullName(data.name ?? "");
      setEmail(data.email ?? "");
      if (data.currency) setCurrency(data.currency);
    } catch (e: any) {
      setError(e?.message || "Error desconocido.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSaveProfile() {
    try {
      setSaving(true);
      setError(null);

      const res = await fetch("http://localhost:4000/api/auth/me", {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          name: fullName,
          email,
          // si quieres persistir currency también:
          currency,
        }),
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        throw new Error(msg || "No se pudieron guardar los cambios.");
      }

      const updated: MeResponse = await res.json();
      setMe(updated);

      // refresca inputs desde respuesta
      setFullName(updated.name ?? "");
      setEmail(updated.email ?? "");
      if (updated.currency) setCurrency(updated.currency);

      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  function onCancelEdit() {
    // vuelve a estado original
    setFullName(me?.name ?? "");
    setEmail(me?.email ?? "");
    if (me?.currency) setCurrency(me.currency);
    setIsEditing(false);
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Settings</h1>
        <p className="text-[#64748B]">Manage your account and preferences</p>
      </div>

      {/* (Opcional) Estado */}
      {error && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {loading && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6">
          <p className="text-sm text-[#64748B]">Loading profile...</p>
        </div>
      )}

      {/* Profile Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              readOnly={!isEditing}
              disabled={!isEditing}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              readOnly={!isEditing}
              disabled={!isEditing}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          {/* Botones (sin mover estilos existentes: reutilizo las mismas clases) */}
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-[#2DD4BF] text-white rounded-xl hover:bg-[#14B8A6] transition-colors"
            >
              Editar
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={onSaveProfile}
                disabled={saving}
                className="px-6 py-2 bg-[#2DD4BF] text-white rounded-xl hover:bg-[#14B8A6] transition-colors"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={onCancelEdit}
                disabled={saving}
                className="px-6 py-2 bg-gray-50 text-[#1F2933] rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Currency */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Currency
        </h3>
        <div>
          <label className="block text-sm font-medium text-[#64748B] mb-2">
            Preferred Currency
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as "MXN" | "USD")}
            className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
          >
            <option value="MXN">MXN - Peso mexicano</option>
            <option value="USD">USD - US Dollar</option>
          </select>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <Tag className="w-5 h-5" />
          Categories
        </h3>
        <p className="text-sm text-[#64748B] mb-4">
          Manage your transaction categories to better organize your finances.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Food & Dining</span>
            <span className="text-xs text-[#64748B]">15 transactions</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Shopping</span>
            <span className="text-xs text-[#64748B]">8 transactions</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-[#1F2933]">Transport</span>
            <span className="text-xs text-[#64748B]">12 transactions</span>
          </div>
        </div>
        <button className="mt-4 text-[#2DD4BF] hover:text-[#14B8A6] text-sm font-medium">
          + Add New Category
        </button>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </h3>
        <p className="text-sm text-[#64748B] mb-4">
          Download your financial data in CSV or PDF format.
        </p>
        <div className="flex gap-3">
          <button className="flex-1 px-4 py-3 bg-gray-50 text-[#1F2933] rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Export as CSV
          </button>
          <button className="flex-1 px-4 py-3 bg-gray-50 text-[#1F2933] rounded-xl hover:bg-gray-100 transition-colors font-medium">
            Export as PDF
          </button>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4">About Leofy</h3>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] flex items-center justify-center">
            <span className="text-white text-xl font-semibold">L</span>
          </div>
          <div>
            <p className="font-semibold text-[#1F2933]">Leofy</p>
            <p className="text-sm text-[#64748B]">Version 1.0.0</p>
          </div>
        </div>
        <p className="text-sm text-[#64748B] leading-relaxed">
          Leofy is your personal finance companion, designed to help you track income,
          expenses, and credit cards with clarity and ease. Stay on top of your financial
          health without the stress.
        </p>
        <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
            Privacy Policy
          </a>
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
            Terms of Service
          </a>
          <a href="#" className="block text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}

async function safeReadError(res: Response) {
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      return j?.message || j?.error || JSON.stringify(j);
    }
    return await res.text();
  } catch {
    return null;
  }
}