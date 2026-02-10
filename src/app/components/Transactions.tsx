import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Filter, Search } from 'lucide-react';
import { transactions, categories, getCategoryIcon } from '../utils/mockData';
import * as LucideIcons from 'lucide-react';

type FilterType = 'all' | 'income' | 'expense';

export function Transactions() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions
    .filter(t => filter === 'all' || t.type === filter)
    .filter(t => 
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, typeof transactions>);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  return (
    <div className="max-w-7xl mx-auto p-4 lg:p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Transactions</h1>
        <p className="text-[#64748B]">Track all your income and expenses</p>
      </div>

      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#2DD4BF] text-white'
                : 'bg-white text-[#64748B] border border-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('income')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'income'
                ? 'bg-green-500 text-white'
                : 'bg-white text-[#64748B] border border-gray-200'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilter('expense')}
            className={`px-4 py-2 rounded-xl font-medium transition-colors ${
              filter === 'expense'
                ? 'bg-red-500 text-white'
                : 'bg-white text-[#64748B] border border-gray-200'
            }`}
          >
            Expenses
          </button>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-[#64748B] mb-3 px-2">
              {formatDate(date)}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {dayTransactions.map((transaction, index) => {
                const IconComponent = getIconComponent(getCategoryIcon(transaction.category));
                return (
                  <div
                    key={transaction.id}
                    className={`flex items-center justify-between p-4 ${
                      index !== dayTransactions.length - 1 ? 'border-b border-gray-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <IconComponent className={`w-6 h-6 ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-[#64748B]'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#1F2933] truncate">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-[#64748B]">{transaction.category}</span>
                          <span className="text-xs text-[#94A3B8]">•</span>
                          <span className="text-sm text-[#64748B] capitalize">{transaction.paymentMethod}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-semibold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-[#1F2933]'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-[#64748B]">No transactions found</p>
        </div>
      )}
    </div>
  );
}
