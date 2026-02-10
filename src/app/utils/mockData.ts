export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: string;
  paymentMethod: 'cash' | 'debit' | 'credit';
  cardId?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  last4: string;
  usedAmount: number;
  creditLimit: number;
  color: string;
}

export interface Category {
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

export const categories: Category[] = [
  // Income categories
  { name: 'Salary', icon: 'Briefcase', type: 'income' },
  { name: 'Freelance', icon: 'Laptop', type: 'income' },
  { name: 'Investment', icon: 'TrendingUp', type: 'income' },
  { name: 'Other Income', icon: 'Plus', type: 'income' },
  
  // Expense categories
  { name: 'Food & Dining', icon: 'UtensilsCrossed', type: 'expense' },
  { name: 'Shopping', icon: 'ShoppingBag', type: 'expense' },
  { name: 'Transport', icon: 'Car', type: 'expense' },
  { name: 'Entertainment', icon: 'Film', type: 'expense' },
  { name: 'Health', icon: 'Heart', type: 'expense' },
  { name: 'Bills', icon: 'Receipt', type: 'expense' },
  { name: 'Education', icon: 'GraduationCap', type: 'expense' },
  { name: 'Other', icon: 'MoreHorizontal', type: 'expense' },
];

export const creditCards: CreditCard[] = [
  {
    id: '1',
    name: 'Premium Card',
    last4: '4242',
    usedAmount: 3250,
    creditLimit: 5000,
    color: 'from-purple-500 to-pink-500',
  },
  {
    id: '2',
    name: 'Travel Card',
    last4: '8888',
    usedAmount: 1200,
    creditLimit: 3000,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: '3',
    name: 'Cashback Card',
    last4: '1234',
    usedAmount: 800,
    creditLimit: 2000,
    color: 'from-orange-500 to-yellow-500',
  },
];

export const transactions: Transaction[] = [
  {
    id: '1',
    amount: 4500,
    type: 'income',
    category: 'Salary',
    description: 'Monthly salary',
    date: '2026-02-01',
    paymentMethod: 'debit',
  },
  {
    id: '2',
    amount: 45.50,
    type: 'expense',
    category: 'Food & Dining',
    description: 'Restaurant lunch',
    date: '2026-02-08',
    paymentMethod: 'credit',
    cardId: '1',
  },
  {
    id: '3',
    amount: 120,
    type: 'expense',
    category: 'Shopping',
    description: 'Clothing store',
    date: '2026-02-07',
    paymentMethod: 'credit',
    cardId: '1',
  },
  {
    id: '4',
    amount: 800,
    type: 'income',
    category: 'Freelance',
    description: 'Design project',
    date: '2026-02-05',
    paymentMethod: 'debit',
  },
  {
    id: '5',
    amount: 85,
    type: 'expense',
    category: 'Bills',
    description: 'Internet bill',
    date: '2026-02-04',
    paymentMethod: 'debit',
  },
  {
    id: '6',
    amount: 32.75,
    type: 'expense',
    category: 'Transport',
    description: 'Gas station',
    date: '2026-02-03',
    paymentMethod: 'credit',
    cardId: '2',
  },
  {
    id: '7',
    amount: 15,
    type: 'expense',
    category: 'Entertainment',
    description: 'Movie tickets',
    date: '2026-02-02',
    paymentMethod: 'cash',
  },
  {
    id: '8',
    amount: 250,
    type: 'expense',
    category: 'Health',
    description: 'Dental checkup',
    date: '2026-02-09',
    paymentMethod: 'debit',
  },
  {
    id: '9',
    amount: 65,
    type: 'expense',
    category: 'Food & Dining',
    description: 'Grocery shopping',
    date: '2026-02-06',
    paymentMethod: 'credit',
    cardId: '3',
  },
  {
    id: '10',
    amount: 180,
    type: 'expense',
    category: 'Education',
    description: 'Online course',
    date: '2026-02-10',
    paymentMethod: 'credit',
    cardId: '1',
  },
];

export const getCategoryIcon = (categoryName: string): string => {
  const category = categories.find(cat => cat.name === categoryName);
  return category?.icon || 'Circle';
};

export const getCardById = (cardId: string): CreditCard | undefined => {
  return creditCards.find(card => card.id === cardId);
};

export const calculateBalance = (transactions: Transaction[]) => {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  return { income, expenses, balance: income - expenses };
};

export const getTransactionsByCard = (cardId: string) => {
  return transactions.filter(t => t.cardId === cardId);
};

export const getSpendingByCategory = () => {
  const spending: Record<string, number> = {};
  
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      spending[t.category] = (spending[t.category] || 0) + t.amount;
    });
  
  return Object.entries(spending)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};
