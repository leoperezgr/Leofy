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

  metadata?: {
    category_name?: string;
    payment_method?: string;
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
  const dateOnly = new Date(iso).toISOString().split('T')[0];

  const rawType = String(t.type || '').toUpperCase();
  const uiType: 'income' | 'expense' = rawType === 'INCOME' ? 'income' : 'expense';

  const amountNum = Number(t.amount);
  const safeAmount = Number.isFinite(amountNum) ? amountNum : 0;

  const categoryLabel =
    (t.category && String(t.category)) ||
    (t.metadata?.category_name && String(t.metadata.category_name)) ||
    (t.category_id != null ? `Category #${t.category_id}` : 'Uncategorized');

  const paymentMethod =
    (t.metadata?.payment_method && String(t.metadata.payment_method)) || 'cash';

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