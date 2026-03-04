import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Wallet, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, LabelList } from 'recharts';
import { formatMoney } from '../utils/formatMoney';

type CreditCardPreview = {
  id: string | number;
  last4: string | null;
  color?: string | null;
};

type RecentTransactionItem = {
  id: string | number;
  type: 'income' | 'expense';
  description: string | null;
  category: string | null;
  amount: number;
};

type DashboardOverviewProps = {
  totalDebitAvailable: number;
  period: string;
  periodLabel: string;
  onPeriodChange: (period: string) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  balance: number;
  income: number;
  expenses: number;
  chartData: Array<{ day: string; amount: number }>;
  spendingByCategory: Array<{ name: string; amount: number }>;
  topCategoryAmount: number;
  totalCreditUsed: number;
  totalCreditLimit: number;
  creditUsagePercent: number;
  creditCards: CreditCardPreview[];
  cardColorToGradient: (color?: string | null) => string;
  recentUi: RecentTransactionItem[];
};

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

export function DashboardOverview({
  totalDebitAvailable,
  period,
  periodLabel,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  balance,
  income,
  expenses,
  chartData,
  spendingByCategory,
  topCategoryAmount,
  totalCreditUsed,
  totalCreditLimit,
  creditUsagePercent,
  creditCards,
  cardColorToGradient,
  recentUi,
}: DashboardOverviewProps) {
  return (
    <>
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
                  onClick={() => onPeriodChange(option.value)}
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
                  onChange={(e) => onCustomStartDateChange(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#1F2933] outline-none transition-colors focus:border-[#2DD4BF]"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[#64748B] mb-1">End Date</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => onCustomEndDateChange(e.target.value)}
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
        <div className="dashboard-panel dashboard-panel-muted bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Spending {periodLabel}</h3>
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
              <span className="text-xs text-[#64748B]">{periodLabel}</span>
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
                <span className="text-xs text-white/80">•••• {card.last4 ?? '----'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
                    <p className="font-medium text-[#1F2933]">{t.description ?? '\u2014'}</p>
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
    </>
  );
}
