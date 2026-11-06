import { useState } from "react";
import { Building2, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { useCrm2Board } from "./crm2-store";
import { useCrm2Theme } from "./crm2-theme";
import { SELLERS } from "./kanban-data";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Страница «Клиенты» новой CRM (шаг 4 переноса).
 *
 * Как в основной CRM: все лиды компании одним списком и фильтр «Все /
 * Активные / Проигранные». Поиск — только по названию и ИНН: сервер ограничивает
 * каталог этими полями, чтобы не раскрывать содержимое чужой карточки; макет
 * повторяет то же правило. Строка ведёт на страницу лида /crm2/leads/:id.
 * Данные — общий вымышленный стор, запросов к серверу нет.
 */

type Filter = "all" | "active" | "lost";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "active", label: "Активные" },
  { key: "lost", label: "Проигранные" },
];

export function Crm2CustomersPage() {
  const theme = useCrm2Theme();
  const light = theme === "light";
  const { leads, stages } = useCrm2Board();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const query = search.trim().toLowerCase();
  const visible = leads.filter((lead) => {
    if (filter === "active" && lead.lost) return false;
    if (filter === "lost" && !lead.lost) return false;
    if (!query) return true;
    return `${lead.name} ${lead.inn}`.toLowerCase().includes(query);
  });

  const counts: Record<Filter, number> = {
    all: leads.length,
    active: leads.filter((lead) => !lead.lost).length,
    lost: leads.filter((lead) => lead.lost).length,
  };

  return (
    <div
      data-theme={theme}
      className={`flex h-full min-h-0 flex-col ${
        light ? "bg-[linear-gradient(160deg,#f7f6ff,#f3f7ff_45%,#f2fbf6)]" : "bg-[#15161b]"
      }`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
        <div>
          <h1 className="bg-gradient-to-r from-[#7c5cff] via-[#0ea5e9] to-[#84cc16] bg-clip-text text-[17px] font-extrabold text-transparent">
            Клиенты
          </h1>
          <p
            className={`mt-1 text-[12px] font-medium ${light ? "text-[#6b7280]" : "text-white/45"}`}
          >
            Все лиды компании · данные вымышленные
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-wrap items-center gap-3 px-5 pb-4">
        <div
          role="group"
          aria-label="Фильтр клиентов"
          className={`flex items-center gap-1 rounded-xl border p-1 ${
            light ? "border-[#e5e7eb] bg-white shadow-sm" : "border-white/[0.08] bg-white/[0.06]"
          }`}
        >
          {FILTERS.map(({ key, label }) => {
            const active = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#7c5cff] focus-visible:outline-none ${
                  active
                    ? key === "lost"
                      ? "bg-[#f43f5e] text-white"
                      : "bg-[#7c5cff] text-white"
                    : light
                      ? "text-[#6b7280] hover:text-[#111827]"
                      : "text-white/50 hover:text-white/80"
                }`}
              >
                {label}
                <span
                  className={`rounded-md px-1.5 text-[10.5px] font-bold tabular-nums ${
                    active
                      ? "bg-white/25"
                      : light
                        ? "bg-[#f3f4f6] text-[#6b7280]"
                        : "bg-white/[0.08] text-white/40"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className={`flex min-w-60 flex-1 items-center gap-2 rounded-xl border px-3 py-2 ${
            light ? "border-[#e5e7eb] bg-white shadow-sm" : "border-white/[0.08] bg-white/[0.06]"
          }`}
        >
          <Search
            aria-hidden="true"
            size={15}
            className={light ? "text-[#9ca3af]" : "text-white/35"}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Поиск по названию или ИНН…"
            aria-label="Поиск клиентов"
            className={`min-w-0 flex-1 bg-transparent text-[13px] outline-none ${
              light
                ? "text-[#111827] placeholder:text-[#9ca3af]"
                : "text-white/85 placeholder:text-white/30"
            }`}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div
          className={`overflow-hidden rounded-2xl border ${
            light ? "border-[#eceef2] bg-white shadow-sm" : "border-white/[0.07] bg-white/[0.04]"
          }`}
        >
          {visible.length === 0 ? (
            <div className="flex flex-col items-center gap-2.5 px-6 py-14 text-center">
              <Building2
                aria-hidden="true"
                size={26}
                className={light ? "text-[#c4b5fd]" : "text-[#8b7dff]"}
              />
              <p
                className={`text-[13px] font-semibold ${light ? "text-[#374151]" : "text-white/60"}`}
              >
                Ничего не найдено
              </p>
              <p
                className={`text-[12px] font-medium ${light ? "text-[#6b7280]" : "text-white/35"}`}
              >
                Попробуйте другое название или ИНН
              </p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr
                  className={`border-b text-[10.5px] font-bold tracking-wider uppercase ${
                    light
                      ? "border-[#eceef2] bg-[#fafafa] text-[#6b7280]"
                      : "border-white/[0.07] bg-white/[0.03] text-white/40"
                  }`}
                >
                  <th className="px-4 py-2.5 font-bold">Компания</th>
                  <th className="px-4 py-2.5 font-bold">ИНН</th>
                  <th className="px-4 py-2.5 font-bold">Контакт</th>
                  <th className="px-4 py-2.5 font-bold">Этап</th>
                  <th className="px-4 py-2.5 font-bold">Теги</th>
                  <th className="px-4 py-2.5 font-bold">Продавец</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => {
                  const stage = stages.find((item) => item.id === lead.stage_id);
                  const seller = SELLERS.find((item) => item.id === lead.assigned_to_id);
                  return (
                    <tr
                      key={lead.id}
                      className={`border-b transition-colors ${
                        light
                          ? "border-[#f1f2f6] hover:bg-[#f7f6ff]"
                          : "border-white/[0.05] hover:bg-white/[0.04]"
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          to={`/crm2/leads/${lead.id}`}
                          className={`text-[13px] font-semibold hover:underline ${
                            light ? "text-[#111827]" : "text-white/85"
                          }`}
                        >
                          {lead.name}
                        </Link>
                        {lead.lost && (
                          <span className="ml-2 rounded-md bg-[#f43f5e]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#f43f5e]">
                            Проигран
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-[11.5px] font-medium tabular-nums ${
                          light ? "text-[#6b7280]" : "text-white/45"
                        }`}
                      >
                        {lead.inn}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-[12px] ${
                          light ? "text-[#4b5563]" : "text-white/60"
                        }`}
                      >
                        {lead.logist_contact}
                        <span className={light ? "text-[#9ca3af]" : "text-white/30"}>
                          {" "}
                          · {lead.logist_phone}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {lead.lost ? (
                          <span className="rounded-md bg-[#f43f5e]/10 px-1.5 py-0.5 text-[10.5px] font-bold text-[#f43f5e]">
                            Вне воронки
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold"
                            style={{
                              backgroundColor: light
                                ? `${stage?.color.dot}14`
                                : `${stage?.color.dot}26`,
                              color: stage?.color.dot,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: stage?.color.dot }}
                            />
                            {stage?.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                              style={{
                                backgroundColor: light ? `${tag.color}18` : `${tag.color}26`,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </span>
                          ))}
                          {lead.tags.length === 0 && (
                            <span
                              className={`text-[11px] ${light ? "text-[#c4c9d4]" : "text-white/25"}`}
                            >
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-extrabold text-white"
                            style={{ backgroundColor: seller?.color ?? "#9ca3af" }}
                          >
                            {seller?.initials ?? "—"}
                          </span>
                          <span
                            className={`text-[12px] font-medium ${
                              light ? "text-[#4b5563]" : "text-white/60"
                            }`}
                          >
                            {seller?.name.split(" ")[0] ?? "—"}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
