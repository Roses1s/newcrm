import { useState } from "react";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  LayoutGrid,
  Moon,
  Settings,
  UsersRound,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { overdueTasksCount, useCrm2Board } from "./crm2-store";

/**
 * Левая тёмная панель новой CRM.
 *
 * Визуал и геометрия сохранены по эталону владельца (panel.txt): 232 px
 * развёрнутая и 76 px свёрнутая, состояние запоминается в браузере. С этого
 * шага пункты меню рабочие: ведут на разделы /crm2, активный подсвечивается.
 * Счётчики «17», процент «86%», «Анна Ким» и плашка «Тёмная тема» пока
 * остаются элементами макета: настоящие данные подключаются по отдельному
 * решению владельца. Запросов к серверу панель не делает.
 */

// Выбор «свёрнута/развёрнута» запоминаем в браузере, чтобы после
// обновления страницы панель открывалась так, как её оставил человек.
const SIDEBAR_COLLAPSED_KEY = "crm2.sidebar.collapsed";

type BadgeTone = "green" | "violet" | "amber" | "soon";

interface MenuItem {
  label: string;
  to: string;
  icon: typeof LayoutGrid;
  badge?: string;
  badgeTone?: BadgeTone;
}

// На шаге 4 счётчики «Доска лидов», «Клиенты» и «Задачи» стали живыми —
// считаются из общего макетного стора. Остальные метки — по-прежнему «СКОРО».
function buildMenuItems(state: { leads: { lost: boolean }[] }): MenuItem[] {
  const { leads } = state;
  return [
    {
      label: "Доска лидов",
      to: "/crm2",
      icon: LayoutGrid,
      badge: String(leads.filter((lead) => !lead.lost).length),
      badgeTone: "green",
    },
    {
      label: "Клиенты",
      to: "/crm2/customers",
      icon: UsersRound,
      badge: String(leads.length),
      badgeTone: "violet",
    },
    {
      label: "Задачи",
      to: "/crm2/tasks",
      icon: ClipboardList,
      badge: String(overdueTasksCount()),
      badgeTone: "amber",
    },
    { label: "Аналитика", to: "/crm2/analytics", icon: BarChart3 },
    {
      label: "Сделки",
      to: "/crm2/deals",
      icon: BriefcaseBusiness,
      badge: "СКОРО",
      badgeTone: "soon",
    },
    {
      label: "Календарь",
      to: "/crm2/calendar",
      icon: CalendarDays,
      badge: "СКОРО",
      badgeTone: "soon",
    },
    { label: "Настройки", to: "/crm2/settings", icon: Settings },
  ];
}

const badgeClasses: Record<BadgeTone, string> = {
  green: "rounded-full bg-[#c4f45d] px-2 py-0.5 text-[10.5px] font-bold text-[#101114]",
  violet: "rounded-full bg-[#5a54e8] px-2 py-0.5 text-[10.5px] font-bold text-white",
  soon: "rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] leading-none font-bold tracking-wide text-white/30 uppercase group-hover:border-white/30",
  amber: "rounded-full bg-[#f59e0b] px-2 py-0.5 text-[10.5px] font-bold text-[#101114]",
};

function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean): void {
  try {
    if (collapsed) window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "1");
    else window.localStorage.removeItem(SIDEBAR_COLLAPSED_KEY);
  } catch {
    // Хранилище недоступно — просто работаем без запоминания.
  }
}

/** Корневая доска активна и на карточке лида: оба адреса — её раздел. */
function isItemActive(item: MenuItem, pathname: string): boolean {
  if (item.to === "/crm2") {
    return pathname === "/crm2" || pathname.startsWith("/crm2/leads");
  }
  return pathname.startsWith(item.to);
}

export function Crm2Sidebar() {
  // Размеры и оформление панели — по эталону владельца: 232 px развёрнутая,
  // 76 px свёрнутая, пункты 44 px.
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const { pathname } = useLocation();
  // Счётчики реагируют на изменения макетного стора: бейджи живые.
  const menuItems = buildMenuItems(useCrm2Board());

  function applyCollapsed(next: boolean): void {
    setCollapsed(next);
    saveCollapsed(next);
  }

  return (
    <aside
      aria-label="Боковая панель — пример"
      className={`relative z-20 flex h-full min-h-0 shrink-0 flex-col overflow-y-auto border-r border-white/[0.06] bg-[#101114] px-4 py-5 text-white transition-[width] duration-200 ease-out ${
        collapsed ? "w-[76px]" : "w-[232px]"
      }`}
    >
      <div className={`mb-9 flex items-center gap-3 px-1 ${collapsed ? "justify-center" : ""}`}>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#101114]">
          {/* Фирменный знак владельца: фон плитки в цвет панели (#101114),
              чёрный исходник (/logo.svg) показываем белым. */}
          <img
            src="/logo.svg"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-contain brightness-0 invert"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 leading-none">
            <p className="text-[13px] font-semibold tracking-wide text-white">CRM Детроид</p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-white/35 uppercase">
              CRM · ПРОДАЖИ
            </p>
          </div>
        )}
      </div>

      {!collapsed && (
        <p className="mb-2 px-3 text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">
          МЕНЮ
        </p>
      )}

      <nav aria-label="Меню — пример" className="flex flex-1 flex-col gap-1.5">
        {menuItems.map((item) => {
          const { label, to, icon: Icon, badge, badgeTone } = item;
          const active = isItemActive(item, pathname);
          return (
            <Link
              key={to}
              to={to}
              title={label}
              aria-current={active ? "page" : undefined}
              className={`group relative flex h-11 items-center rounded-xl font-semibold transition-all duration-200 ${
                active
                  ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "text-white/45 hover:bg-white/[0.05] hover:text-white/80"
              } ${collapsed ? "justify-center" : "justify-start gap-3 px-3"}`}
            >
              {active && !collapsed && (
                <span
                  aria-hidden="true"
                  className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[#c4f45d]"
                />
              )}
              <Icon
                aria-hidden="true"
                size={19}
                strokeWidth={active ? 2.3 : 1.8}
                className="shrink-0"
              />
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1 text-left text-[13.5px] font-semibold">
                    {label}
                  </span>
                  {badge ? (
                    <span className={badgeClasses[badgeTone ?? "soon"]}>{badge}</span>
                  ) : null}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-wider text-white/40 uppercase">
              Здоровье воронки
            </p>
            <span className="text-[11px] font-extrabold text-[#c4f45d]">86%</span>
          </div>
          <div aria-hidden="true" className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-[#5a54e8] to-[#c4f45d]" />
          </div>
          <p className="mt-2.5 text-[11px] leading-snug font-medium text-white/35">
            Все этапы в норме, перегруза нет
          </p>
        </div>
      )}

      <div
        className={`mb-2 flex h-11 items-center rounded-xl border border-white/[0.07] text-white/50 transition-all hover:bg-white/[0.05] hover:text-white ${
          collapsed ? "justify-center" : "gap-3 px-3"
        }`}
      >
        <Moon aria-hidden="true" size={17} strokeWidth={2} className="shrink-0" />
        {!collapsed && <span className="text-[13px] font-semibold">Тёмная тема</span>}
      </div>

      <div
        className={`flex items-center rounded-xl p-1.5 transition-colors hover:bg-white/[0.05] ${
          collapsed ? "justify-center" : "gap-3 px-2.5"
        }`}
      >
        <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d946ef] to-[#7c3aed] text-[11px] font-extrabold text-white">
          АК
          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#101114] bg-[#c4f45d]" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-bold text-white">Анна Ким</p>
              <p className="truncate text-[11px] font-medium text-white/40">Руководитель ОП</p>
            </div>
            <button
              type="button"
              aria-label="Свернуть меню"
              aria-expanded={!collapsed}
              onClick={() => applyCollapsed(true)}
              className="shrink-0 rounded-md p-1 text-white/25 transition-colors hover:text-white/70 focus-visible:ring-2 focus-visible:ring-[#c4f45d] focus-visible:outline-none"
            >
              <ChevronsLeft aria-hidden="true" size={16} />
            </button>
          </>
        )}
      </div>

      {collapsed && (
        <button
          type="button"
          aria-label="Развернуть меню"
          aria-expanded={false}
          onClick={() => applyCollapsed(false)}
          className="mx-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] text-white/50 transition-all hover:bg-white/[0.05] hover:text-white focus-visible:ring-2 focus-visible:ring-[#c4f45d] focus-visible:outline-none"
        >
          <ChevronsRight aria-hidden="true" size={16} />
        </button>
      )}
    </aside>
  );
}
