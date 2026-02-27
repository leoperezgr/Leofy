import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, DollarSign } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { UiTransaction, normalizeTransactions } from '../utils/transactionsMapper';
import { BarChart, Bar, XAxis, ResponsiveContainer, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';
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
  card_id?: string | number | null;
  cardId?: string | number | null;
};

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
  const [recentUi, setRecentUi] = useState<UiTransaction[]>([]);
  const [transactions, setTransactions] = useState<ApiTx[]>([]);

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

      const text = await res.text(); // 👈 lee aunque no sea JSON
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
      const uiRecent = normalizeTransactions({ recentTransactions: json?.recentTransactions || [] }).slice(0, 5);
        if (!cancelled) setRecentUi(uiRecent);
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

  const income = data?.income ?? 0;
  const expenses = data?.expenses ?? 0;
  const balance = data?.balance ?? 0;

  const chartData = useMemo(() => {
    const fallback = [
      { day: 'Lun', amount: 0 },
      { day: 'Mar', amount: 0 },
      { day: 'Mie', amount: 0 },
      { day: 'Jue', amount: 0 },
      { day: 'Vie', amount: 0 },
      { day: 'Sab', amount: 0 },
      { day: 'Dom', amount: 0 },
    ];
    const week = data?.weekly_spending;
    return Array.isArray(week) && week.length === 7 ? week : fallback;
  }, [data]);
  const weeklyTotalExpenses = toNumber(data?.weekly_total_expenses);

  const recentTransactions = useMemo(() => {
    const tx = data?.recentTransactions ?? [];
    // ya vienen top 5 por backend, pero por si acaso:
    return [...tx].slice(0, 5);
  }, [data]);

  const cards = data?.cards ?? [];
  const creditCards = cards.filter((c) => toNumber(c.credit_limit) > 0);
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
    // sin romper estilos: mismo contenedor, solo placeholder
    return (
      <div className="dashboard-page max-w-7xl mx-auto p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">
            {userName ? `Welcome, ${userName}` : 'Welcome'}
          </h1>
          <p className="text-[#64748B]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">
          {userName ? `Welcome, ${userName}` : 'Welcome'}
        </h1>
        <p className="text-[#64748B]">Here's your financial overview for February</p>
      </div>

      {/* Available Card */}
      <div className="bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-white/80 mb-2">Available</p>
            <h2 className="text-4xl lg:text-5xl font-bold">${formatMoney(totalDebitAvailable)}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-lg mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-[#64748B] mb-2">Total Balance</p>
            <h2 className="text-4xl lg:text-5xl font-bold text-[#1F2933]">${formatMoney(balance)}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-[#64748B]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4 text-[#64748B]" />
              <span className="text-sm text-[#64748B]">Income</span>
            </div>
            <p className="text-2xl font-semibold text-[#1F2933]">${formatMoney(income)}</p>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4 text-[#64748B]" />
              <span className="text-sm text-[#64748B]">Expenses</span>
            </div>
            <p className="text-2xl font-semibold text-[#1F2933]">${formatMoney(expenses)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Spending Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Spending This Week</h3>
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
            <span className="text-sm font-semibold text-[#1F2933]">${formatMoney(weeklyTotalExpenses)}</span>
          </div>
        </div>

        {/* Credit Cards Summary */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
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
              className={`h-full rounded-full transition-all ${
                creditUsagePercent > 80 ? 'bg-[#FACC15]' : 'bg-[#3B82F6]'
              }`}
              style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
            />
          </div>
          <div className="flex gap-2">
            {creditCards.slice(0, 3).map((card) => (
              <div
                key={card.id}
                className={`flex-1 h-16 rounded-xl bg-gradient-to-br ${cardColorToGradient(card.color)} p-3 flex flex-col justify-between`}
              >
                <span className="text-xs text-white/80">•••• {card.last4 ?? '----'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#1F2933]">Recent Transactions</h3>
          <Link to="/transactions" className="text-sm text-[#2DD4BF] hover:text-[#14B8A6]">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {recentUi.map((t) => (
            <div key={t.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
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
                  <p className="font-medium text-[#1F2933]">{t.description ?? '—'}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}

