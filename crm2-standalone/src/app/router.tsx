import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays } from "lucide-react";

import { Crm2Shell } from "@/features/crm2/Crm2Shell";
import { LeadBoard } from "@/features/crm2/LeadBoard";
import { LeadPage } from "@/features/crm2/LeadPage";
import { StubPage } from "@/features/crm2/StubPage";

// Разделы грузятся отдельно: доска — стартовая и лёгкая, остальное
// подтягивается по переходу. Разметка и тексты страниц — точная копия
// оригинального /crm2, менять здесь нечего.
const Crm2CustomersPage = lazy(() =>
  import("@/features/crm2/Crm2CustomersPage").then((m) => ({
    default: m.Crm2CustomersPage,
  })),
);
const Crm2TasksPage = lazy(() =>
  import("@/features/crm2/Crm2TasksPage").then((m) => ({
    default: m.Crm2TasksPage,
  })),
);
const Crm2AnalyticsPage = lazy(() =>
  import("@/features/crm2/Crm2AnalyticsPage").then((m) => ({
    default: m.Crm2AnalyticsPage,
  })),
);
const Crm2SettingsPage = lazy(() =>
  import("@/features/crm2/Crm2SettingsPage").then((m) => ({
    default: m.Crm2SettingsPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-odoo-text-muted">
      Загрузка…
    </div>
  );
}

// Копия /crm2 работает без входа: данные вымышленные и живут в браузере,
// сервер не нужен. Поэтому RequireAuth из оригинала здесь не стоит, а / и
// неизвестные адреса ведут на доску.
const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/crm2" replace /> },
  {
    // Общая оболочка (левая панель) и разделы под ней — как в оригинале.
    path: "/crm2",
    element: <Crm2Shell />,
    children: [
      { index: true, element: <LeadBoard /> },
      { path: "leads/:id", element: <LeadPage /> },
      { path: "customers", element: <Crm2CustomersPage /> },
      { path: "tasks", element: <Crm2TasksPage /> },
      { path: "analytics", element: <Crm2AnalyticsPage /> },
      {
        path: "deals",
        element: (
          <StubPage
            title="Сделки"
            subtitle="Скоро. Временный пункт панели: заявки в новом оформлении — отдельное решение владельца"
            body="Временная страница каркаса: содержимое не запланировано, только переход"
            icon={BriefcaseBusiness}
          />
        ),
      },
      {
        path: "calendar",
        element: (
          <StubPage
            title="Календарь"
            subtitle="Скоро. Временный пункт панели, реализация не планировалась"
            body="Временная страница каркаса: содержимое не запланировано, только переход"
            icon={CalendarDays}
          />
        ),
      },
      { path: "settings", element: <Crm2SettingsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/crm2" replace /> },
]);

export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
