import type { LucideIcon } from "lucide-react";

import { useCrm2Theme } from "./crm2-theme";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Страница-заглушка каркаса /crm2.
 *
 * Меню панели уже рабочее и ведёт сюда, но сами разделы переносятся из
 * демо-версии следующими шагами (доска — шаг 2, карточка — шаг 3, клиенты и
 * задачи — шаг 4, аналитика и настройки — шаг 5). Выдумывать содержимое
 * заранее нельзя: визуал задаёт владелец, настоящие данные подключаются по
 * отдельному решению. Здесь только каркас: общая тема, шапка с тумблером и
 * честная подпись. Запросов к серверу заглушки не делают.
 */
export function StubPage({
  title,
  subtitle,
  body,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  body: string;
  icon: LucideIcon;
}) {
  const theme = useCrm2Theme();
  const light = theme === "light";

  return (
    <div
      data-theme={theme}
      className={`flex h-full min-h-0 flex-col ${
        light ? "bg-[linear-gradient(160deg,#f7f6ff,#f3f7ff_45%,#f2fbf6)]" : "bg-[#15161b]"
      }`}
    >
      <header className="flex items-center justify-between gap-4 px-5 pt-5 pb-4">
        <div>
          <h1 className="bg-gradient-to-r from-[#7c5cff] via-[#0ea5e9] to-[#84cc16] bg-clip-text text-[17px] font-extrabold text-transparent">
            {title}
          </h1>
          <p
            className={`mt-1 text-[12px] font-medium ${light ? "text-[#6b7280]" : "text-white/45"}`}
          >
            {subtitle}
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid min-h-0 flex-1 place-items-center px-5 pb-5">
        <div
          className={`flex flex-col items-center gap-3 rounded-2xl border border-dashed px-10 py-12 text-center ${
            light ? "border-[#c9cdd6] bg-white/60" : "border-white/[0.12] bg-white/[0.03]"
          }`}
        >
          <Icon
            aria-hidden="true"
            size={28}
            strokeWidth={1.6}
            className={light ? "text-[#7c5cff]" : "text-[#8b7dff]"}
          />
          <p className={`text-[13px] font-semibold ${light ? "text-[#374151]" : "text-white/70"}`}>
            {title}
          </p>
          <p
            className={`max-w-xs text-[12px] leading-relaxed font-medium ${
              light ? "text-[#6b7280]" : "text-white/40"
            }`}
          >
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
