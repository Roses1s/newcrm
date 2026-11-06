import { Moon, Sun } from "lucide-react";

import { setCrm2Theme, useCrm2Theme } from "./crm2-theme";

/**
 * Переключатель «Светлая / Тёмная» для новой CRM.
 *
 * Вынесен в отдельный компонент: тумблер может стоять в шапке доски, в карточке
 * лида и на других страницах /crm2, а состояние у всех общее (crm2-theme.ts).
 * По решению владельца переключатель живёт в шапке страницы, а не в боковой
 * панели (плашка «Тёмная тема» в панели остаётся элементом макета).
 */
export function ThemeToggle() {
  const theme = useCrm2Theme();
  const light = theme === "light";

  return (
    <div
      role="group"
      aria-label="Тема оформления"
      className={`flex items-center gap-1 rounded-xl border p-1 ${
        light ? "border-[#e5e7eb] bg-white shadow-sm" : "border-white/[0.08] bg-white/[0.06]"
      }`}
    >
      <button
        type="button"
        aria-pressed={light}
        onClick={() => setCrm2Theme("light")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#7c5cff] focus-visible:outline-none ${
          light ? "bg-[#7c5cff] text-white" : "text-white/50 hover:text-white/80"
        }`}
      >
        <Sun aria-hidden="true" size={14} strokeWidth={2.2} />
        Светлая
      </button>
      <button
        type="button"
        aria-pressed={!light}
        onClick={() => setCrm2Theme("dark")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#7c5cff] focus-visible:outline-none ${
          light ? "text-[#6b7280] hover:text-[#111827]" : "bg-white/10 text-white"
        }`}
      >
        <Moon aria-hidden="true" size={14} strokeWidth={2.2} />
        Тёмная
      </button>
    </div>
  );
}
