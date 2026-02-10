import { Outlet, Link, useLocation } from 'react-router';
import { Home, Receipt, CreditCard, BarChart3, Settings, Plus } from 'lucide-react';
import { useState } from 'react';
import { AddTransactionModal } from './AddTransactionModal';

export function Layout() {
  const location = useLocation();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/cards', icon: CreditCard, label: 'Cards' },
    { path: '/statistics', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] flex items-center justify-center">
              <span className="text-white text-xl font-semibold">L</span>
            </div>
            <span className="text-2xl font-semibold text-[#1F2933]">Leofy</span>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive(item.path)
                    ? 'bg-[#2DD4BF] text-white'
                    : 'text-[#64748B] hover:bg-[#F8FAFC]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4">
          <button
            onClick={() => setShowAddTransaction(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#2DD4BF] text-white rounded-xl hover:bg-[#14B8A6] transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Transaction</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto pb-20 lg:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'text-[#2DD4BF]'
                    : 'text-[#64748B]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button - Mobile */}
      <button
        onClick={() => setShowAddTransaction(true)}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 bg-[#2DD4BF] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[#14B8A6] transition-colors z-40"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add Transaction Modal */}
      <AddTransactionModal 
        open={showAddTransaction} 
        onClose={() => setShowAddTransaction(false)} 
      />
    </div>
  );
}
