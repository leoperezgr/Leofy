import { createBrowserRouter, redirect } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Onboarding } from "./components/Onboarding";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { Transactions } from "./components/Transactions";
import { CreditCards } from "./components/CreditCards";
import { DebitCards } from "./components/DebitCards";
import { CardDetail } from "./components/CardDetail";
import { CreditCardDetail } from "./components/CreditCardDetail";
import { Statistics } from "./components/Statistics";
import { Settings } from "./components/Settings";
import { SettingsCategories } from "./components/SettingsCategories";
import { ManageCards } from "./components/ManageCards";
import { TransactionDetail } from "./components/TransactionDetail";
import { TesterPanel } from "./components/TesterPanel";

// ✅ Flags reales
const hasOnboarded = () => localStorage.getItem("leofy_onboarded") === "true";
const isLoggedIn = () => Boolean(localStorage.getItem("leofy_token"));

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
    loader: () => {
      // Si ya está logueado, no debería ver login
      if (isLoggedIn()) return redirect("/");
      return null;
    },
  },
  {
    path: "/onboarding",
    Component: Onboarding,
    loader: () => {
      // Si no está logueado, no debería onboardear
      if (!isLoggedIn()) return redirect("/login");
      // Si ya onboardeó, no debería ver onboarding
      if (hasOnboarded()) return redirect("/");
      return null;
    },
  },

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
      { path: "transactions/:transactionId", Component: TransactionDetail },
      { path: "cards", Component: CreditCards },
      { path: "debit-cards", Component: DebitCards },
      { path: "debit-cards/:cardId", Component: CardDetail },
      { path: "cards/manage", Component: ManageCards },
      { path: "cards/:cardId", Component: CreditCardDetail },
      { path: "statistics", Component: Statistics },
      { path: "settings", Component: Settings },
      { path: "settings/profile", Component: Settings },
      { path: "settings/categories", Component: SettingsCategories },
      {
        path: "tester",
        Component: TesterPanel,
        loader: () => {
          try {
            const user = JSON.parse(localStorage.getItem("leofy_user") || "{}");
            if (!["TESTER", "ADMIN"].includes(user.role)) return redirect("/");
          } catch { return redirect("/"); }
          return null;
        },
      },
    ],
  },
]);
