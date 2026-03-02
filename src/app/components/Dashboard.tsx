import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, DollarSign } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { normalizeTransactions } from '../utils/transactionsMapper';
import { BarChart, Bar, XAxis, ResponsiveContainer, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';
import { applyCardOrder } from '../utils/cardOrder';
import { LoadingScreen } from './LoadingScreen';
import '../../styles/components/Dashboard.css';

type DashboardData = {
  income: number;
  expenses: number;
  balance: number;
  weekly_spending?: Array<{ day: string; amount: number }>;
  weekly_total_expenses?: number;
  recentTransactions: Array<{
    id: string;
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    description: string | null;
    occurred_at: string;
    category_id: string | null;
  }>;
  cards: Array<{
    id: string;
    name: string;
    last4: string | null;
    brand?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER' | null;
    color?: string | null;
    credit_limit: number | null;
    used_amount?: number | string | null;
  }>;
};

type ApiTx = {
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
    [key: string]: unknown;
  } | null;
  card_id?: string | number | null;
  cardId?: string | number | null;
};

type Period = 'month' | 'week' | '30days' | 'year' | 'custom';

const DAY_MS = 24 * 60 * 60 * 1000;

function toNumber(v: unknown) {
  const n = typeof v === 'string' ? Number(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function toId(v: string | number) {
  return typeof v === 'number' ? String(v) : String(v);
}

function cardColorToGradient(color?: string | null) {
  switch ((color || 'OTHER').toUpperCase()) {
    case 'RED':
      return 'from-red-500 to-rose-600';
    case 'ORANGE':
      return 'from-orange-500 to-amber-600';
    case 'BLUE':
      return 'from-blue-500 to-indigo-600';
    case 'GOLD':
      return 'from-yellow-400 to-amber-600';
    case 'BLACK':
      return 'from-gray-900 to-gray-700';
    case 'PLATINUM':
      return 'from-slate-300 to-slate-500';
    case 'SILVER':
      return 'from-gray-300 to-gray-500';
    case 'PURPLE':
      return 'from-purple-500 to-fuchsia-600';
    case 'GREEN':
      return 'from-emerald-500 to-teal-600';
    default:
      return 'from-[#2DD4BF] to-[#14B8A6]';
  }
}

function renderBarAmountLabel(props: any) {
  const { x, y, width, value } = props;
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return null;
  const labelY = typeof y === 'number' ? Math.max(14, y - 6) : 14;

  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill="#1F2933"
      fontSize={12}
      fontWeight={500}
    >
      ${formatMoney(amount)}
    </text>
  );
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

function toInputDateValue(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string, fallback: Date) {
  const [yearRaw, monthRaw, dayRaw] = String(value || '').split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return fallback;
  }

  return new Date(year, month - 1, day);
}

function getDateRange(period: Period, customStartDate: string, customEndDate: string) {
  const today = new Date();

  switch (period) {
    case 'week':
      return { start: startOfWeek(today), end: endOfDay(today) };
    case '30days':
      return { start: startOfDay(addDays(today, -30)), end: endOfDay(today) };
    case 'year':
      return { start: startOfYear(today), end: endOfDay(today) };
    case 'custom': {
      const start = startOfDay(parseInputDate(customStartDate, today));
      const end = endOfDay(parseInputDate(customEndDate, today));
      if (end < start) {
        return { start, end: endOfDay(start) };
      }
      return { start, end };
    }
    case 'month':
    default:
      return { start: startOfMonth(today), end: endOfDay(today) };
  }
}

function getPeriodLabel(period: Period) {
  switch (period) {
    case 'week':
      return 'This Week';
    case '30days':
      return 'Last 30 Days';
    case 'year':
      return 'This Year';
    case 'custom':
      return 'Custom Range';
    case 'month':
    default:
      return 'This Month';
  }
}

export function Dashboard() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const userName = useMemo(() => {
    try {
      const raw = localStorage.getItem('leofy_user');
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      return (
        String(parsed?.full_name || parsed?.name || '').trim() ||
        String(parsed?.email || '').split('@')[0] ||
        ''
      );
    } catch {
      return '';
    }
  }, []);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ApiTx[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [customStartDate, setCustomStartDate] = useState(() => toInputDateValue(startOfMonth(new Date())));
  const [customEndDate, setCustomEndDate] = useState(() => toInputDateValue(new Date()));

  useEffect(() => {
  let cancelled = false;

  async function load() {
    try {
      setLoading(true);

      const userId = localStorage.getItem('leofy_user')
        ? JSON.parse(localStorage.getItem('leofy_user') as string).id
        : '2';

      const token = localStorage.getItem('leofy_token');

      const res = await fetch(
        `${API_BASE}/api/stats/dashboard?userId=${encodeURIComponent(userId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const txRes = await fetch(`${API_BASE}/api/transactions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const text = await res.text(); // ðŸ‘ˆ lee aunque no sea JSON
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        // no era JSON
      }

      if (!res.ok) {
        console.error('DASHBOARD non-OK response:', {
          status: res.status,
          statusText: res.statusText,
          body: json ?? text,
        });
        throw new Error((json?.error || json?.message || text || 'Failed to load dashboard').toString());
      }
      const txJson = await txRes.json().catch(() => null);
      if (!txRes.ok) {
        throw new Error((txJson?.error || txJson?.message || 'Failed to load transactions').toString());
      }

       if (!cancelled) setData(json);
       if (!cancelled) setTransactions(Array.isArray(txJson) ? txJson : []);
     } catch (e) {
       console.error('LOAD DASHBOARD ERROR:', e);
       if (!cancelled) {
         setData(null);
        setTransactions([]);
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
    () => getDateRange(period, customStartDate, customEndDate),
    [period, customStartDate, customEndDate]
  );

  const filteredTx = useMemo(() => {
    return transactions.filter((tx) => {
      const rawDate = tx.occurred_at || tx.created_at || tx.date;
      if (!rawDate) return false;
      const txDate = new Date(rawDate);
      if (!Number.isFinite(txDate.getTime())) return false;
      return txDate >= selectedRange.start && txDate <= selectedRange.end;
    });
  }, [transactions, selectedRange]);

  const income = useMemo(() => {
    return filteredTx.reduce((sum, tx) => {
      return String(tx.type || '').toUpperCase() === 'INCOME' ? sum + toNumber(tx.amount) : sum;
    }, 0);
  }, [filteredTx]);

  const expenses = useMemo(() => {
    return filteredTx.reduce((sum, tx) => {
      return String(tx.type || '').toUpperCase() === 'EXPENSE' ? sum + toNumber(tx.amount) : sum;
    }, 0);
  }, [filteredTx]);

  const balance = income - expenses;

  const chartData = useMemo(() => {
    const expenseRows = filteredTx
      .filter((tx) => String(tx.type || '').toUpperCase() === 'EXPENSE')
      .map((tx) => {
        const rawDate = tx.occurred_at || tx.created_at || tx.date;
        const txDate = rawDate ? new Date(rawDate) : new Date();
        return {
          amount: toNumber(tx.amount),
          date: startOfDay(txDate),
        };
      })
      .filter((row) => Number.isFinite(row.date.getTime()));

    if (period === 'week') {
      const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      return labels.map((day, index) => {
        const bucketDate = startOfDay(addDays(selectedRange.start, index));
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getTime() === bucketDate.getTime() ? sum + row.amount : sum;
        }, 0);

        return { day, amount };
      });
    }

    if (period === 'month') {
      const daysInScope =
        Math.floor((startOfDay(selectedRange.end).getTime() - selectedRange.start.getTime()) / DAY_MS) + 1;
      const bucketCount = Math.max(1, Math.ceil(daysInScope / 7));

      return Array.from({ length: bucketCount }, (_, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.floor(dayIndex / 7) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `W${index + 1}`, amount };
      });
    }

    if (period === '30days') {
      return Array.from({ length: 6 }, (_, index) => {
        const startDay = index * 5 + 1;
        const endDay = index === 5 ? 30 : (index + 1) * 5;
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.min(5, Math.floor(dayIndex / 5)) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `${startDay}-${endDay}`, amount };
      });
    }

    if (period === 'year') {
      const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthLabels.map((day, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getMonth() === index ? sum + row.amount : sum;
        }, 0);

        return { day, amount };
      });
    }

    const totalDays =
      Math.floor((startOfDay(selectedRange.end).getTime() - selectedRange.start.getTime()) / DAY_MS) + 1;

    if (totalDays <= 14) {
      return Array.from({ length: totalDays }, (_, index) => {
        const bucketDate = startOfDay(addDays(selectedRange.start, index));
        const amount = expenseRows.reduce((sum, row) => {
          return row.date.getTime() === bucketDate.getTime() ? sum + row.amount : sum;
        }, 0);

        return {
          day: `${bucketDate.getMonth() + 1}/${bucketDate.getDate()}`,
          amount,
        };
      });
    }

    if (totalDays <= 62) {
      const bucketCount = Math.max(1, Math.ceil(totalDays / 7));
      return Array.from({ length: bucketCount }, (_, index) => {
        const amount = expenseRows.reduce((sum, row) => {
          const dayIndex = Math.floor((row.date.getTime() - selectedRange.start.getTime()) / DAY_MS);
          return Math.floor(dayIndex / 7) === index ? sum + row.amount : sum;
        }, 0);

        return { day: `W${index + 1}`, amount };
      });
    }

    const monthCount =
      (selectedRange.end.getFullYear() - selectedRange.start.getFullYear()) * 12 +
      (selectedRange.end.getMonth() - selectedRange.start.getMonth()) +
      1;

    return Array.from({ length: monthCount }, (_, index) => {
      const bucketDate = new Date(selectedRange.start.getFullYear(), selectedRange.start.getMonth() + index, 1);
      const amount = expenseRows.reduce((sum, row) => {
        return row.date.getFullYear() === bucketDate.getFullYear() && row.date.getMonth() === bucketDate.getMonth()
          ? sum + row.amount
          : sum;
      }, 0);

      return {
        day: bucketDate.toLocaleDateString('en-US', { month: 'short' }),
        amount,
      };
    });
  }, [filteredTx, period, selectedRange]);

  const recentUi = useMemo(() => {
    return normalizeTransactions(filteredTx)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [filteredTx]);

  const spendingByCategory = useMemo(() => {
    const totals = new Map<string, number>();

    normalizeTransactions(filteredTx)
      .filter((tx) => tx.type === 'expense')
      .forEach((tx) => {
        const key = String(tx.category || 'Uncategorized');
        totals.set(key, (totals.get(key) ?? 0) + toNumber(tx.amount));
      });

    return Array.from(totals.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [filteredTx]);

  const topCategoryAmount = spendingByCategory[0]?.amount ?? 0;

  const cards = data?.cards ?? [];
  const creditCards = useMemo(
    () => applyCardOrder(cards.filter((c) => toNumber(c.credit_limit) > 0)),
    [cards]
  );
  const debitCardIds = useMemo(
    () => new Set(cards.filter((c) => toNumber(c.credit_limit) <= 0).map((c) => toId(c.id))),
    [cards]
  );

  const totalCreditLimit = creditCards.reduce((sum, c) => sum + toNumber(c.credit_limit), 0);
  const totalCreditUsed = creditCards.reduce((sum, c) => sum + toNumber(c.used_amount), 0);
  const creditUsagePercent = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;
  const totalDebitAvailable = useMemo(() => {
    return transactions.reduce((sum, t) => {
      const cardIdRaw = (t as any).card_id ?? (t as any).cardId ?? null;
      if (!cardIdRaw) return sum;
      const cardId = toId(cardIdRaw);
      if (!debitCardIds.has(cardId)) return sum;

      const amount = toNumber((t as any).amount);
      const type = String((t as any).type || '').toUpperCase();
      if (type === 'INCOME') return sum + amount;
      if (type === 'EXPENSE') return sum - amount;
      return sum;
    }, 0);
  }, [transactions, debitCardIds]);

  if (loading) {
    return (
      <LoadingScreen
        title={userName ? `Welcome, ${userName}` : 'Dashboard'}
        message="Loading your financial overview..."
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="dashboard-header mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">
            {userName ? `Welcome, ${userName}` : 'Welcome'}
          </h1>
          <p className="text-[#64748B]">Here's your financial overview for {getPeriodLabel(period).toLowerCase()}</p>
        </div>
        <div className="dashboard-header-badges">
          <span className="dashboard-badge">{getPeriodLabel(period)}</span>
        </div>
      </div>

      {/* Available Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] p-6 text-white mb-6 shadow-lg">
        <div className="pointer-events-none absolute right-6 top-4 z-0 h-28 w-28 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute bottom-3 left-10 z-0 h-20 w-40 rounded-full bg-emerald-200/15 blur-2xl" />
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className="text-white/80 mb-2">Available</p>
            <h2 className="text-4xl lg:text-5xl font-bold">${formatMoney(totalDebitAvailable)}</h2>
            <p className="dashboard-hero-caption">Across your debit cards</p>
          </div>
          <div className="dashboard-hero-icon w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="dashboard-panel bg-white rounded-2xl p-6 lg:p-8 shadow-lg mb-6">
        <div className="mb-6">
          <p className="text-sm font-medium text-[#64748B] mb-3">Period</p>
          <div className="dashboard-segmented flex flex-wrap gap-2">
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
                  className={`dashboard-segment rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'dashboard-segment-active bg-[#2DD4BF] text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {period === 'custom' && (
            <div className="dashboard-custom-range mt-4 grid gap-3 md:grid-cols-2">
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

        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[#64748B] mb-2">Total Balance</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1F2933]">${formatMoney(balance)}</h2>
          </div>
          <div className="dashboard-balance-icon w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-[#64748B]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="dashboard-metric-tile dashboard-metric-income rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span className="dashboard-metric-label dashboard-metric-label-income text-sm">Income</span>
            </div>
            <p className="text-2xl font-semibold text-[#1F2933]">${formatMoney(income)}</p>
          </div>

          <div className="dashboard-metric-tile dashboard-metric-expense rounded-xl border p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-rose-600" />
              <span className="dashboard-metric-label dashboard-metric-label-expense text-sm">Expenses</span>
            </div>
            <p className="text-2xl font-semibold text-[#1F2933]">${formatMoney(expenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Spending Overview */}
        <div className="dashboard-panel dashboard-panel-muted bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Spending {getPeriodLabel(period)}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 24, right: 8, left: 8, bottom: 0 }}>
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#64748B', fontSize: 12 }}
              />
              <Bar dataKey="amount" fill="#2DD4BF" radius={[8, 8, 0, 0]}>
                <LabelList
                  dataKey="amount"
                  content={renderBarAmountLabel}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[#64748B]">Total spent</span>
            <span className="text-sm font-semibold text-[#1F2933]">${formatMoney(expenses)}</span>
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#1F2933]">Spending by Category</span>
              <span className="text-xs text-[#64748B]">{getPeriodLabel(period)}</span>
            </div>
            {spendingByCategory.length > 0 ? (
              <div className="space-y-3">
                {spendingByCategory.map((item) => {
                  const width = topCategoryAmount > 0 ? (item.amount / topCategoryAmount) * 100 : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className="text-sm text-[#1F2933] truncate">{item.name}</span>
                        <span className="text-sm font-medium text-[#1F2933]">${formatMoney(item.amount)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2DD4BF] transition-all"
                          style={{ width: `${Math.min(Math.max(width, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[#64748B]">No expense activity in this period.</p>
            )}
          </div>
        </div>

        {/* Credit Cards Summary */}
        <div className="dashboard-panel dashboard-panel-muted bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#1F2933]">Credit Cards</h3>
            <Link to="/cards" className="text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
              View all
            </Link>
          </div>
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold text-[#1F2933]">${formatMoney(totalCreditUsed)}</span>
              <span className="text-[#64748B]">/ ${formatMoney(totalCreditLimit)}</span>
            </div>
            <p className="text-sm text-[#64748B]">Total credit used</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div
              className={`h-full rounded-full transition-all dashboard-credit-progress ${
                creditUsagePercent > 80 ? 'bg-[#FACC15]' : 'bg-[#3B82F6]'
              }`}
              style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
            />
          </div>
          <div className="flex gap-2">
            {creditCards.slice(0, 3).map((card) => (
              <div
                key={card.id}
                className={`dashboard-mini-card flex-1 h-16 rounded-xl bg-gradient-to-br ${cardColorToGradient(card.color)} p-3 flex flex-col justify-between`}
              >
                <span className="text-xs text-white/80">{"\u2022\u2022\u2022\u2022"} {card.last4 ?? '----'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="dashboard-panel dashboard-panel-muted bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1F2933]">Recent Transactions</h3>
          <Link to="/transactions" className="text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
              View all
          </Link>
        </div>
        <div className="space-y-3">
          {recentUi.length > 0 ? (
            recentUi.map((t) => (
              <div key={t.id} className="dashboard-transaction-row flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div
                    className={`dashboard-transaction-icon w-10 h-10 rounded-xl flex items-center justify-center ${
                      t.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <ArrowUpRight className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#1F2933]">{t.description ?? "\u2014"}</p>
                    <p className="text-sm text-[#64748B]">
                      {t.category || 'Uncategorized'}
                    </p>
                  </div>
                </div>
                <span
                  className={`font-semibold ${
                    t.type === 'income' ? 'text-green-600' : 'text-[#1F2933]'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="py-3 text-sm text-[#64748B]">No transactions found in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}


