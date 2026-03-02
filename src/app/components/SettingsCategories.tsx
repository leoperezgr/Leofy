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
  "Store",
  "Car",
  "ShoppingBag",
  "Receipt",
  "Heart",
  "Film",
  "Laptop",
  "Wallet",
  "TrendingUp",
  "MoreHorizontal",
] as const;

const DEFAULT_EXPENSE_CATEGORIES: Array<Pick<ManagedCategory, "name" | "icon" | "type">> = [
  { name: "Groceries", icon: "ShoppingCart", type: "expense" },
  { name: "Dining", icon: "Utensils", type: "expense" },
  { name: "Coffee", icon: "Coffee", type: "expense" },
  { name: "Transportation", icon: "Car", type: "expense" },
  { name: "Shopping", icon: "ShoppingBag", type: "expense" },
  { name: "Bills & Subscriptions", icon: "Receipt", type: "expense" },
  { name: "Health & Personal", icon: "Heart", type: "expense" },
];

export function SettingsCategories() {
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!raw) {
        setManagedCategories(defaultManagedCategories);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setManagedCategories(defaultManagedCategories);
        return;
      }

      const normalized = parsed
        .map((c: any): ManagedCategory => ({
          id: String(c?.id || ""),
          name: String(c?.name || "").trim(),
          icon: String(c?.icon || "Tag"),
          type: (c?.type === "income" ? "income" : "expense") as CategoryType,
          aliases: Array.isArray(c?.aliases)
            ? c.aliases.map((a: any) => String(a || "").trim()).filter((a: string) => a.length > 0)
            : [],
        }))
        .filter((c: ManagedCategory) => c.id && c.name);

      setManagedCategories(normalized.length > 0 ? normalized : defaultManagedCategories);
    } catch {
      setManagedCategories(defaultManagedCategories);
    }
  }, [defaultManagedCategories]);

  useEffect(() => {
    if (managedCategories.length === 0) return;
    localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(managedCategories));
  }, [managedCategories]);

  useEffect(() => {
    (async () => {
      try {
        const txRes = await fetch("http://localhost:4000/api/transactions", {
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
  }, [authHeaders]);

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

        <div className="settings-category-editor">
          <div>
            <label className="settings-label">Category Name</label>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Travel"
              className="settings-input"
            />
          </div>

          <div>
            <label className="settings-label">Icon</label>
            <div className="settings-icon-grid">
              {ICON_OPTIONS.map((iconName) => {
                const Icon = getIconComponent(iconName);
                const active = newCategoryIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setNewCategoryIcon(iconName)}
                    className={`settings-icon-option ${active ? "settings-icon-option-active" : ""}`}
                    title={iconName}
                  >
                    <Icon className="settings-icon-option-icon" />
                  </button>
                );
              })}
            </div>
          </div>

          {categoryError && <p className="settings-error-text">{categoryError}</p>}

          <button
            type="button"
            onClick={onSubmitCategory}
            className="settings-link-btn"
          >
            {editingCategoryId ? "Save Category" : "+ Add New Category"}
          </button>
          {editingCategoryId && (
            <button
              type="button"
              onClick={resetEditor}
              className="settings-secondary-btn"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="settings-category-list">
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
                  </div>
                </div>
                <div className="settings-category-actions">
                  <span className="settings-category-meta">{usage} transactions</span>
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
            <div className="settings-category-row">
              <span className="settings-category-meta">No categories in this type yet.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
