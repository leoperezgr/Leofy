import { createBrowserRouter, redirect } from 'react-router';
import { Layout } from './components/Layout';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { CreditCards } from './components/CreditCards';
import { CardDetail } from './components/CardDetail';
import { Statistics } from './components/Statistics';
import { Settings } from './components/Settings';

// Check if user has completed onboarding

const hasOnboarded = () => localStorage.getItem("leofy_onboarded") === "false";
const isLoggedIn = () => !!localStorage.getItem("leofy_token"); // o lo que uses

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/onboarding", Component: Onboarding },

  {
    path: "/",
    Component: Layout,
    loader: () => {
      if (!isLoggedIn()) return redirect("/login");
      if (!hasOnboarded()) return redirect("/onboarding");
      return null;
    },
    children: [
      { index: true, Component: Dashboard },
      { path: "transactions", Component: Transactions },
      { path: "cards", Component: CreditCards },
      { path: "cards/:cardId", Component: CardDetail },
      { path: "statistics", Component: Statistics },
      { path: "settings", Component: Settings },
    ],
  },
]);