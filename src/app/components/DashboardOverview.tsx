import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
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
  if (!Number.isFinite(amount) || amount === 0) return null;
  const labelY = typeof y === 'number' ? Math.max(14, y - 8) : 14;

  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fill="#1F2933"
      fontSize={11}
      fontWeight={600}
      fontFamily="Inter, sans-serif"
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
    <div className="db-overview">
      {/* 1.2 Available Balance — hero card */}
      <div className="db-hero">
        <div className="db-hero__shimmer" />
        <div className="db-hero__content">
          <p className="db-hero__label">Available across debit accounts</p>
          <h2 className="db-hero__amount">${formatMoney(totalDebitAvailable)}</h2>
        </div>
      </div>

      {/* 1.3 Period selector — inline text tabs */}
      <div className="db-period">
        <div className="db-period__track">
          {[
            { value: 'month', label: 'This Month' },
            { value: 'week', label: 'This Week' },
            { value: '30days', label: 'Last 30 Days' },
            { value: 'year', label: 'This Year' },
            { value: 'custom', label: 'Custom' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPeriodChange(option.value)}
              className={`db-period__item ${period === option.value ? 'db-period__item--active' : ''}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="db-period__custom">
            <label className="db-period__date-field">
              <span className="db-period__date-label">Start</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => onCustomStartDateChange(e.target.value)}
                className="db-period__date-input"
              />
            </label>
            <label className="db-period__date-field">
              <span className="db-period__date-label">End</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => onCustomEndDateChange(e.target.value)}
                className="db-period__date-input"
              />
            </label>
          </div>
        )}
      </div>

      {/* 1.4 Balance summary — 3-column card */}
      <div className="db-summary">
        <div className="db-summary__col db-summary__col--income">
          <span className="db-summary__label">Income</span>
          <span className="db-summary__amount db-summary__amount--green">
            ${formatMoney(income)}
          </span>
        </div>
        <div className="db-summary__col db-summary__col--balance">
          <span className="db-summary__label">Balance</span>
          <span className="db-summary__amount db-summary__amount--primary">
            ${formatMoney(balance)}
          </span>
          <span className="db-summary__sub">{periodLabel}</span>
        </div>
        <div className="db-summary__col db-summary__col--expense">
          <span className="db-summary__label">Expenses</span>
          <span className="db-summary__amount db-summary__amount--red">
            ${formatMoney(expenses)}
          </span>
        </div>
      </div>

      {/* 1.5 Charts row */}
      <div className="db-charts-row">
        {/* Spending chart */}
        <div className="db-card">
          <div className="db-card__header">
            <div>
              <h3 className="db-card__title">Spending</h3>
              <p className="db-card__subtitle">{periodLabel}</p>
            </div>
            <span className="db-card__amount">${formatMoney(expenses)}</span>
          </div>
          <div className="db-card__chart">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 28, right: 4, left: 4, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#F3F4F6" strokeDasharray="" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 11, fontFamily: 'Inter' }}
                />
                <Bar dataKey="amount" fill="#2DD4BF" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="amount" content={renderBarAmountLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Spending by Category */}
          {spendingByCategory.length > 0 && (
            <div className="db-categories">
              <h4 className="db-categories__title">By Category</h4>
              <div className="db-categories__list">
                {spendingByCategory.map((item) => {
                  const pct = topCategoryAmount > 0 ? (item.amount / topCategoryAmount) * 100 : 0;
                  return (
                    <div key={item.name} className="db-categories__item">
                      <div className="db-categories__row">
                        <span className="db-categories__name">{item.name}</span>
                        <span className="db-categories__amount">${formatMoney(item.amount)}</span>
                      </div>
                      <div className="db-categories__bar">
                        <div
                          className="db-categories__fill"
                          style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Credit Cards */}
        <div className="db-card">
          <div className="db-card__header">
            <div>
              <h3 className="db-card__title">Credit Usage</h3>
              <p className="db-card__subtitle">Total credit used</p>
            </div>
            <Link to="/cards" className="db-card__link">
              View all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="db-credit">
            <div className="db-credit__amounts">
              <span className="db-credit__used">${formatMoney(totalCreditUsed)}</span>
              <span className="db-credit__limit">/ ${formatMoney(totalCreditLimit)}</span>
            </div>
            <div className="db-credit__bar">
              <div
                className={`db-credit__fill ${creditUsagePercent > 80 ? 'db-credit__fill--warn' : ''}`}
                style={{ width: `${Math.min(creditUsagePercent, 100)}%` }}
              />
            </div>
            <span className="db-credit__pct">{creditUsagePercent.toFixed(0)}% used</span>
          </div>

          <div className="db-minicards">
            {creditCards.slice(0, 3).map((card) => (
              <div
                key={card.id}
                className={`db-minicards__card bg-gradient-to-br ${cardColorToGradient(card.color)}`}
              >
                <span className="db-minicards__last4">•••• {card.last4 ?? '----'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 1.6 Recent Transactions */}
      <div className="db-card">
        <div className="db-card__header">
          <h3 className="db-card__title">Recent Transactions</h3>
          <Link to="/transactions" className="db-card__link">
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="db-txlist">
          {recentUi.length > 0 ? (
            recentUi.map((t) => (
              <div key={t.id} className="db-txlist__row">
                <div className="db-txlist__left">
                  <div className={`db-txlist__icon ${t.type === 'income' ? 'db-txlist__icon--income' : 'db-txlist__icon--expense'}`}>
                    {t.type === 'income' ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="db-txlist__desc">{t.description ?? '\u2014'}</p>
                    <p className="db-txlist__cat">{t.category || 'Uncategorized'}</p>
                  </div>
                </div>
                <span className={`db-txlist__amount ${t.type === 'income' ? 'db-txlist__amount--income' : ''}`}>
                  {t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                </span>
              </div>
            ))
          ) : (
            <p className="db-txlist__empty">No transactions found in this period.</p>
          )}
        </div>
      </div>
    </div>
  );
}
