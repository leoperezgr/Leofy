import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';
import { LoadingScreen } from './LoadingScreen';
import '../../styles/components/Statistics.css';

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

function niceCeil(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  return Math.ceil(n / pow) * pow;
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
  const spendingByCategoryChartData = useMemo(
    () =>
      spendingByCategory
        .map((d) => {
          const value = Number((d as any).value);
          const safeValue = Number.isFinite(value) ? value : 0;
          return {
            ...d,
            name: typeof d.name === 'string' ? d.name.trim() : '',
            value: safeValue,
          };
        })
        .filter((d) => d.name.length > 0),
    [spendingByCategory]
  );
  const spendingByCategoryMax = useMemo(
    () => Math.max(...spendingByCategoryChartData.map((d) => d.value), 0),
    [spendingByCategoryChartData]
  );
  const spendingByCategoryYMax = useMemo(() => {
    const yMax = niceCeil(spendingByCategoryMax);
    return yMax > 0 ? yMax : 1;
  }, [spendingByCategoryMax]);

  if (loading) {
    return (
      <LoadingScreen
        title="Statistics"
        message="Preparing your spending insights..."
      />
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h1 className="stats-title">Statistics</h1>
        <p className="stats-subtitle">Your spending insights for February</p>
      </div>

      {error && (
        <div className="stats-error-box">
          <p className="stats-error-text">{error}</p>
        </div>
      )}

      <div className="stats-metrics-grid">
        <div className="stats-metric-card">
          <p className="stats-metric-label">Total Income</p>
          <p className="stats-metric-value stats-metric-income">${formatMoney(incomeTotal)}</p>
        </div>
        <div className="stats-metric-card">
          <p className="stats-metric-label">Total Expenses</p>
          <p className="stats-metric-value stats-metric-expense">${formatMoney(expensesTotal)}</p>
        </div>
        <div className="stats-metric-card">
          <p className="stats-metric-label">Transactions</p>
          <p className="stats-metric-value">{transactions.length}</p>
        </div>
        <div className="stats-metric-card">
          <p className="stats-metric-label">Savings</p>
          <p className="stats-metric-value stats-metric-savings">${formatMoney(savings)}</p>
        </div>
      </div>

      <div className="stats-grid-two">
        <div className="stats-card">
          <h3 className="stats-card-title">Income vs Expenses</h3>
          <div className="stats-chart-center">
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
                  formatter={(value) => <span className="stats-legend-text">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-footer-row">
            <span className="stats-metric-label">Savings Rate</span>
            <span className="stats-footer-value">{savingsRate.toFixed(1)}%</span>
          </div>
        </div>

        <div className="stats-card">
          <h3 className="stats-card-title">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={spendingByCategoryChartData} margin={{ top: 24, right: 8, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={80}
                stroke="#94A3B8"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#94A3B8"
                style={{ fontSize: '12px' }}
                domain={[0, spendingByCategoryYMax]}
                allowDecimals={false}
                tickFormatter={(v: number) => `$${formatMoney(toNumber(v))}`}
              />
              <Tooltip
                formatter={(value: number | string) => [`$${formatMoney(toNumber(value))}`, '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {spendingByCategoryChartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(value: number | string) => `$${formatMoney(toNumber(value))}`}
                  style={{ fill: '#1F2933', fontSize: 11, fontWeight: 500 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {spendingByCard.length > 0 && (
        <div className="stats-card stats-card-gap">
          <h3 className="stats-card-title">Spending by Credit Card</h3>
          <div className="stats-card-list">
            {spendingByCard.map((item) => {
              const percentage = item.creditLimit > 0 ? (item.value / item.creditLimit) * 100 : 0;

              return (
                <div key={item.id}>
                  <div className="stats-card-row-head">
                    <div className="stats-card-row-left">
                      <div className={`stats-card-chip bg-gradient-to-br ${item.colorClass}`}>
                        <span className="stats-card-chip-text">....</span>
                      </div>
                      <span className="stats-card-name">{item.name}</span>
                    </div>
                    <div className="stats-card-row-right">
                      <p className="stats-card-amount">${formatMoney(item.value)}</p>
                      <p className="stats-card-percent">{percentage.toFixed(1)}% used</p>
                    </div>
                  </div>
                  <div className="stats-progress-track">
                    <div className="stats-progress-fill" style={{ width: `${Math.min(100, percentage)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="stats-card stats-card-gap">
        <h3 className="stats-card-title">Category Breakdown</h3>
        <div className="stats-table-wrap">
          <table className="stats-table">
            <thead>
              <tr className="stats-table-head-row">
                <th className="stats-th stats-th-left">Category</th>
                <th className="stats-th stats-th-right">Amount</th>
                <th className="stats-th stats-th-right">% of Total</th>
                <th className="stats-th stats-th-right">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {spendingByCategory.map((item, index) => {
                const percentage = expensesTotal > 0 ? (item.value / expensesTotal) * 100 : 0;

                return (
                  <tr key={item.name} className="stats-tr">
                    <td className="stats-td stats-td-left">
                      <div className="stats-category-cell">
                        <div className="stats-category-dot" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="stats-card-name">{item.name}</span>
                      </div>
                    </td>
                    <td className="stats-td stats-td-right stats-card-amount">${formatMoney(item.value)}</td>
                    <td className="stats-td stats-td-right stats-metric-label">{percentage.toFixed(1)}%</td>
                    <td className="stats-td stats-td-right stats-metric-label">{item.transactions}</td>
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
