import { useState } from 'react';
import { X } from 'lucide-react';
import { categories, creditCards } from '../utils/mockData';
import * as LucideIcons from 'lucide-react';

interface AddTransactionModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTransactionModal({ open, onClose }: AddTransactionModalProps) {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'debit' | 'credit'>('cash');
  const [cardId, setCardId] = useState('');
  const [description, setDescription] = useState('');

  const filteredCategories = categories.filter(cat => cat.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would save to backend
    console.log('Transaction:', { type, amount, category, paymentMethod, cardId, description });
    onClose();
    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setPaymentMethod('cash');
    setCardId('');
  };

  if (!open) return null;

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl lg:rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-[#1F2933]">Add Transaction</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-3 rounded-lg font-medium transition-colors ${
                type === 'expense'
                  ? 'bg-white text-[#1F2933] shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-3 rounded-lg font-medium transition-colors ${
                type === 'income'
                  ? 'bg-white text-[#1F2933] shadow-sm'
                  : 'text-[#64748B]'
              }`}
            >
              Income
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-[#1F2933]">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full pl-10 pr-4 py-4 text-2xl font-semibold bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">Category</label>
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.map((cat) => {
                const IconComponent = getIconComponent(cat.icon);
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      category === cat.name
                        ? 'border-[#2DD4BF] bg-[#2DD4BF]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <IconComponent className="w-6 h-6 text-[#64748B]" />
                    <span className="text-xs text-center line-clamp-1">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-3">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {['cash', 'debit', 'credit'].map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method as any)}
                  className={`py-3 rounded-xl font-medium capitalize transition-colors ${
                    paymentMethod === method
                      ? 'bg-[#2DD4BF] text-white'
                      : 'bg-gray-100 text-[#64748B]'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Card Selection (if credit) */}
          {paymentMethod === 'credit' && (
            <div>
              <label className="block text-sm font-medium text-[#64748B] mb-3">Select Card</label>
              <div className="space-y-2">
                {creditCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setCardId(card.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all ${
                      cardId === card.id
                        ? 'border-[#2DD4BF] bg-[#2DD4BF]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[#1F2933]">{card.name}</span>
                      <span className="text-sm text-[#64748B]">•••• {card.last4}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-[#64748B] mb-2">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Grocery shopping"
              className="w-full px-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2DD4BF]"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full py-4 bg-[#2DD4BF] text-white font-semibold rounded-xl hover:bg-[#14B8A6] transition-colors"
          >
            Add Transaction
          </button>
        </form>
      </div>
    </div>
  );
}
