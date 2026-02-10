import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { CreditCards } from './components/CreditCards';
import { CardDetail } from './components/CardDetail';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';

// Check if user has completed onboarding
const hasOnboarded = () => {
  return localStorage.getItem('leofy_onboarded') === 'true';
};

export const router = createBrowserRouter([
  {
    path: '/onboarding',
    Component: Onboarding,
  },
  {
    path: '/',
    Component: Layout,
    loader: () => {
      // Redirect to onboarding if not completed
      if (!hasOnboarded()) {
        window.location.href = '/onboarding';
        return null;
      }
      return null;
    },
    children: [
      {
        index: true,
        Component: Dashboard,
      },
      {
        path: 'transactions',
        Component: Transactions,
      },
      {
        path: 'cards',
        Component: CreditCards,
      },
      {
        path: 'cards/:cardId',
        Component: CardDetail,
      },
      {
        path: 'statistics',
        Component: Statistics,
      },
      {
        path: 'settings',
        Component: Settings,
      },
    ],
  },
]);
