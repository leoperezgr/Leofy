import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { getCategoryIcon } from '../utils/mockData';
import * as LucideIcons from 'lucide-react';

type FilterType = 'all' | 'income' | 'expense';

type ApiTransaction = {
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
    [key: string]: any;
  } | null;
};
type UiTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string; // YYYY-MM-DD
  paymentMethod: string; // backend no lo tiene aún
};

export function Transactions() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<UiTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('leofy_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`${API_BASE}/api/transactions`, {
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const msg = data?.error || data?.message || `Failed to load transactions (${res.status})`;
          throw new Error(msg);
        }

        // ✅ soporta [] y { transactions: [] }
        const arr: ApiTransaction[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.transactions)
            ? data.transactions
            : [];

        const normalized: UiTransaction[] = arr
          .filter(Boolean)
          .map((t) => {
            // ✅ usa occurred_at (tu schema) y cae a created_at/date si hace falta
            const iso = t.occurred_at || t.created_at || t.date || new Date().toISOString();
            const dateOnly = new Date(iso).toISOString().split('T')[0];

            // ✅ enum real INCOME/EXPENSE -> UI income/expense
            const rawType = String(t.type || '').toUpperCase();
            const uiType: 'income' | 'expense' = rawType === 'INCOME' ? 'income' : 'expense';

            const amountNum = Number(t.amount);
            const safeAmount = Number.isFinite(amountNum) ? amountNum : 0;

            // ✅ si no hay nombre de categoría aún, muestra algo en lugar de vacío
            const categoryLabel =
              (t.category && String(t.category)) ||
              (t.metadata?.category_name && String(t.metadata.category_name)) || // ✅ AQUI
              (t.category_id != null ? `Category #${t.category_id}` : 'Uncategorized');

            return {
              id: String(t.id),
              type: uiType,
              amount: safeAmount,
              category: categoryLabel,
              description: t.description ?? '',
              date: dateOnly,
              paymentMethod: 'cash',
            };
          });

        if (!cancelled) setItems(normalized);
      } catch (e) {
        console.error('LOAD TRANSACTIONS ERROR:', e);
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  const filteredTransactions = useMemo(() => {
    return items
      .filter((t) => filter === 'all' || t.type === filter)
      .filter((t) => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;

        return (
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, filter, searchQuery]);

  const groupedTransactions = useMemo(() => {
    return filteredTransactions.reduce((groups, transaction) => {
      const date = transaction.date;
      if (!groups[date]) groups[date] = [];
      groups[date].push(transaction);
      return groups;
    }, {} as Record<string, UiTransaction[]>);
  }, [filteredTransactions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <p className="text-[#64748B]">Loading transactions…</p>
        </div>
      )}

      {/* Transactions List */}
      {!loading && (
        <>
          <div className="space-y-6">
            {Object.entries(groupedTransactions).map(([date, dayTransactions]) => (
              <div key={date}>
                <h3 className="text-sm font-semibold text-[#64748B] mb-3 px-2">
                  {formatDate(date)}
                </h3>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {dayTransactions.map((transaction, index) => {
                    let IconComponent = LucideIcons.Circle;

                    try {
                      const iconName = getCategoryIcon(transaction.category);
                      IconComponent = getIconComponent(iconName);
                    } catch {
                      IconComponent = LucideIcons.Circle;
                    }

                    return (
                      <div
                        key={transaction.id}
                        className={`flex items-center justify-between p-4 ${
                          index !== dayTransactions.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                              transaction.type === 'income' ? 'bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <IconComponent
                              className={`w-6 h-6 ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-[#64748B]'
                              }`}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[#1F2933] truncate">
                              {transaction.description || '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-sm text-[#64748B]">{transaction.category}</span>
                              <span className="text-xs text-[#94A3B8]">•</span>
                              <span className="text-sm text-[#64748B] capitalize">
                                {transaction.paymentMethod}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <p
                            className={`text-lg font-semibold ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-[#1F2933]'
                            }`}
                          >
                            {transaction.type === 'income' ? '+' : '-'}$
                            {transaction.amount.toFixed(2)}
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
        </>
      )}
    </div>
  );
}