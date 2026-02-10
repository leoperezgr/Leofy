import { useParams, Link } from 'react-router';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { creditCards, transactions, getCategoryIcon } from '../utils/mockData';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import * as LucideIcons from 'lucide-react';

export function CardDetail() {
  const { cardId } = useParams<{ cardId: string }>();
  const card = creditCards.find(c => c.id === cardId);

  if (!card) {
    return (
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="text-center py-12">
          <p className="text-[#64748B]">Card not found</p>
          <Link to="/cards" className="text-[#2DD4BF] hover:text-[#14B8A6] mt-4 inline-block">
            Back to Cards
          </Link>
        </div>
      </div>
    );
  }

  const cardTransactions = transactions.filter(t => t.cardId === cardId);
  const usagePercent = (card.usedAmount / card.creditLimit) * 100;
  const isHighUsage = usagePercent > 80;

  // Generate chart data (simulated daily spending)
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dayStr = date.toISOString().split('T')[0];
    
    const daySpending = cardTransactions
      .filter(t => t.date === dayStr)
      .reduce((sum, t) => sum + t.amount, 0);
    
    return {
      date: date.getDate(),
      amount: daySpending,
    };
  });

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Back Button */}
      <Link 
        to="/cards" 
        className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1F2933] mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Cards</span>
      </Link>

      {/* Card Visual */}
      <div className={`relative h-48 lg:h-56 rounded-2xl bg-gradient-to-br ${card.color} p-6 lg:p-8 mb-6 overflow-hidden shadow-lg`}>
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -right-4 top-16 w-32 h-32 rounded-full bg-white/5" />
        
        <div className="relative z-10 h-full flex flex-col justify-between text-white">
          <div>
            <p className="text-sm opacity-80 mb-1">Credit Card</p>
            <h2 className="text-2xl lg:text-3xl font-semibold">{card.name}</h2>
          </div>
          <div>
            <p className="text-3xl font-mono tracking-wider">•••• •••• •••• {card.last4}</p>
          </div>
        </div>
      </div>

      {/* Usage Stats */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          <div>
            <p className="text-sm text-[#64748B] mb-2">Used Amount</p>
            <p className="text-3xl font-bold text-[#1F2933]">${card.usedAmount.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-[#64748B] mb-2">Credit Limit</p>
            <p className="text-3xl font-bold text-[#1F2933]">${card.creditLimit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-[#64748B] mb-2">Available Credit</p>
            <p className="text-3xl font-bold text-green-600">${(card.creditLimit - card.usedAmount).toFixed(2)}</p>
          </div>
        </div>

        {/* Usage Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#64748B]">Credit Usage</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isHighUsage ? 'text-[#FACC15]' : 'text-[#3B82F6]'}`}>
                {usagePercent.toFixed(1)}%
              </span>
              {isHighUsage && <AlertTriangle className="w-4 h-4 text-[#FACC15]" />}
            </div>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                isHighUsage ? 'bg-[#FACC15]' : 'bg-[#3B82F6]'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Warning Message */}
        {isHighUsage && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100 mt-6">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900">High usage warning</p>
              <p className="text-sm text-yellow-700 mt-1">
                You've used more than 80% of your credit limit. Consider paying down your balance to avoid fees.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Spending Chart */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4">Monthly Spending</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={last30Days}>
            <XAxis 
              dataKey="date" 
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#94A3B8"
              style={{ fontSize: '12px' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']}
            />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#3B82F6" 
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-[#1F2933] mb-4">
          Transactions ({cardTransactions.length})
        </h3>
        
        {cardTransactions.length > 0 ? (
          <div className="space-y-3">
            {cardTransactions
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((transaction, index) => {
                const IconComponent = getIconComponent(getCategoryIcon(transaction.category));
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between py-3 ${
                      index !== cardTransactions.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                        <IconComponent className="w-6 h-6 text-[#64748B]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1F2933] truncate">{transaction.description}</p>
                        <p className="text-sm text-[#64748B]">{transaction.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-[#1F2933]">
                        -${transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#64748B]">No transactions yet with this card</p>
          </div>
        )}
      </div>
    </div>
  );
}
