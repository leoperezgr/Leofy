import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { transactions, creditCards, getSpendingByCategory } from '../utils/mockData';

export function Statistics() {
  const spendingByCategory = getSpendingByCategory().slice(0, 6);
  
  // Spending by card
  const spendingByCard = creditCards.map(card => {
    const cardSpending = transactions
      .filter(t => t.cardId === card.id && t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      name: card.name,
      value: cardSpending,
    };
  }).filter(item => item.value > 0);

  // Monthly income vs expenses
  const incomeTotal = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expensesTotal = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const incomeExpenseData = [
    { name: 'Income', value: incomeTotal, color: '#10B981' },
    { name: 'Expenses', value: expensesTotal, color: '#EF4444' },
  ];

  const COLORS = ['#2DD4BF', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Statistics</h1>
        <p className="text-[#64748B]">Your spending insights for February</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Income</p>
          <p className="text-2xl lg:text-3xl font-bold text-green-600">${incomeTotal.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Expenses</p>
          <p className="text-2xl lg:text-3xl font-bold text-red-600">${expensesTotal.toFixed(0)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Transactions</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">{transactions.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Savings</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#2DD4BF]">${(incomeTotal - expensesTotal).toFixed(0)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Income vs Expenses */}
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
                    fontSize: '14px'
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
              <span className="text-lg font-semibold text-[#1F2933]">
                {((incomeTotal - expensesTotal) / incomeTotal * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
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
              <YAxis 
                stroke="#94A3B8"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{ 
                  backgroundColor: '#fff',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {spendingByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Spending by Card */}
      {spendingByCard.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-[#1F2933] mb-6">Spending by Credit Card</h3>
          <div className="space-y-4">
            {spendingByCard.map((item, index) => {
              const card = creditCards.find(c => c.name === item.name);
              const percentage = (item.value / expensesTotal) * 100;
              
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card?.color} flex items-center justify-center`}>
                        <span className="text-white text-xs font-mono">••••</span>
                      </div>
                      <span className="font-medium text-[#1F2933]">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-[#1F2933]">${item.value.toFixed(2)}</p>
                      <p className="text-xs text-[#64748B]">{percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#3B82F6] rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Breakdown Table */}
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
                const categoryTransactions = transactions.filter(
                  t => t.category === item.name && t.type === 'expense'
                );
                const percentage = (item.value / expensesTotal) * 100;
                
                return (
                  <tr key={item.name} className="border-b border-gray-50 last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium text-[#1F2933]">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[#1F2933]">
                      ${item.value.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-[#64748B]">
                      {percentage.toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 text-right text-[#64748B]">
                      {categoryTransactions.length}
                    </td>
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
