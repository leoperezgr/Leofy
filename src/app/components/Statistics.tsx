import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';
import { LoadingScreen } from './LoadingScreen';
import { useAppDate } from '../contexts/AppDateContext';
import '../../styles/components/Statistics.css';

type ApiTx = {
  id: string | number;
  type: 'INCOME' | 'EXPENSE' | 'income' | 'expense';
  amount: number | string;
  card_id?: string | number | null;
  cardId?: string | number | null;
  occurred_at?: string;
  created_at?: string;
  date?: string;
  metadata?: any;
  category?: string | null;
};

type ApiCard = {
  id: string | number;
  name: string;
  credit_limit?: number | string | null;
  closing_day?: number | string | null;
  color?: string | null;
};

type SpendingByCategoryItem = {
  name: string;
  value: number;
  transactions: number;
};

type Period = 'month' | 'week' | '30days' | 'year' | 'custom';

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

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

function startOfMonth(d: Date) {
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
}

function startOfWeek(d: Date) {
  const next = startOfDay(d);
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function startOfYear(d: Date) {
  return startOfDay(new Date(d.getFullYear(), 0, 1));
}

function addDays(d: Date, n: number) {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

function addMonths(d: Date, n: number) {
  const next = new Date(d);
  next.setMonth(next.getMonth() + n);
  return next;
}

function safeDayInMonth(year: number, monthIndex0: number, day: number) {
  const normalizedDay = Math.max(1, Math.trunc(day || 1));
  const lastDay = new Date(year, monthIndex0 + 1, 0).getDate();
  return new Date(year, monthIndex0, Math.min(normalizedDay, lastDay));
}

function diffMonths(a: Date, b: Date) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function parseInputDate(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const [yearRaw, monthRaw, dayRaw] = raw.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(year, month - 1, day);
  return Number.isFinite(date.getTime()) ? date : null;
}

function getDateRange(period: Period, customStartDate: string, customEndDate: string, today: Date = new Date()) {
  const fallbackStart = startOfMonth(today);
  const fallbackEnd = endOfDay(today);

  switch (period) {
    case 'week':
      return { start: startOfWeek(today), end: fallbackEnd };
    case '30days':
      return { start: startOfDay(addDays(today, -30)), end: fallbackEnd };
    case 'year':
      return { start: startOfYear(today), end: fallbackEnd };
    case 'custom': {
      const parsedStart = parseInputDate(customStartDate);
      const parsedEnd = parseInputDate(customEndDate);
      let start = parsedStart ? startOfDay(parsedStart) : fallbackStart;
      let end = parsedEnd ? endOfDay(parsedEnd) : fallbackEnd;
      if (start > end) {
        const swappedStart = startOfDay(end);
        const swappedEnd = endOfDay(start);
        start = swappedStart;
        end = swappedEnd;
      }
      return { start, end };
    }
    case 'month':
    default:
      return { start: fallbackStart, end: fallbackEnd };
  }
}

function periodLabel(period: Period) {
  switch (period) {
    case 'week':
      return 'This Week';
    case '30days':
      return 'Last 30 Days';
    case 'year':
      return 'This Year';
    case 'custom':
      return 'Custom';
    case 'month':
    default:
      return 'This Month';
  }
}

function getSelectedPeriodDays(period: Period, start: Date, end: Date, today: Date = new Date()) {
  const safeMs = Math.max(endOfDay(end).getTime() - startOfDay(start).getTime(), 0);
  const customDays = Math.max(1, Math.floor(safeMs / (24 * 60 * 60 * 1000)) + 1);

  switch (period) {
    case 'week':
      return 7;
    case '30days':
      return 30;
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const elapsedMs = Math.max(startOfDay(today).getTime() - startOfDay(yearStart).getTime(), 0);
      return Math.max(1, Math.floor(elapsedMs / (24 * 60 * 60 * 1000)) + 1);
    }
    case 'custom':
      return customDays;
    case 'month':
    default:
      return Math.max(1, today.getDate());
  }
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
  const { getAppDate } = useAppDate();
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [cards, setCards] = useState<ApiCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  const selectedRange = useMemo(
    () => getDateRange(period, customStartDate, customEndDate, getAppDate()),
    [period, customStartDate, customEndDate, getAppDate]
  );

  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      const rawDate = tx.occurred_at ?? tx.date ?? tx.created_at;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      if (!Number.isFinite(d.getTime())) return false;
      return d >= selectedRange.start && d <= selectedRange.end;
    });
  }, [transactions, selectedRange]);

  const incomeTotal = useMemo(() => {
    return filteredTx.filter((t) => isIncome(t.type)).reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [filteredTx]);

  const expensesTotal = useMemo(() => {
    return filteredTx.filter((t) => isExpense(t.type)).reduce((sum, t) => sum + toNumber(t.amount), 0);
  }, [filteredTx]);

  const spendingByCategory: SpendingByCategoryItem[] = useMemo(() => {
    const map = new Map<string, { value: number; transactions: number }>();

    for (const t of filteredTx) {
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
  }, [filteredTx]);

  const creditCardUsage = useMemo(() => {
    const creditCards = cards.filter((c) => toNumber(c.credit_limit) > 0);
    const today = getAppDate();

    return creditCards
      .map((card) => {
        const cardId = toId(card.id);
        const creditLimit = toNumber(card.credit_limit);
        const closingDay = Math.max(1, Math.trunc(toNumber(card.closing_day) || 1));
        const closeThisMonth = safeDayInMonth(today.getFullYear(), today.getMonth(), closingDay);
        const nextClosing =
          today <= endOfDay(closeThisMonth)
            ? closeThisMonth
            : safeDayInMonth(today.getFullYear(), today.getMonth() + 1, closingDay);
        const cycleEnd = endOfDay(nextClosing);
        const cycleStart = startOfDay(addDays(addMonths(nextClosing, -1), 1));

        const amountDue = transactions.reduce((sum, tx) => {
          if (!isExpense(tx.type)) return sum;

          const txCardId = toId(tx.card_id ?? tx.cardId);
          if (!txCardId || txCardId !== cardId) return sum;

          const metadata = tx.metadata && typeof tx.metadata === 'object' ? tx.metadata : null;
          const installments = metadata && typeof metadata.installments === 'object' ? metadata.installments : null;

          if (installments) {
            const months = Math.max(0, Math.trunc(toNumber(installments.months)));
            if (months <= 0) return sum;

            const monthlyAmountRaw = toNumber(installments.monthlyAmount);
            const monthlyAmount = monthlyAmountRaw > 0 ? monthlyAmountRaw : toNumber(tx.amount) / months;
            if (!(monthlyAmount > 0)) return sum;

            const startRaw = installments.startAt ?? tx.occurred_at ?? tx.date ?? tx.created_at;
            if (!startRaw) return sum;

            const startAt = new Date(startRaw);
            if (!Number.isFinite(startAt.getTime())) return sum;

            const monthsElapsed = diffMonths(startAt, cycleEnd);
            if (monthsElapsed >= 0 && monthsElapsed < months) {
              return sum + monthlyAmount;
            }

            return sum;
          }

          const rawDate = tx.occurred_at ?? tx.date ?? tx.created_at;
          if (!rawDate) return sum;

          const txDate = new Date(rawDate);
          if (!Number.isFinite(txDate.getTime())) return sum;

          return txDate >= cycleStart && txDate <= cycleEnd ? sum + toNumber(tx.amount) : sum;
        }, 0);

        const usagePercent = creditLimit > 0 ? (amountDue / creditLimit) * 100 : 0;
        const clampedPercent = Math.min(Math.max(usagePercent, 0), 100);

        return {
          id: cardId,
          name: card.name,
          amountDue,
          creditLimit,
          usagePercent,
          clampedPercent,
          colorClass: colorToGradient(card.color),
        };
      })
      .sort((a, b) => b.amountDue - a.amountDue);
  }, [cards, transactions, getAppDate]);

  const incomeExpenseData = useMemo(
    () => [
      { name: 'Income', value: incomeTotal, color: '#10B981' },
      { name: 'Expenses', value: expensesTotal, color: '#EF4444' },
    ],
    [incomeTotal, expensesTotal]
  );

  const netBalance = incomeTotal - expensesTotal;
  const selectedPeriodDays = useMemo(
    () => getSelectedPeriodDays(period, selectedRange.start, selectedRange.end, getAppDate()),
    [period, selectedRange, getAppDate]
  );
  const avgDailySpend = expensesTotal / Math.max(1, selectedPeriodDays);
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
        <p className="stats-subtitle">Your spending insights for {periodLabel(period).toLowerCase()}</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <p className="text-sm font-medium text-[#64748B] mb-3">Period</p>
        <div className="flex flex-wrap gap-2 rounded-2xl border border-gray-200 bg-slate-50 p-2">
          {[
            { value: 'month', label: 'This Month' },
            { value: 'week', label: 'This Week' },
            { value: '30days', label: 'Last 30 Days' },
            { value: 'year', label: 'This Year' },
            { value: 'custom', label: 'Custom' },
          ].map((option) => {
            const isActive = period === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value as Period)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#2DD4BF] text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        {period === 'custom' && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="block text-xs font-medium text-[#64748B] mb-1">Start Date</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1F2933] outline-none transition-colors focus:border-[#2DD4BF]"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[#64748B] mb-1">End Date</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1F2933] outline-none transition-colors focus:border-[#2DD4BF]"
              />
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="stats-error-box">
          <p className="stats-error-text">{error}</p>
        </div>
      )}

      <section className="stats-section stats-section-period">
        <div className="stats-section-head">
          <h2 className="stats-section-title">Period-Based Statistics</h2>
          <p className="stats-section-subtitle">These cards and charts respond to the selected time range.</p>
        </div>

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
            <p className="stats-metric-value">{filteredTx.length}</p>
          </div>
          <div className="stats-metric-card">
            <p className="stats-metric-label">Net Balance</p>
            <p
              className={`stats-metric-value ${
                netBalance < 0 ? 'stats-metric-expense' : 'stats-metric-income'
              }`}
            >
              ${formatMoney(netBalance)}
            </p>
          </div>
        </div>

        <div className="stats-grid-two">
          <div className="stats-card">
            <h3 className="stats-card-title">Income vs Expenses ({periodLabel(period)})</h3>
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
                    formatter={(value: number | string) => `$${formatMoney(toNumber(value))}`}
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
              <span className="stats-metric-label">Avg Daily Spend</span>
              <span className="stats-footer-value">${formatMoney(avgDailySpend)}</span>
            </div>
          </div>

          <div className="stats-card">
            <h3 className="stats-card-title">Spending by Category ({periodLabel(period)})</h3>
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

        <div className="stats-card stats-card-gap">
          <h3 className="stats-card-title">Category Breakdown ({periodLabel(period)})</h3>
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
      </section>

      {creditCardUsage.length > 0 && (
        <section className="stats-section stats-section-live">
          <div className="stats-section-head">
            <h2 className="stats-section-title">Live Account Statistics</h2>
          </div>

          <div className="stats-card">
            <h3 className="stats-card-title">Credit Card Usage (Current Cycle)</h3>
            <div className="stats-card-list">
              {creditCardUsage.map((item) => {
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
                        <p className="stats-metric-label">Amount due</p>
                        <p className="stats-card-amount">${formatMoney(item.amountDue)}</p>
                        <p className="stats-card-percent">{item.usagePercent.toFixed(1)}% used</p>
                      </div>
                    </div>
                    <div className="stats-progress-track">
                      <div className="stats-progress-fill" style={{ width: `${item.clampedPercent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
