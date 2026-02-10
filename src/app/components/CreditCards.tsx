import { Link } from 'react-router';
import { ArrowRight, AlertTriangle } from 'lucide-react';
import { creditCards } from '../utils/mockData';

export function CreditCards() {
  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Credit Cards</h1>
        <p className="text-[#64748B]">Manage your credit cards and track usage</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Credit Used</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">
            ${creditCards.reduce((sum, card) => sum + card.usedAmount, 0).toFixed(0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <p className="text-sm text-[#64748B] mb-2">Total Credit Limit</p>
          <p className="text-2xl lg:text-3xl font-bold text-[#1F2933]">
            ${creditCards.reduce((sum, card) => sum + card.creditLimit, 0).toFixed(0)}
          </p>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-4">
        {creditCards.map((card) => {
          const usagePercent = (card.usedAmount / card.creditLimit) * 100;
          const isHighUsage = usagePercent > 80;

          return (
            <Link
              key={card.id}
              to={`/cards/${card.id}`}
              className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              {/* Card Visual */}
              <div className={`relative h-40 lg:h-48 rounded-2xl bg-gradient-to-br ${card.color} p-6 mb-4 overflow-hidden`}>
                {/* Decorative circles */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -right-4 top-12 w-24 h-24 rounded-full bg-white/5" />
                
                <div className="relative z-10 h-full flex flex-col justify-between text-white">
                  <div>
                    <p className="text-sm opacity-80 mb-1">Credit Card</p>
                    <h3 className="text-xl font-semibold">{card.name}</h3>
                  </div>
                  <div>
                    <p className="text-2xl font-mono tracking-wider">•••• •••• •••• {card.last4}</p>
                  </div>
                </div>
              </div>

              {/* Card Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#64748B] mb-1">Used Amount</p>
                    <p className="text-2xl font-bold text-[#1F2933]">${card.usedAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-[#64748B] mb-1">Credit Limit</p>
                    <p className="text-xl font-semibold text-[#64748B]">${card.creditLimit.toFixed(2)}</p>
                  </div>
                </div>

                {/* Usage Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[#64748B]">Usage</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isHighUsage ? 'text-[#FACC15]' : 'text-[#3B82F6]'}`}>
                        {usagePercent.toFixed(0)}%
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
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">High usage warning</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        You've used more than 80% of your credit limit
                      </p>
                    </div>
                  </div>
                )}

                {/* View Details */}
                <div className="flex items-center justify-end text-[#2DD4BF] hover:text-[#14B8A6] transition-colors">
                  <span className="text-sm font-medium">View Details</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
