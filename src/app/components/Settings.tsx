import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { User, DollarSign, Download, Tag, LogOut, CreditCard, Pencil, Lock } from "lucide-react";
import { LoadingScreen } from "./LoadingScreen";
import "../../styles/components/Settings.css";

type MeResponse = {
  id: string | number;
  full_name: string | null;
  email: string;
  currency?: "MXN" | "USD";
};

export function Settings() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const location = useLocation();
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currency, setCurrency] = useState<"MXN" | "USD">("MXN");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isProfileTab = location.pathname.endsWith("/settings/profile");
  const activeSettingsTab = isProfileTab ? "profile" : "general";

  function onLogout() {
    localStorage.removeItem("leofy_token");
    localStorage.removeItem("leofy_user");
    window.location.href = "/login";
  }

  async function loadMe() {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        setError("No hay token. Inicia sesion de nuevo.");
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "GET",
        headers: authHeaders,
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        throw new Error(msg || "No se pudo obtener el perfil.");
      }

      const data: MeResponse = await res.json();
      setMe(data);
      setFullName(data.full_name ?? "");
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

  async function onSaveProfileName() {
    try {
      setProfileSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          full_name: fullName,
        }),
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        throw new Error(msg || "No se pudieron guardar los cambios.");
      }

      const updated: MeResponse = await res.json();
      setMe(updated);
      setFullName(updated.full_name ?? "");
      setEmail(updated.email ?? "");
      if (updated.currency) setCurrency(updated.currency);

      try {
        const raw = localStorage.getItem("leofy_user");
        const parsed = raw ? JSON.parse(raw) : {};
        const nextUser = {
          ...parsed,
          ...updated,
          full_name: updated.full_name ?? parsed?.full_name ?? "",
          name: updated.full_name ?? parsed?.name ?? "",
          email: updated.email ?? parsed?.email ?? "",
        };
        localStorage.setItem("leofy_user", JSON.stringify(nextUser));
      } catch {
        // ignore local cache sync errors
      }
      setSuccessMessage("Your name was updated.");
    } catch (e: any) {
      setError(e?.message || "Error al guardar.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function onSavePassword() {
    if (!currentPassword) {
      setError("Enter your current password.");
      setSuccessMessage(null);
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      setSuccessMessage(null);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new password confirmation does not match.");
      setSuccessMessage(null);
      return;
    }

    try {
      setPasswordSaving(true);
      setError(null);
      setSuccessMessage(null);

      const res = await fetch(`${API_BASE}/api/auth/me/password`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (!res.ok) {
        const msg = await safeReadError(res);
        throw new Error(msg || "No se pudo actualizar la contraseña.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccessMessage("Your password was updated.");
    } catch (e: any) {
      setError(e?.message || "Error al cambiar la contraseña.");
    } finally {
      setPasswordSaving(false);
    }
  }

  function onCancelProfileEdit() {
    setFullName(me?.full_name ?? "");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccessMessage(null);
  }

  if (loading) {
    return (
      <LoadingScreen
        title="Settings"
        message="Loading your profile and preferences..."
      />
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Settings</h1>
          <p className="settings-subtitle">Manage your account and preferences</p>
        </div>

        <button
          onClick={onLogout}
          className="settings-logout-btn"
          title="Cerrar sesion"
        >
          <LogOut className="settings-logout-icon" />
          Cerrar sesion
        </button>
      </div>

      {error && (
        <div className="settings-status-box">
          <p className="settings-error-text">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="settings-status-box">
          <p className="settings-success-text">{successMessage}</p>
        </div>
      )}

      <div className="settings-tab-row">
        <Link
          to="/settings"
          className={`settings-tab-link ${activeSettingsTab === "general" ? "settings-tab-link-active" : ""}`}
        >
          General
        </Link>
        <Link
          to="/settings/profile"
          className={`settings-tab-link ${activeSettingsTab === "profile" ? "settings-tab-link-active" : ""}`}
        >
          Edit Profile
        </Link>
      </div>

      {!isProfileTab ? (
        <>
          <div className="settings-card">
            <div className="settings-profile-head">
              <h3 className="settings-section-title">
                <User className="settings-section-icon" />
                Profile
              </h3>
              <Link
                to="/settings/profile"
                className="settings-profile-edit-btn"
                title="Edit profile"
              >
                <Pencil className="settings-profile-edit-icon" />
                Edit
              </Link>
            </div>

            <div className="settings-stack">
              <div>
                <p className="settings-label">Full Name</p>
                <p className="settings-value-text">{me?.full_name?.trim() || "No name set"}</p>
              </div>

              <div>
                <p className="settings-label">Email</p>
                <p className="settings-value-text">{me?.email || "-"}</p>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-section-title">
              <DollarSign className="settings-section-icon" />
              Currency
            </h3>
            <div>
              <label className="settings-label">Preferred Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as "MXN" | "USD")}
                className="settings-input"
              >
                <option value="MXN">MXN - Peso mexicano</option>
                <option value="USD">USD - US Dollar</option>
              </select>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-section-title">
              <CreditCard className="settings-section-icon" />
              Cards & Accounts
            </h3>

            <p className="settings-text settings-text-gap">
              Manage your debit and credit accounts: add, edit, delete, and update limits.
            </p>

            <Link
              to="/cards/manage"
              className="settings-manage-link"
            >
              Manage Cards
            </Link>
          </div>

          <div className="settings-card">
            <h3 className="settings-section-title">
              <Tag className="settings-section-icon" />
              Categories
            </h3>
            <p className="settings-text settings-text-gap">
              Manage your categories in a dedicated tab to keep Settings clean.
            </p>
            <Link
              to="/settings/categories"
              className="settings-manage-link"
            >
              Open Categories
            </Link>
          </div>

          <div className="settings-card">
            <h3 className="settings-section-title">
              <Download className="settings-section-icon" />
              Export Data
            </h3>
            <p className="settings-text settings-text-gap">
              Download your financial data in CSV or PDF format.
            </p>
            <div className="settings-export-row">
              <button className="settings-export-btn">Export as CSV</button>
              <button className="settings-export-btn">Export as PDF</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="settings-card">
            <h3 className="settings-section-title">
              <User className="settings-section-icon" />
              Update Name
            </h3>
            <div className="settings-stack">
              <div>
                <label className="settings-label">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="settings-input"
                />
              </div>
              <div>
                <label className="settings-label">Email</label>
                <p className="settings-value-text">{email || "-"}</p>
              </div>
              <div className="settings-button-row">
                <button
                  onClick={onSaveProfileName}
                  disabled={profileSaving}
                  className="settings-primary-btn"
                >
                  {profileSaving ? "Saving..." : "Save Name"}
                </button>
                <Link
                  to="/settings"
                  onClick={onCancelProfileEdit}
                  className="settings-secondary-btn"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>

          <div className="settings-card">
            <h3 className="settings-section-title">
              <Lock className="settings-section-icon" />
              Change Password
            </h3>
            <div className="settings-stack">
              <div>
                <label className="settings-label">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="settings-input"
                />
              </div>
              <div>
                <label className="settings-label">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="settings-input"
                />
              </div>
              <div>
                <label className="settings-label">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="settings-input"
                />
              </div>
              <div className="settings-button-row">
                <button
                  onClick={onSavePassword}
                  disabled={passwordSaving}
                  className="settings-primary-btn"
                >
                  {passwordSaving ? "Saving..." : "Update Password"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="settings-card settings-card-last">
        <h3 className="settings-about-title">About Leofy</h3>
        <div className="settings-about-head">
          <div className="settings-about-logo">
            <span className="settings-about-logo-letter">L</span>
          </div>
          <div>
            <p className="settings-about-name">Leofy</p>
            <p className="settings-about-version">Version 1.0.0</p>
          </div>
        </div>
        <p className="settings-about-text">
          Leofy is your personal finance companion, designed to help you track income,
          expenses, and credit cards with clarity and ease. Stay on top of your financial
          health without the stress.
        </p>
        <div className="settings-about-links">
          <a href="#" className="settings-about-link">Privacy Policy</a>
          <a href="#" className="settings-about-link">Terms of Service</a>
          <a href="#" className="settings-about-link">Contact Support</a>
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
