import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { categories } from '../utils/mockData';
import * as LucideIcons from 'lucide-react';
import { formatMoney } from '../utils/formatMoney';
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

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps) {
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
  const [cardsLoading, setCardsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const isCreditCard = (c: Card) => {
  const n = Number((c as any).credit_limit ?? (c as any).limit ?? 0);
    return Number.isFinite(n) && n > 0;
  };

  const creditCardsOnly = cards.filter(isCreditCard);
  const debitCardsOnly = cards.filter((c) => !isCreditCard(c));

  const filteredCategories = categories.filter((cat) =>
    cat.type === (type === 'transfer' ? 'expense' : type)
  );

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

      const headers = authHeaders();
      headers.set('Content-Type', 'application/json');

      // ✅ TRANSFER
      if (type === 'transfer') {
        if (!cardId) {
          alert('Please select FROM debit account');
          return;
        }
        if (!toCardId) {
          alert('Please select TO account');
          return;
        }
        if (!debitCardsOnly.some((c) => c.id === cardId)) {
          alert('FROM account must be a debit account');
          return;
        }
        if (cardId === toCardId) {
          alert('FROM and TO accounts must be different');
          return;
        }

        const transferPayload = {
          fromCardId: cardId,
          toCardId,
          amount: amountNum,
          description: desc || 'Transfer',
          date: new Date().toISOString(),
        };

        const res = await fetch(`${API_BASE}/api/transfers`, {
          method: 'POST',
          headers,
          body: JSON.stringify(transferPayload),
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to create transfer');

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
      const finalCategory = category === 'Other' ? customCategory.trim() : category;
      if (!finalCategory) {
        alert('Please enter a category');
        return;
      }
      if ((paymentMethod === 'credit' || paymentMethod === 'debit') && !cardId) {
        alert('Please select a card/account');
        return;
      }

      const payload = {
        type, // "income" | "expense"
        amount: amountNum,
        category: finalCategory,
        description: desc || finalCategory,
        date: new Date().toISOString(),
        card_id: paymentMethod === 'cash' ? null : cardId || null,
        paymentMethod,
        metadata: {
          paymentMethod,
          ...(purchaseType === 'installments'
            ? {
                installments: {
                  months: installmentMonths,
                  monthlyAmount: round2(amountNum / installmentMonths),
                },
              }
            : {}),
        },
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
    return Icon || LucideIcons.Circle;
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
                  From (Debit Account)
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
                      key={cat.name}
                      type="button"
                      onClick={() => setCategory(cat.name)}
                      className={`atm-category-button ${
                        category === cat.name
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

          {type !== 'transfer' && category === 'Other' && (
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
