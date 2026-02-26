import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';

type ApiTx = {
  id: string | number;
  type: 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  amount: number | string;
  card_id?: string | number | null;
  metadata?: any;
  category?: string | null;
};

type ApiCard = {
  id: string | number;
  name: string;
  credit_limit?: number | string | null;
  color?: string | null;
};

type SpendingByCategoryItem = {
  name: string;
  value: number;
  transactions: number;
};

function toNumber(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toId(v: string | number | null | undefined) {
  if (v === null || v === undefined) return '';
  return String(v);
}

function isExpense(type: ApiTx['type']) {
  return String(type).toUpperCase() === 'EXPENSE';
}

function isIncome(type: ApiTx['type']) {
  return String(type).toUpperCase() === 'INCOME';
}

function getCategoryName(tx: ApiTx) {
  const direct = tx.category?.trim();
  if (direct) return direct;

  const md = tx.metadata;
  if (md && typeof md === 'object' && typeof md.category_name === 'string' && md.category_name.trim()) {
    return md.category_name.trim();
  }

  return 'Uncategorized';
}

function colorToGradient(color?: string | null) {
  switch ((color || 'OTHER').toUpperCase()) {
    case 'RED':
      return 'from-red-500 to-rose-600';
    case 'ORANGE':
      return 'from-orange-500 to-amber-600';
    case 'BLUE':
      return 'from-blue-500 to-sky-600';
    case 'GOLD':
      return 'from-yellow-500 to-amber-600';
    case 'BLACK':
      return 'from-zinc-900 to-zinc-700';
    case 'PLATINUM':
      return 'from-slate-500 to-slate-700';
    case 'SILVER':
      return 'from-gray-400 to-gray-600';
    case 'PURPLE':
      return 'from-purple-500 to-fuchsia-600';
    case 'GREEN':
      return 'from-emerald-500 to-teal-600';
    default:
      return 'from-[#2DD4BF] to-[#14B8A6]';
  }
}

export function Statistics() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('leofy_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [txRes, cardsRes] = await Promise.all([
          fetch(`${API_BASE}/api/transactions`, { headers }),
          fetch(`${API_BASE}/api/cards`, { headers }),
        ]);

        const txJson = await txRes.json().catch(() => null);
        const cardsJson = await cardsRes.json().catch(() => null);

        if (!txRes.ok) throw new Error(txJson?.error || txJson?.message || 'Failed to load transactions');
        if (!cardsRes.ok) throw new Error(cardsJson?.error || cardsJson?.message || 'Failed to load cards');

        if (!cancelled) {
          setTransactions(Array.isArray(txJson) ? txJson : []);
          setCards(Array.isArray(cardsJson) ? cardsJson : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Error loading statistics');
          setTransactions([]);
          setCards([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  const incomeTotal = useMemo(() => {
    return transactions.filter((t) => isIncome(t.type)).reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [transactions]);

  const expensesTotal = useMemo(() => {
    return transactions.filter((t) => isExpense(t.type)).reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [transactions]);

  const spendingByCategory: SpendingByCategoryItem[] = useMemo(() => {
    const map = new Map<string, { value: number; transactions: number }>();

    for (const t of transactions) {
      if (!isExpense(t.type)) continue;
      const category = getCategoryName(t);
      const current = map.get(category) || { value: 0, transactions: 0 };
      current.value += toNumber(t.amount);
      current.transactions += 1;
      map.set(category, current);
    }

    return Array.from(map.entries())
      .map(([name, v]) => ({ name, value: v.value, transactions: v.transactions }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [transactions]);

  const spendingByCard = useMemo(() => {
    const creditCards = cards.filter((c) => toNumber(c.credit_limit) > 0);
    const creditIds = new Set(creditCards.map((c) => toId(c.id)));
    const spentById = new Map<string, number>();

    for (const t of transactions) {
      if (!isExpense(t.type)) continue;
      const cardId = toId(t.card_id);
      if (!cardId || !creditIds.has(cardId)) continue;
      spentById.set(cardId, (spentById.get(cardId) || 0) + toNumber(t.amount));
    }

    return creditCards
      .map((card) => ({
        id: toId(card.id),
        name: card.name,
        value: spentById.get(toId(card.id)) || 0,
        creditLimit: toNumber(card.credit_limit),
        colorClass: colorToGradient(card.color),
      }))
      .sort((a, b) => b.value - a.value);
  }, [cards, transactions]);

  const incomeExpenseData = useMemo(
    () => [
      { name: 'Income', value: incomeTotal, color: '#10B981' },
      { name: 'Expenses', value: expensesTotal, color: '#EF4444' },
    ],
    [incomeTotal, expensesTotal]
  );

  const savings = incomeTotal - expensesTotal;
  const savingsRate = incomeTotal > 0 ? (savings / incomeTotal) * 100 : 0;
  const COLORS = ['#2DD4BF', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Statistics</h1>
          <p className="text-[#64748B]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Statistics</h1>
        <p className="text-[#64748B]">Your spending insights for February</p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Income</p>
          <p className="text-2xl lg:text-3xl font-bold text-green-600">${formatMoney(incomeTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Expenses</p>
          <p className="text-2xl lg:text-3xl font-bold text-red-600">${formatMoney(expensesTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Transactions</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Savings</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#2DD4BF]">${formatMoney(savings)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-6">Income vs Expenses</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={incomeExpenseData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incomeExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-sm text-[#64748B]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Savings Rate</span>
              <span className="text-lg font-semibold text-[#1F2933]">{savingsRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-6">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={spendingByCategory}>
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="#94A3B8"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#94A3B8" style={{ fontSize: '12px' }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {spendingByCategory.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number) => `$${formatMoney(toNumber(value))}`}
                  style={{ fill: '#1F2933', fontSize: 11, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {spendingByCard.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-6">Spending by Credit Card</h3>
          <div className="space-y-4">
            {spendingByCard.map((item) => {
              const percentage = item.creditLimit > 0 ? (item.value / item.creditLimit) * 100 : 0;

              return (
                <div key={item.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.colorClass} flex items-center justify-center`}>
                        <span className="text-white text-xs font-mono">••••</span>
                      </div>
                      <span className="font-medium text-[#1F2933]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1F2933]">${formatMoney(item.value)}</p>
                      <p className="text-xs text-[#64748B]">{percentage.toFixed(1)}% used</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#3B82F6] rounded-full transition-all" style={{ width: `${Math.min(100, percentage)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Category Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-sm font-medium text-[#64748B]">Category</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[#64748B]">Amount</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[#64748B]">% of Total</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[#64748B]">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {spendingByCategory.map((item, index) => {
                const percentage = expensesTotal > 0 ? (item.value / expensesTotal) * 100 : 0;

                return (
                  <tr key={item.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="font-medium text-[#1F2933]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#1F2933]">${formatMoney(item.value)}</td>
                    <td className="py-3 px-4 text-right text-[#64748B]">{percentage.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right text-[#64748B]">{item.transactions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
