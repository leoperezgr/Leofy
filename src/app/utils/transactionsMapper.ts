// src/app/utils/transactionsMapper.ts

export type ApiTransaction = {
  id: string | number;
  type: 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  amount: number | string;
  description?: string | null;

  occurred_at?: string;
  created_at?: string;
  date?: string;

  category?: string | null;
  category_id?: string | number | null;

  payment_method?: string | null;
  paymentMethod?: string | null;

  metadata?: {
    category_name?: string;
    payment_method?: string;
    paymentMethod?: string;
    [key: string]: any;
  } | null;
};

export type UiTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
};

export function toUiTransaction(t: ApiTransaction): UiTransaction {
  const iso = t.occurred_at || t.created_at || t.date || new Date().toISOString();
  const d = new Date(iso);
  const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const rawType = String(t.type || '').toUpperCase();
  const uiType: 'income' | 'expense' = rawType === 'INCOME' ? 'income' : 'expense';

  const amountNum = Number(t.amount);
  const safeAmount = Number.isFinite(amountNum) ? amountNum : 0;

  const categoryLabel =
    (t.category && String(t.category)) ||
    (t.metadata?.category_name && String(t.metadata.category_name)) ||
    (t.category_id != null ? `Category #${t.category_id}` : 'Uncategorized');

  const paymentMethodRaw =
    t.payment_method ??
    t.paymentMethod ??
    t.metadata?.payment_method ??
    t.metadata?.paymentMethod;

  const paymentMethod = paymentMethodRaw ? String(paymentMethodRaw).toLowerCase() : 'cash';

  return {
    id: String(t.id),
    type: uiType,
    amount: safeAmount,
    category: categoryLabel,
    description: t.description ?? '',
    date: dateOnly,
    paymentMethod,
  };
}

export function normalizeTransactions(data: any): UiTransaction[] {
  const arr: ApiTransaction[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.transactions)
      ? data.transactions
      : Array.isArray(data?.recentTransactions)
        ? data.recentTransactions
        : [];

  return arr.filter(Boolean).map(toUiTransaction);
}