import { Suspense, lazy } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "@/app/layout/AppShell";
import { RequireAuth } from "@/app/RequireAuth";
import { LoginPage } from "@/features/auth/LoginPage";
import { KanbanPage } from "@/features/crm/KanbanPage";
import { LeadFormPage } from "@/features/crm/LeadFormPage";
import { Crm2AnalyticsPage } from "@/features/crm2/Crm2AnalyticsPage";
import { Crm2CustomersPage } from "@/features/crm2/Crm2CustomersPage";
import { Crm2Shell } from "@/features/crm2/Crm2Shell";
import { LeadBoard } from "@/features/crm2/LeadBoard";
import { Crm2SettingsPage } from "@/features/crm2/Crm2SettingsPage";
import { Crm2TasksPage } from "@/features/crm2/Crm2TasksPage";
import { LeadPage } from "@/features/crm2/LeadPage";
import { StubPage } from "@/features/crm2/StubPage";
import { BriefcaseBusiness, CalendarDays } from "lucide-react";

// Страницы загружаются отдельно: тяжёлые разделы не входят в стартовый
// пакет.
const AdminLayout = lazy(() =>
  import("@/features/admin/AdminLayout").then((m) => ({
    default: m.AdminLayout,
  })),
);
const SecurityPage = lazy(() =>
  import("@/features/admin/SecurityPage").then((m) => ({
    default: m.SecurityPage,
  })),
);
const UsersPage = lazy(() =>
  import("@/features/admin/UsersPage").then((m) => ({ default: m.UsersPage })),
);
const AccountantsPage = lazy(() =>
  import("@/features/admin/AccountantsPage").then((m) => ({ default: m.AccountantsPage })),
);
const CustomersPage = lazy(() =>
  import("@/features/customers/CustomersPage").then((m) => ({
    default: m.CustomersPage,
  })),
);
const LauncherPage = lazy(() =>
  import("@/features/launcher/LauncherPage").then((m) => ({
    default: m.LauncherPage,
  })),
);
const ShipmentFormPage = lazy(() =>
  import("@/features/shipments/ShipmentFormPage").then((m) => ({
    default: m.ShipmentFormPage,
  })),
);
const ShipmentsPage = lazy(() =>
  import("@/features/shipments/ShipmentsPage").then((m) => ({
    default: m.ShipmentsPage,
  })),
);
const AccountingPage = lazy(() =>
  import("@/features/accounting/AccountingPage").then((m) => ({
    default: m.AccountingPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-[13px] text-odoo-text-muted">
      Загрузка…
    </div>
  );
}

function AdminIndex() {
  return <Navigate to="users" replace />;
}

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell>
          <LauncherPage />
        </AppShell>
      </RequireAuth>
    ),
  },
  {
    // Новая CRM: общая оболочка (левая панель) и разделы под ней.
    // Доска — корневая страница; остальные разделы пока заглушки, но
    // переходы по меню работают и не трогают данные.
    path: "/crm2",
    element: (
      <RequireAuth>
        <Crm2Shell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <LeadBoard /> },
      { path: "leads/:id", element: <LeadPage /> },
      {
        path: "customers",
        element: <Crm2CustomersPage />,
      },
      {
        path: "tasks",
        element: <Crm2TasksPage />,
      },
      {
        path: "analytics",
        element: <Crm2AnalyticsPage />,
      },
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
      {
        path: "settings",
        element: <Crm2SettingsPage />,
      },
    ],
  },
  {
    path: "/crm",
    element: (
      <RequireAuth>
        <KanbanPage />
      </RequireAuth>
    ),
  },
  {
    path: "/crm/leads/:id",
    element: (
      <RequireAuth>
        <LeadFormPage />
      </RequireAuth>
    ),
  },
  {
    path: "/customers",
    element: (
      <RequireAuth>
        <CustomersPage />
      </RequireAuth>
    ),
  },
  {
    path: "/shipments",
    element: (
      <RequireAuth>
        <ShipmentsPage />
      </RequireAuth>
    ),
  },
  {
    path: "/shipments/:id",
    element: (
      <RequireAuth>
        <ShipmentFormPage />
      </RequireAuth>
    ),
  },
  {
    path: "/accounting",
    element: (
      <RequireAuth>
        <AccountingPage />
      </RequireAuth>
    ),
  },
  {
    path: "/admin",
    element: (
      <RequireAuth>
        <AdminLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <AdminIndex /> },
      { path: "users", element: <UsersPage /> },
      { path: "accountants", element: <AccountantsPage /> },
      { path: "security", element: <SecurityPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

/** Маршрутизатор данных также позволяет формам удерживать переход до
 *  автосохранения. */
export function AppRouter() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <RouterProvider router={router} />
    </Suspense>
  );
}
