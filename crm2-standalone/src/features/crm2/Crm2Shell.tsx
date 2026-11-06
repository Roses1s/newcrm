import { Outlet } from "react-router-dom";

import { Crm2Sidebar } from "./Crm2Sidebar";

/**
 * Каркас новой CRM: тёмная левая панель + основная область раздела.
 *
 * Панель вынесена из бывшей страницы Crm2Page в оболочку, чтобы разделы
 * /crm2 (доска, карточка лида, клиенты, задачи, аналитика, настройки)
 * строились рядом и не дублировали её разметку. Визуал панели при переносе
 * не менялся. Тема основной области — общая (crm2-theme.ts), фон и окраску
 * под это значение задаёт сама страница раздела.
 */
export function Crm2Shell() {
  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <Crm2Sidebar />
      <main aria-label="Новая CRM" className="min-w-0 min-h-0 flex-1">
        <Outlet />
      </main>
    </div>
  );
}
