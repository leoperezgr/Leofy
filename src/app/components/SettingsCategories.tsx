import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Tag } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { categories as baseCategories } from "../utils/mockData";
import "../../styles/components/Settings.css";

type CategoryType = "income" | "expense";

type ManagedCategory = {
  id: string;
  name: string;
  icon: string;
  type: CategoryType;
  aliases?: string[];
};

const CATEGORY_STORAGE_KEY = "leofy_settings_categories_v1";
const ICON_OPTIONS = [
  "Tag",
  "ShoppingCart",
  "Utensils",
  "UtensilsCrossed",
  "Coffee",
  "Pizza",
  "Sandwich",
  "Store",
  "StoreIcon",
  "Car",
  "Bus",
  "Bike",
  "Plane",
  "TrainFront",
  "Fuel",
  "ShoppingBag",
  "Gift",
  "Package",
  "Receipt",
  "FileText",
  "BadgeDollarSign",
  "Heart",
  "Dumbbell",
  "Pill",
  "Film",
  "Gamepad2",
  "Music4",
  "Laptop",
  "Smartphone",
  "Monitor",
  "Wallet",
  "TrendingUp",
  "Briefcase",
  "PiggyBank",
  "Landmark",
  "Banknote",
  "Coins",
  "Home",
  "HousePlus",
  "Shield",
  "GraduationCap",
  "BookOpen",
  "Sparkles",
  "Wrench",
  "Hammer",
  "MoreHorizontal",
] as const;

function formatIconLabel(iconName: string) {
  return iconName.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
}

export const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<ManagedCategory, "name" | "icon" | "type">> = [
  { name: "Groceries", icon: "ShoppingCart", type: "expense" },
  { name: "Dining", icon: "Utensils", type: "expense" },
  { name: "Coffee", icon: "Coffee", type: "expense" },
  { name: "Transportation", icon: "Car", type: "expense" },
  { name: "Shopping", icon: "ShoppingBag", type: "expense" },
  { name: "Bills & Subscriptions", icon: "Receipt", type: "expense" },
  { name: "Health & Personal", icon: "Heart", type: "expense" },
];

export function getCategoryIconName(name: string) {
  const normalized = String(name || "").trim().toLowerCase();

  if (normalized.includes("grocery")) return "ShoppingCart";
  if (normalized.includes("dining") || normalized.includes("food") || normalized.includes("restaurant")) return "Utensils";
  if (normalized.includes("coffee")) return "Coffee";
  if (normalized.includes("transport") || normalized.includes("gas") || normalized.includes("car")) return "Car";
  if (normalized.includes("shop")) return "ShoppingBag";
  if (normalized.includes("bill") || normalized.includes("subscription")) return "Receipt";
  if (normalized.includes("health") || normalized.includes("personal")) return "Heart";

  const fromBase = baseCategories.find((cat) => cat.name.trim().toLowerCase() === normalized);
  return fromBase?.icon || "Tag";
}

export function SettingsCategories() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
  const token = useMemo(() => localStorage.getItem("leofy_token") || "", []);
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token]
  );

  const [managedCategories, setManagedCategories] = useState<ManagedCategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>("Tag");
  const [categoryViewType, setCategoryViewType] = useState<CategoryType>("expense");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoriesHydrated, setCategoriesHydrated] = useState(false);

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  const defaultManagedCategories = useMemo<ManagedCategory[]>(
    () => {
      const defaultIncomeCategories = baseCategories.filter((c) => c.type === "income");
      const combined = [...DEFAULT_EXPENSE_CATEGORIES, ...defaultIncomeCategories];

      return combined.map((c, idx) => ({
        id: `base-${idx}-${c.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: c.name,
        icon: c.icon,
        type: c.type,
        aliases: [],
      }));
    },
    []
  );

  const visibleCategories = useMemo(
    () => managedCategories.filter((c) => c.type === categoryViewType),
    [managedCategories, categoryViewType]
  );
  const activeUsedCount = useMemo(
    () => visibleCategories.filter((category) => getUsageForCategory(category) > 0).length,
    [visibleCategories, categoryCounts]
  );

  useEffect(() => {
    let cancelled = false;

    const parseLocalCache = () => {
      try {
        const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];

        return parsed
          .map((c: any): ManagedCategory | null => {
            const name = String(c?.name || "").trim();
            if (!name) return null;

            return {
              id: String(c?.id || ""),
              name,
              icon: String(c?.icon || getCategoryIconName(name)),
              type: c?.type === "income" ? "income" : "expense",
              aliases: Array.isArray(c?.aliases)
                ? c.aliases.map((a: any) => String(a || "").trim()).filter((a: string) => a.length > 0)
                : [],
            };
          })
          .filter((c: ManagedCategory | null): c is ManagedCategory => Boolean(c));
      } catch {
        return [];
      }
    };

    (async () => {
      const localCache = parseLocalCache();
      const localByKey = new Map(localCache.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));

      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          method: "GET",
          headers: authHeaders,
        });
        const data = await res.json().catch(() => []);

        if (!res.ok) throw new Error("Failed to load categories");

        const normalized = Array.isArray(data)
          ? data
              .map((item: any, index: number): ManagedCategory | null => {
                const name = String(item?.name || "").trim();
                if (!name) return null;

                const type = String(item?.type || "").toUpperCase() === "INCOME" ? "income" : "expense";
                const cacheHit = localByKey.get(`${type}:${name.toLowerCase()}`);

                return {
                  id: String(item?.id || cacheHit?.id || `remote-${index}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
                  name,
                  icon: cacheHit?.icon || getCategoryIconName(name),
                  type,
                  aliases: cacheHit?.aliases || [],
                };
              })
              .filter((item: ManagedCategory | null): item is ManagedCategory => Boolean(item))
          : [];

        const next = normalized.length > 0 ? normalized : defaultManagedCategories;
        if (!cancelled) {
          setManagedCategories(next);
          setCategoriesHydrated(true);
        }
      } catch {
        const fallback = localCache.length > 0 ? localCache : defaultManagedCategories;
        if (!cancelled) {
          setManagedCategories(fallback);
          setCategoriesHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [API_BASE, authHeaders, defaultManagedCategories]);

  useEffect(() => {
    if (!categoriesHydrated) return;

    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(managedCategories));

    (async () => {
      try {
        await fetch(`${API_BASE}/api/categories`, {
          method: "PUT",
          headers: authHeaders,
          body: JSON.stringify({
            categories: managedCategories.map((category) => ({
              name: category.name,
              type: category.type,
            })),
          }),
        });
      } catch {
        // Keep local cache even if sync fails.
      }
    })();
  }, [API_BASE, authHeaders, categoriesHydrated, managedCategories]);

  useEffect(() => {
    (async () => {
      try {
        const txRes = await fetch(`${API_BASE}/api/transactions`, {
          method: "GET",
          headers: authHeaders,
        });
        const txData = await txRes.json().catch(() => []);
        if (txRes.ok && Array.isArray(txData)) {
          const counts = txData.reduce((acc: Record<string, number>, t: any) => {
            const rawCategory =
              (typeof t?.category === "string" ? t.category : "") ||
              (typeof t?.category_name === "string" ? t.category_name : "") ||
              (typeof t?.metadata?.category_name === "string" ? t.metadata.category_name : "");
            const key = (String(rawCategory || "Uncategorized").trim() || "Uncategorized").toLowerCase();
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          setCategoryCounts(counts);
        } else {
          setCategoryCounts({});
        }
      } catch {
        setCategoryCounts({});
      }
    })();
  }, [API_BASE, authHeaders]);

  function resetEditor() {
    setEditingCategoryId(null);
    setNewCategoryName("");
    setNewCategoryIcon("Tag");
    setCategoryError(null);
  }

  function startEditCategory(category: ManagedCategory) {
    setEditingCategoryId(category.id);
    setNewCategoryName(category.name);
    setNewCategoryIcon(category.icon);
    setCategoryViewType(category.type);
    setCategoryError(null);
  }

  function onSubmitCategory() {
    const name = newCategoryName.trim();
    if (name.length < 2) {
      setCategoryError("Category name must have at least 2 characters.");
      return;
    }

    const exists = managedCategories.some(
      (c) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingCategoryId
    );
    if (exists) {
      setCategoryError("That category already exists.");
      return;
    }

    if (editingCategoryId) {
      setManagedCategories((prev) =>
        prev
          .map((c) =>
            c.id === editingCategoryId
              ? {
                  ...c,
                  name,
                  icon: newCategoryIcon,
                  type: categoryViewType,
                  aliases:
                    c.name.toLowerCase() === name.toLowerCase()
                      ? c.aliases || []
                      : Array.from(new Set([...(c.aliases || []), c.name])),
                }
              : c
          )
          .sort((a, b) => {
            if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
      );
      resetEditor();
      return;
    }

    const next: ManagedCategory = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      icon: newCategoryIcon,
      type: categoryViewType,
      aliases: [],
    };

    setManagedCategories((prev) =>
      [...prev, next].sort((a, b) => {
        if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
    );
    resetEditor();
  }

  function onDeleteCategory(categoryId: string) {
    setManagedCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }

  function getUsageForCategory(category: ManagedCategory) {
    const keys = [category.name, ...(category.aliases || [])]
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean);
    return keys.reduce((sum, k) => sum + (categoryCounts[k] || 0), 0);
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1 className="settings-title">Categories</h1>
          <p className="settings-subtitle">Create and organize your income and expense categories</p>
        </div>
        <Link to="/settings" className="settings-manage-link">
          <ArrowLeft className="settings-section-icon" />
          Back to Settings
        </Link>
      </div>

      <div className="settings-card settings-card-last">
        <h3 className="settings-section-title">
          <Tag className="settings-section-icon" />
          Manage Categories
        </h3>
        <p className="settings-text settings-text-gap">
          Keep your categories organized with cleaner labels, better icons, and a layout that makes editing faster.
        </p>

        <div className="settings-category-toolbar">
          <div className="settings-category-view-row">
            <button
              type="button"
              onClick={() => setCategoryViewType("expense")}
              className={`settings-category-type-btn ${
                categoryViewType === "expense" ? "settings-category-type-btn-active" : ""
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setCategoryViewType("income")}
              className={`settings-category-type-btn ${
                categoryViewType === "income" ? "settings-category-type-btn-active" : ""
              }`}
            >
              Income
            </button>
          </div>

          <div className="settings-category-summary">
            <div className="settings-category-summary-chip">
              <span className="settings-category-summary-value">{visibleCategories.length}</span>
              <span className="settings-category-summary-label">Visible</span>
            </div>
            <div className="settings-category-summary-chip">
              <span className="settings-category-summary-value">{activeUsedCount}</span>
              <span className="settings-category-summary-label">In Use</span>
            </div>
            <div className="settings-category-summary-chip">
              <span className="settings-category-summary-value">{editingCategoryId ? "Edit" : "New"}</span>
              <span className="settings-category-summary-label">Mode</span>
            </div>
          </div>
        </div>

        <div className="settings-category-layout">
          <div className="settings-category-editor settings-category-editor-pro">
            <div className="settings-category-editor-head">
              <div>
                <p className="settings-category-editor-title">
                  {editingCategoryId ? "Edit Category" : "Create Category"}
                </p>
                <p className="settings-category-editor-subtitle">
                  Choose a clear name and a more recognizable icon for faster selection later.
                </p>
              </div>
              <div className="settings-category-preview">
                <div className="settings-category-preview-icon">
                  {(() => {
                    const PreviewIcon = getIconComponent(newCategoryIcon);
                    return <PreviewIcon className="settings-category-preview-icon-svg" />;
                  })()}
                </div>
                <div>
                  <p className="settings-category-preview-name">
                    {newCategoryName.trim() || "Category Preview"}
                  </p>
                  <p className="settings-category-preview-type">
                    {categoryViewType === "expense" ? "Expense category" : "Income category"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="settings-label">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. Travel"
                className="settings-input settings-category-name-input"
              />
            </div>

            <div>
              <label className="settings-label">Icon Library</label>
              <p className="settings-category-hint">Pick an icon that makes the category easy to scan.</p>
              <div className="settings-icon-grid settings-icon-grid-expanded">
                {ICON_OPTIONS.map((iconName) => {
                  const Icon = getIconComponent(iconName);
                  const active = newCategoryIcon === iconName;
                  return (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setNewCategoryIcon(iconName)}
                      className={`settings-icon-option ${active ? "settings-icon-option-active" : ""}`}
                      title={formatIconLabel(iconName)}
                    >
                      <Icon className="settings-icon-option-icon" />
                      <span className="settings-icon-option-label">{formatIconLabel(iconName)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {categoryError && <p className="settings-error-text">{categoryError}</p>}

            <div className="settings-category-action-row">
              <button
                type="button"
                onClick={onSubmitCategory}
                className="settings-primary-btn"
              >
                {editingCategoryId ? "Save Category" : "Add Category"}
              </button>
              {editingCategoryId && (
                <button
                  type="button"
                  onClick={resetEditor}
                  className="settings-secondary-btn"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </div>

          <div className="settings-category-panel">
            <div className="settings-category-panel-head">
              <div>
                <p className="settings-category-panel-title">
                  {categoryViewType === "expense" ? "Expense Categories" : "Income Categories"}
                </p>
                <p className="settings-category-panel-subtitle">
                  Click any row to edit it. Delete only categories you no longer need.
                </p>
              </div>
              <span className="settings-category-panel-badge">
                {visibleCategories.length} total
              </span>
            </div>

            <div className="settings-category-list settings-category-list-pro">
              {visibleCategories.map((category) => {
                const Icon = getIconComponent(category.icon);
                const usage = getUsageForCategory(category);
                return (
                  <div
                    key={category.id}
                    className={`settings-category-row settings-category-row-clickable ${
                      editingCategoryId === category.id ? "settings-category-row-active" : ""
                    }`}
                    onClick={() => startEditCategory(category)}
                  >
                    <div className="settings-category-left">
                      <div className="settings-category-icon-wrap">
                        <Icon className="settings-category-icon" />
                      </div>
                      <div>
                        <span className="settings-category-name">{category.name}</span>
                        <p className="settings-category-row-subtext">
                          {usage > 0 ? `${usage} linked transaction${usage === 1 ? "" : "s"}` : "Not used yet"}
                        </p>
                      </div>
                    </div>
                    <div className="settings-category-actions">
                      <span className="settings-category-usage-pill">{usage} uses</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCategory(category.id);
                        }}
                        className="settings-category-delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleCategories.length === 0 && (
                <div className="settings-category-empty">
                  <span className="settings-category-meta">No categories in this type yet.</span>
                  <span className="settings-category-empty-subtext">Create one from the editor to get started.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
