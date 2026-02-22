import { createBrowserRouter, redirect } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Onboarding } from "./components/Onboarding";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { Transactions } from "./components/Transactions";
import { CreditCards } from "./components/CreditCards";
import { CardDetail } from "./components/CardDetail";
import { Statistics } from "./components/Statistics";
import { Settings } from "./components/Settings";

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
      { path: "cards", Component: CreditCards },
      { path: "cards/:cardId", Component: CardDetail },
      { path: "statistics", Component: Statistics },
      { path: "settings", Component: Settings },
    ],
  },
]);