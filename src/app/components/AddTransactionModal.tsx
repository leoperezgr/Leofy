import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { categories as mockCategories } from '../utils/mockData';
import * as LucideIcons from 'lucide-react';
import { formatMoney } from '../utils/formatMoney';
import { useAppDate } from '../contexts/AppDateContext';
import '../../styles/components/AddTransactionModal.css';

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

type Card = {
  id: string;
  name: string;
  last4: string;
  brand?: string;
  limit?: number;
};

type UiCategory = {
  id: string;
  name: string;
  icon: string;
  type: 'EXPENSE' | 'INCOME';
  source: 'api' | 'managed' | 'default' | 'mock';
};

type ApiCategory = {
  id?: string | number;
  name?: string | null;
  type?: string | null;
};

const DEFAULT_EXPENSE_CATEGORIES: UiCategory[] = [
  { id: 'default_groceries', name: 'Groceries', icon: 'ShoppingCart', type: 'EXPENSE', source: 'default' },
  { id: 'default_dining', name: 'Dining', icon: 'Utensils', type: 'EXPENSE', source: 'default' },
  { id: 'default_coffee', name: 'Coffee', icon: 'Coffee', type: 'EXPENSE', source: 'default' },
  { id: 'default_transportation', name: 'Transportation', icon: 'Car', type: 'EXPENSE', source: 'default' },
  { id: 'default_shopping', name: 'Shopping', icon: 'ShoppingBag', type: 'EXPENSE', source: 'default' },
  { id: 'default_bills', name: 'Bills & Subscriptions', icon: 'Receipt', type: 'EXPENSE', source: 'default' },
  { id: 'default_health', name: 'Health & Personal', icon: 'Heart', type: 'EXPENSE', source: 'default' },
];

const CATEGORY_STORAGE_KEY = 'leofy_settings_categories_v1';
const APP_DATE_OVERRIDE_KEY = 'leofy_app_date_override';

const DEFAULT_INCOME_CATEGORIES: UiCategory[] = mockCategories
  .filter((cat) => cat.type === 'income')
  .map((cat) => ({
    id: `mock_${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: cat.name,
    icon: cat.icon,
    type: 'INCOME' as const,
    source: 'mock' as const,
  }));

function normalizeCategoryType(value: unknown): UiCategory['type'] {
  return String(value || '').toUpperCase() === 'INCOME' ? 'INCOME' : 'EXPENSE';
}

function getCategoryIconName(name: string) {
  const normalized = String(name || '').trim().toLowerCase();

  if (normalized.includes('grocery')) return 'ShoppingCart';
  if (normalized.includes('dining') || normalized.includes('food') || normalized.includes('restaurant')) return 'Utensils';
  if (normalized.includes('coffee')) return 'Coffee';
  if (normalized.includes('transport') || normalized.includes('gas') || normalized.includes('car')) return 'Car';
  if (normalized.includes('shop')) return 'ShoppingBag';
  if (normalized.includes('bill') || normalized.includes('subscription')) return 'Receipt';
  if (normalized.includes('health') || normalized.includes('personal')) return 'Heart';

  const fromMock = mockCategories.find((cat) => cat.name.trim().toLowerCase() === normalized);
  return fromMock?.icon || 'Tag';
}

function normalizeApiCategory(item: ApiCategory): UiCategory | null {
  const name = String(item?.name || '').trim();
  if (!name) return null;

  return {
    id: String(item?.id ?? name),
    name,
    icon: getCategoryIconName(name),
    type: normalizeCategoryType(item?.type),
    source: 'api',
  };
}

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps) {
  const { getAppDate } = useAppDate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const INSTALLMENT_OPTIONS = [3, 6, 9, 12, 18] as const;

  const [type, setType] = useState<'income' | 'expense' | 'transfer'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit'>('credit');
  const [purchaseType, setPurchaseType] = useState<'one_time' | 'installments'>('one_time');
  const [installmentMonths, setInstallmentMonths] = useState<number>(12);
  const [cardId, setCardId] = useState(''); // credit card selection OR transfer fromCardId
  const [toCardId, setToCardId] = useState(''); // transfer toCardId
  const [description, setDescription] = useState('');
  const [customCategory, setCustomCategory] = useState('');

  const [cards, setCards] = useState<Card[]>([]);
  const [apiCategories, setApiCategories] = useState<UiCategory[]>([]);
  const [managedCategories, setManagedCategories] = useState<UiCategory[]>([]);
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});
  const [cardsLoading, setCardsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const isCreditCard = (c: Card) => {
  const n = Number((c as any).credit_limit ?? (c as any).limit ?? 0);
    return Number.isFinite(n) && n > 0;
  };

  const creditCardsOnly = cards.filter(isCreditCard);
  const debitCardsOnly = cards.filter((c) => !isCreditCard(c));

  const filteredCategories = useMemo(() => {
    if (type === 'transfer') return [];

    const desiredType = type === 'income' ? 'INCOME' : 'EXPENSE';
    const managedMatches = managedCategories.filter((cat) => cat.type === desiredType);
    const apiMatches = apiCategories.filter((cat) => cat.type === desiredType);
    const baseCategories =
      apiMatches.length > 0
        ? apiMatches
        : managedMatches.length > 0
          ? managedMatches
          : desiredType === 'EXPENSE'
            ? DEFAULT_EXPENSE_CATEGORIES
            : DEFAULT_INCOME_CATEGORIES;

    return [...baseCategories].sort((a, b) => {
      const aUsage = categoryUsage[a.name.trim().toLowerCase()] || 0;
      const bUsage = categoryUsage[b.name.trim().toLowerCase()] || 0;

      if (aUsage !== bUsage) return bUsage - aUsage;
      return a.name.localeCompare(b.name);
    });
  }, [managedCategories, apiCategories, categoryUsage, type]);

  const selectedCategory = useMemo(() => {
    return (
      filteredCategories.find((cat) => cat.id === category) ||
      filteredCategories.find((cat) => cat.name === category) ||
      null
    );
  }, [filteredCategories, category]);

  // --- Amount formatter (commas + up to 2 decimals) ---
  const formatAmount = (value: string) => {
    if (!value) return '';

    const cleaned = value.replace(/,/g, '');
    if (!cleaned) return '';

    const [integer, decimal] = cleaned.split('.');

    const formattedInteger = new Intl.NumberFormat('en-US').format(Number(integer || 0));

    if (decimal !== undefined) return `${formattedInteger}.${decimal}`;
    return formattedInteger;
  };

  const handleAmountChange = (value: string) => {
    let cleaned = value.replace(/[^\d.]/g, '');

    const parts = cleaned.split('.');
    if (parts.length > 2) return;

    if (parts[1]?.length > 2) parts[1] = parts[1].slice(0, 2);

    cleaned = parts.join('.');
    setAmount(cleaned);
  };

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const getTransactionDateIso = () => {
    if (typeof window === 'undefined') return undefined;
    const rawOverride = window.localStorage.getItem(APP_DATE_OVERRIDE_KEY);
    if (!rawOverride) return undefined;

    const parsed = new Date(rawOverride);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return parsed.toISOString();
  };

  const authHeaders = (): Headers => {
    const token = localStorage.getItem('leofy_token');
    const h = new Headers();
    if (token) h.set('Authorization', `Bearer ${token}`);
    return h;
  };

  // Load cards when modal opens (used for credit selection and transfer accounts)
  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setCardsLoading(true);
        const res = await fetch(`${API_BASE}/api/cards`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || 'Failed to load cards');
        setCards(Array.isArray(data) ? data : []);
      } catch {
        setCards([]);
      } finally {
        setCardsLoading(false);
      }
    })();
  }, [open, API_BASE]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/transactions`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || 'Failed to load transactions');

        const rawList: any[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
            ? data.transactions
            : Array.isArray(data?.recentTransactions)
              ? data.recentTransactions
              : [];

        const counts = rawList.reduce((acc: Record<string, number>, item: any) => {
          const rawCategory =
            (typeof item?.category === 'string' ? item.category : '') ||
            (typeof item?.category_name === 'string' ? item.category_name : '') ||
            (typeof item?.metadata?.category_name === 'string' ? item.metadata.category_name : '') ||
            (typeof item?.metadata?.categoryName === 'string' ? item.metadata.categoryName : '');

          const key = String(rawCategory || '').trim().toLowerCase();
          if (!key) return acc;

          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        setCategoryUsage(counts);
      } catch {
        setCategoryUsage({});
      }
    })();
  }, [open, API_BASE]);

  useEffect(() => {
    if (!open) return;

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
          const name = String(item?.name || '').trim();
          if (!name) return null;
          return {
            id: String(item?.id || `managed_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`),
            name,
            icon: String(item?.icon || getCategoryIconName(name)),
            type: String(item?.type || '').toLowerCase() === 'income' ? 'INCOME' : 'EXPENSE',
            source: 'managed' as const,
          };
        })
        .filter((item): item is UiCategory => Boolean(item));

      setManagedCategories(normalized);
    } catch {
      setManagedCategories([]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          headers: authHeaders(),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error || 'Failed to load categories');

        const normalized = Array.isArray(data)
          ? data
              .map((item) => normalizeApiCategory(item as ApiCategory))
              .filter((item): item is UiCategory => Boolean(item))
          : [];

        setApiCategories(normalized);
      } catch {
        setApiCategories([]);
      }
    })();
  }, [open, API_BASE]);

  useEffect(() => {
  if (type === "transfer") {
    setPaymentMethod("debit"); // o "cash", da igual porque no se muestra
    setPurchaseType('one_time');
    setCardId("");
    setToCardId("");
    return;
  }

  if (type === "income") {
    setPaymentMethod("debit");
    setPurchaseType('one_time');
    setCardId("");
    return;
  }

  // expense default a credit
  setPaymentMethod("credit");
  setPurchaseType('one_time');
  setCardId("");
}, [type]);

  useEffect(() => {
    if (type !== 'expense' || paymentMethod !== 'credit') {
      setPurchaseType('one_time');
    }
  }, [type, paymentMethod]);

  useEffect(() => {
    if (type === 'transfer') return;
    if (!category) return;
    if (!selectedCategory) {
      setCategory('');
      setCustomCategory('');
    }
  }, [type, category, selectedCategory]);

  const amountNumPreview = Number(amount);
  const validAmountPreview = Number.isFinite(amountNumPreview) && amountNumPreview > 0 ? amountNumPreview : 0;
  const monthlyPreview =
    purchaseType === 'installments' && installmentMonths > 0
      ? round2(validAmountPreview / installmentMonths)
      : 0;

  const shouldShowPurchaseType = type === 'expense' && paymentMethod === 'credit';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const desc = description.trim();

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    try {
      setSubmitLoading(true);
      const transactionDateIso = getTransactionDateIso();

      const headers = authHeaders();
      headers.set('Content-Type', 'application/json');

      // ✅ TRANSFER
      if (type === 'transfer') {
        if (!cardId) {
          alert('Please select FROM account');
          return;
        }
        if (!toCardId) {
          alert('Please select TO account');
          return;
        }
        if (cardId !== 'cash' && !debitCardsOnly.some((c) => c.id === cardId)) {
          alert('FROM account must be a debit account or cash');
          return;
        }
        if (cardId === toCardId) {
          alert('FROM and TO accounts must be different');
          return;
        }

        // Cash → account: create paired EXPENSE (cash) + INCOME (destination) with shared transfer_id
        if (cardId === 'cash') {
          const transferId = crypto.randomUUID();
          const transferDesc = desc || 'Cash Transfer';

          const outgoingPayload = {
            type: 'expense',
            amount: amountNum,
            category: 'Transfer',
            description: transferDesc,
            ...(transactionDateIso ? { date: transactionDateIso } : {}),
            transfer_id: transferId,
            paymentMethod: 'cash',
            metadata: {
              category_name: 'Transfer',
              paymentMethod: 'cash',
              payment_method: 'cash',
              transferRole: 'outgoing',
              fromCardId: 'cash',
              toCardId,
            },
          };

          const incomingPayload = {
            type: 'income',
            amount: amountNum,
            category: 'Transfer',
            description: transferDesc,
            ...(transactionDateIso ? { date: transactionDateIso } : {}),
            card_id: toCardId,
            transfer_id: transferId,
            paymentMethod: 'debit',
            metadata: {
              category_name: 'Transfer',
              paymentMethod: 'debit',
              payment_method: 'debit',
              transferRole: 'incoming',
              fromCardId: 'cash',
              toCardId,
            },
          };

          const [outRes, inRes] = await Promise.all([
            fetch(`${API_BASE}/api/transactions`, {
              method: 'POST',
              headers,
              body: JSON.stringify(outgoingPayload),
            }),
            fetch(`${API_BASE}/api/transactions`, {
              method: 'POST',
              headers,
              body: JSON.stringify(incomingPayload),
            }),
          ]);

          const outData = await outRes.json().catch(() => null);
          if (!outRes.ok) throw new Error(outData?.error || outData?.message || 'Failed to create cash transfer (outgoing)');
          const inData = await inRes.json().catch(() => null);
          if (!inRes.ok) throw new Error(inData?.error || inData?.message || 'Failed to create cash transfer (incoming)');
        } else {
          const transferPayload = {
            fromCardId: cardId,
            toCardId,
            amount: amountNum,
            description: desc || 'Transfer',
            ...(transactionDateIso ? { date: transactionDateIso } : {}),
          };
          const res = await fetch(`${API_BASE}/api/transfers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(transferPayload),
          });
          const data = await res.json().catch(() => null);
          if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create transfer');
        }

        onClose();
        setTimeout(() => window.location.reload(), 50);

        // Reset
        setAmount('');
        setCategory('');
        setCustomCategory('');
        setDescription('');
        setPaymentMethod('credit');
        setPurchaseType('one_time');
        setInstallmentMonths(12);
        setCardId('');
        setToCardId('');
        return;
      }

      // ✅ NORMAL TRANSACTION (income/expense)
      const isOtherCategory = selectedCategory?.name === 'Other';
      const shouldPersistCategoryMeta =
        selectedCategory?.source === 'default' ||
        selectedCategory?.source === 'managed' ||
        selectedCategory?.source === 'mock';
      const finalCategory = isOtherCategory
        ? customCategory.trim()
        : (selectedCategory?.name || category).trim();
      if (!finalCategory) {
        alert('Please enter a category');
        return;
      }
      if ((paymentMethod === 'credit' || paymentMethod === 'debit') && !cardId) {
        alert('Please select a card/account');
        return;
      }

      const metadata = {
        paymentMethod,
        ...(shouldPersistCategoryMeta && selectedCategory
          ? {
              category: {
                name: selectedCategory.name,
                icon: selectedCategory.icon,
                source: selectedCategory.source,
              },
            }
          : {}),
        ...(purchaseType === 'installments'
          ? {
              installments: {
                months: installmentMonths,
                monthlyAmount: round2(amountNum / installmentMonths),
              },
            }
          : {}),
      };

      const payload = {
        type, // "income" | "expense"
        amount: amountNum,
        category: finalCategory,
        description: desc || finalCategory,
        ...(transactionDateIso ? { date: transactionDateIso } : {}),
        category_id:
          selectedCategory && selectedCategory.source === 'api' && !isOtherCategory ? selectedCategory.id : null,
        card_id: paymentMethod === 'cash' ? null : cardId || null,
        paymentMethod,
        metadata,
      };

      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create transaction');

      onClose();
      setTimeout(() => window.location.reload(), 50);

      // Reset
      setAmount('');
      setCategory('');
      setCustomCategory('');
      setDescription('');
      setPaymentMethod('credit');
      setPurchaseType('one_time');
      setInstallmentMonths(12);
      setCardId('');
      setToCardId('');
    } catch (err: any) {
      alert(err?.message || 'Error creating transaction');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!open) return null;

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Tag;
  };

  return (
    <div className="atm-overlay" onClick={onClose}>
      {/* Backdrop */}
      <div className="atm-backdrop" />

      {/* Modal */}
      <div
        className="atm-modal"
        onClick={(e) => e.stopPropagation()}
      >
      {/* Header */}
        <div className="atm-header">
          <h2 className="atm-title">Add Transaction</h2>
          <button
            onClick={onClose}
            className="atm-close-button"
          >
            <X className="atm-close-icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="atm-form">
          {/* Type Toggle */}
          <div className="atm-type-toggle">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`atm-type-button ${
                type === 'expense' ? 'atm-type-button-active' : 'atm-type-button-inactive'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`atm-type-button ${
                type === 'income' ? 'atm-type-button-active' : 'atm-type-button-inactive'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('transfer')}
              className={`atm-type-button ${
                type === 'transfer' ? 'atm-type-button-active' : 'atm-type-button-inactive'
              }`}
            >
              Transfer
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="atm-label">Amount</label>
            <div className="atm-amount-wrap">
              <span className="atm-currency">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={formatAmount(amount)}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                required
                className="atm-amount-input"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="atm-label">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'transfer' ? 'e.g., Transfer to Savings' : 'e.g., Grocery shopping'}
              className="atm-text-input"
            />
          </div>

          {/* Transfer accounts */}
          {type === 'transfer' && (
            <div className="space-y-4">
              <div>
                <label className="atm-label">
                  From (Debit / Cash)
                </label>

                {cardsLoading ? (
                  <div className="atm-loading-text">Loading accounts…</div>
                ) : (
                  <select
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    required
                    className="atm-select"
                  >
                    <option value="">Select account</option>
                    <option value="cash">Cash</option>
                    {debitCardsOnly.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} •••• {c.last4}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="atm-label">
                  To (Debit/Credit Account)
                </label>

                {cardsLoading ? (
                  <div className="atm-loading-text">Loading accounts…</div>
                ) : (
                  <select
                    value={toCardId}
                    onChange={(e) => setToCardId(e.target.value)}
                    required
                    className="atm-select"
                  >
                    <option value="">Select account</option>
                    {cards
                      .filter((c) => c.id !== cardId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} •••• {c.last4}
                        </option>
                      ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {/* Category (not for transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="atm-label category-label">Category</label>
              <div className="atm-category-grid">
                {filteredCategories.map((cat) => {
                  const IconComponent = getIconComponent(cat.icon);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`atm-category-button ${
                        selectedCategory?.id === cat.id
                          ? 'atm-category-button-active'
                          : 'atm-category-button-inactive'
                      }`}
                    >
                      <IconComponent className="atm-category-icon" />
                      <span className="atm-category-name">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {type !== 'transfer' && selectedCategory?.name === 'Other' && (
            <div>
              <label className="atm-label">Custom Category</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Enter category name"
                required
                className="atm-text-input"
              />
            </div>
          )}

          {/* Payment Method (not for transfer) */}
          {type !== 'transfer' && (
            <div>
              <label className="atm-label category-label">
                {type === 'income' ? 'Payment Received' : 'Payment Method'}
              </label>
              <div className="atm-method-grid">
                {(type === 'income' ? ['debit', 'cash'] : ['credit', 'debit', 'cash']).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method as any)}
                    className={`atm-method-button ${
                      paymentMethod === method
                        ? 'atm-method-button-active'
                        : 'atm-method-button-inactive'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Card Selection (if credit/debit) - not for transfer */}
          {type !== 'transfer' && (paymentMethod === 'credit' || paymentMethod === 'debit') && (
            <div>
              <label className="atm-label category-label">
                {paymentMethod === 'credit' ? 'Select Credit Card' : 'Select Debit Account'}
              </label>

              {cardsLoading ? (
                <div className="atm-loading-text">Loading cards…</div>
              ) : (
                <div className="atm-card-list">
                  {(type === 'income' ? debitCardsOnly : (paymentMethod === 'credit' ? creditCardsOnly : debitCardsOnly)).map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setCardId(card.id)}
                      className={`atm-card-button ${
                        cardId === card.id
                          ? 'atm-card-button-active'
                          : 'atm-card-button-inactive'
                      }`}
                    >
                      <div className="atm-card-row">
                        <span className="atm-card-name">{card.name}</span>
                        <span className="atm-card-last4">•••• {card.last4}</span>
                      </div>
                    </button>
                  ))}

                  {(type === 'income' ? debitCardsOnly : (paymentMethod === 'credit' ? creditCardsOnly : debitCardsOnly)).length === 0 && (
                    <div className="atm-loading-text">
                      {type === 'income'
                        ? 'No debit accounts found.'
                        : paymentMethod === 'credit'
                        ? 'No credit cards found.'
                        : 'No debit accounts found.'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Purchase Type (only expense + credit) */}
          {shouldShowPurchaseType && (
            <div>
              <label className="atm-label category-label">Purchase Type</label>
              <div className="atm-method-grid">
                <button
                  type="button"
                  onClick={() => setPurchaseType('one_time')}
                  className={`atm-method-button ${
                    purchaseType === 'one_time' ? 'atm-method-button-active' : 'atm-method-button-inactive'
                  }`}
                >
                  Contado
                </button>
                <button
                  type="button"
                  onClick={() => setPurchaseType('installments')}
                  className={`atm-method-button ${
                    purchaseType === 'installments' ? 'atm-method-button-active' : 'atm-method-button-inactive'
                  }`}
                >
                  Meses
                </button>
              </div>
            </div>
          )}

          {shouldShowPurchaseType && purchaseType === 'installments' && (
            <div>
              <label className="atm-label category-label">Installments</label>
              <div className="atm-method-grid">
                {INSTALLMENT_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setInstallmentMonths(m)}
                    className={`atm-method-button ${
                      installmentMonths === m ? 'atm-method-button-active' : 'atm-method-button-inactive'
                    }`}
                  >
                    {m} months
                  </button>
                ))}
              </div>
              <p className="atm-loading-text">Monthly: ${formatMoney(monthlyPreview)}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitLoading}
            className="atm-submit-button"
          >
            {submitLoading ? 'Saving…' : type === 'transfer' ? 'Transfer' : 'Add Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
