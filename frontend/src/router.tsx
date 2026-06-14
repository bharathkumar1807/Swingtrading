import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { MistakeAnalyticsPage } from "@/pages/MistakeAnalyticsPage";
import { ReviewPage } from "@/pages/ReviewPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { StrategyAnalyticsPage } from "@/pages/StrategyAnalyticsPage";
import { TradesPage } from "@/pages/TradesPage";
import { IntradayPage } from "@/pages/IntradayPage";
import { IntradaySessionPage } from "@/pages/IntradaySessionPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/trades", element: <TradesPage /> },
          { path: "/intraday", element: <IntradayPage /> },
          { path: "/intraday/:id", element: <IntradaySessionPage /> },
          { path: "/review", element: <ReviewPage /> },
          { path: "/mistakes", element: <MistakeAnalyticsPage /> },
          { path: "/strategies", element: <StrategyAnalyticsPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
]);
