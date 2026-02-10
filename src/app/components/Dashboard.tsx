import { Link } from 'react-router';
import { ArrowUpRight, ArrowDownRight, Plus, TrendingUp, Wallet } from 'lucide-react';
import { transactions, calculateBalance, creditCards } from '../utils/mockData';
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  const { income, expenses, balance } = calculateBalance(transactions);
  const usagePercentage = (expenses / income) * 100;

  // Get last 7 days for mini chart
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const chartData = last7Days.map(date => {
    const dayExpenses = transactions
      .filter(t => t.date === date && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return { date, amount: dayExpenses };
  });

  // Recent transactions
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  // Total credit used
  const totalCreditUsed = creditCards.reduce((sum, card) => sum + card.usedAmount, 0);
  const totalCreditLimit = creditCards.reduce((sum, card) => sum + card.creditLimit, 0);
  const creditUsagePercent = (totalCreditUsed / totalCreditLimit) * 100;

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
              <XAxis 
                dataKey="date" 
                hide 
              />
              <Bar 
                dataKey="amount" 
                fill="#2DD4BF" 
                radius={[8, 8, 0, 0]}
              />
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
            {creditCards.slice(0, 3).map(card => (
              <div 
                key={card.id}
                className={`flex-1 h-16 rounded-xl bg-gradient-to-br ${card.color} p-3 flex flex-col justify-between`}
              >
                <span className="text-xs text-white/80">•••• {card.last4}</span>
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
          {recentTransactions.map(transaction => (
            <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  transaction.type === 'income' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowUpRight className="w-5 h-5 text-green-600" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-[#1F2933]">{transaction.description}</p>
                  <p className="text-sm text-[#64748B]">{transaction.category}</p>
                </div>
              </div>
              <span className={`font-semibold ${
                transaction.type === 'income' ? 'text-green-600' : 'text-[#1F2933]'
              }`}>
                {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
