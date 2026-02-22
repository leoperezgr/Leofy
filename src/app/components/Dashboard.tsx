import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { UiTransaction, normalizeTransactions } from '../utils/transactionsMapper';
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';

type DashboardData = {
  income: number;
  expenses: number;
  balance: number;
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
    credit_limit: number | null;
  }>;
};

export function Dashboard() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentUi, setRecentUi] = useState<UiTransaction[]>([]);

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

      if (!cancelled) setData(json);
      const uiRecent = normalizeTransactions({ recentTransactions: json?.recentTransactions || [] }).slice(0, 5);
        if (!cancelled) setRecentUi(uiRecent);
    } catch (e) {
      console.error('LOAD DASHBOARD ERROR:', e);
      if (!cancelled) setData(null);
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

  const usagePercentage = income > 0 ? (expenses / income) * 100 : 0;

  // Last 7 days (for chart)
  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });
  }, []);

  // Chart data from recentTransactions (group expenses per day)
  const chartData = useMemo(() => {
    const tx = data?.recentTransactions ?? [];
    const byDate = new Map<string, number>();

    for (const d of last7Days) byDate.set(d, 0);

    tx.forEach((t) => {
      if (t.type !== 'EXPENSE') return;
      const day = new Date(t.occurred_at).toISOString().split('T')[0];
      if (!byDate.has(day)) return;
      byDate.set(day, (byDate.get(day) || 0) + Number(t.amount || 0));
    });

    return last7Days.map((date) => ({ date, amount: byDate.get(date) || 0 }));
  }, [data, last7Days]);

  const recentTransactions = useMemo(() => {
    const tx = data?.recentTransactions ?? [];
    // ya vienen top 5 por backend, pero por si acaso:
    return [...tx].slice(0, 5);
  }, [data]);

  const cards = data?.cards ?? [];

  // Nota: tu DB no trae "usedAmount" por card; aquí solo mostramos límites.
  const totalCreditLimit = cards.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0);
  const totalCreditUsed = 0; // si no tienes este cálculo en backend aún
  const creditUsagePercent = totalCreditLimit > 0 ? (totalCreditUsed / totalCreditLimit) * 100 : 0;

  if (loading) {
    // sin romper estilos: mismo contenedor, solo placeholder
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Dashboard</h1>
          <p className="text-[#64748B]">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Dashboard</h1>
        <p className="text-[#64748B]">Here's your financial overview for February</p>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] rounded-2xl p-6 lg:p-8 text-white mb-6 shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-white/80 mb-2">Total Balance</p>
            <h2 className="text-4xl lg:text-5xl font-bold">${balance.toFixed(2)}</h2>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-4 h-4" />
              <span className="text-sm text-white/80">Income</span>
            </div>
            <p className="text-2xl font-semibold">${income.toFixed(2)}</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-4 h-4" />
              <span className="text-sm text-white/80">Expenses</span>
            </div>
            <p className="text-2xl font-semibold">${expenses.toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Spending Overview */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Spending This Week</h3>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData}>
              <XAxis dataKey="date" hide />
              <Bar dataKey="amount" fill="#2DD4BF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-[#64748B]">Usage vs income</span>
            <span className="text-sm font-semibold text-[#1F2933]">{usagePercentage.toFixed(0)}%</span>
          </div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2DD4BF] rounded-full transition-all"
              style={{ width: `${Math.min(usagePercentage, 100)}%` }}
            />
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
              <span className="text-3xl font-bold text-[#1F2933]">${totalCreditUsed.toFixed(0)}</span>
              <span className="text-[#64748B]">/ ${totalCreditLimit.toFixed(0)}</span>
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
            {cards.slice(0, 3).map((card) => (
              <div
                key={card.id}
                className="flex-1 h-16 rounded-xl bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] p-3 flex flex-col justify-between"
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
                {t.type === 'income' ? '+' : '-'}${t.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}