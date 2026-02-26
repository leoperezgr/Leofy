import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Receipt, CreditCard, BarChart3, Settings, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AddTransactionModal } from './AddTransactionModal';
import '../../styles/components/Layout.css';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  useEffect(() => {
    let cancelled = false;

    async function checkServer() {
      try {
        const res = await fetch(`${API_BASE}/health`, { cache: 'no-store' });
        if (!res.ok) throw new Error('Health not ok');
      } catch {
        if (cancelled) return;

        // backend caído -> limpiamos sesión local y mandamos a login
        localStorage.removeItem('leofy_token');
        localStorage.removeItem('leofy_user');
        localStorage.removeItem('leofy_onboarded');

        navigate('/login', { replace: true });
      }
    }

    checkServer(); // al cargar
    const interval = setInterval(checkServer, 10000); // cada 10s

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [API_BASE, navigate]);

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/transactions', icon: Receipt, label: 'Transactions' },
    { path: '/cards', icon: CreditCard, label: 'Credit Cards' },
    { path: '/statistics', icon: BarChart3, label: 'Stats' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="layout-root">
      {/* Desktop Sidebar */}
      <aside className="layout-sidebar">
        <div className="layout-sidebar-header">
          <div className="layout-brand">
            <div className="layout-brand-badge">
              <span className="layout-brand-letter">L</span>
            </div>
            <span className="layout-brand-name">Leofy</span>
          </div>
        </div>

        <nav className="layout-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`layout-nav-link ${
                  isActive(item.path)
                    ? 'layout-nav-link-active'
                    : 'layout-nav-link-inactive'
                }`}
              >
                <Icon className="layout-nav-icon" />
                <span className="layout-nav-label">{item.label}</span>
              </Link>
            );
          })}

          {/* Add Transaction Button debajo de los nav items */}
          <button
            onClick={() => setShowAddTransaction(true)}
            className="layout-add-btn"
          >
            <Plus className="layout-add-btn-icon" />
            <span className="layout-add-btn-text">Add Transaction</span>
          </button>
        </nav>

        
      </aside>

      {/* Main Content */}
      <main className="layout-main">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="layout-mobile-nav">
        <div className="layout-mobile-nav-inner">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`layout-mobile-link ${
                  isActive(item.path)
                    ? 'layout-mobile-link-active'
                    : 'layout-mobile-link-inactive'
                }`}
              >
                <Icon className="layout-mobile-icon" />
                <span className="layout-mobile-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button - Mobile */}
      <button
        onClick={() => setShowAddTransaction(true)}
        className="layout-mobile-fab"
      >
        <Plus className="layout-mobile-fab-icon" />
      </button>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddTransaction}
        onClose={() => setShowAddTransaction(false)}
      />
    </div>
  );
}
