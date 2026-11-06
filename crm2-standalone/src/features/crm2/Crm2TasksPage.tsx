import { AlarmClockCheck, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

import { contactTimeLabel } from "./time-label";
import { completeTask, useCrm2Board } from "./crm2-store";
import { useCrm2Theme } from "./crm2-theme";
import { SELLERS, type BoardLead } from "./kanban-data";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Страница «Задачи» новой CRM (шаг 4 переноса).
 *
 * Напоминания по лидам в трёх колонках: просроченные, сегодняшние и
 * предстоящие. Кнопка «Выполнить» снимает напоминание и пишет запись в ленту
 * карточки. Переход по строке — на страницу лида.
 *
 * ВАЖНО: это макетная функция. Поля «следующий контакт» на сервере нет
 * (действия удалены из основной CRM решением владельца 29.09.2026), поэтому
 * страница работает на вымышленных сроках из crm2-store. Подключение
 * настоящих данных и судьба страницы — отдельное решение владельца.
 */

type Bucket = "overdue" | "today" | "upcoming";

function bucketOf(iso: string, now: number): Bucket {
  const at = new Date(iso).getTime();
  if (at < now) return "overdue";
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "today";
  return "upcoming";
}

const GROUPS: { key: Bucket; title: string; color: string }[] = [
  { key: "overdue", title: "Просрочено", color: "#f43f5e" },
  { key: "today", title: "Сегодня", color: "#f59e0b" },
  { key: "upcoming", title: "Предстоящие", color: "#7c5cff" },
];

export function Crm2TasksPage() {
  const theme = useCrm2Theme();
  const light = theme === "light";
  const { leads, stages } = useCrm2Board();
  const now = Date.now();

  const withTasks = leads.filter((lead) => !lead.lost && lead.next_contact_at);
  const byBucket = GROUPS.map((group) => ({
    ...group,
    items: withTasks
      .filter((lead) => bucketOf(lead.next_contact_at!, now) === group.key)
      .sort(
        (a, b) => new Date(a.next_contact_at!).getTime() - new Date(b.next_contact_at!).getTime(),
      ),
  }));

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
            Задачи
          </h1>
          <p
            className={`mt-1 text-[12px] font-medium ${light ? "text-[#6b7280]" : "text-white/45"}`}
          >
            Напоминания по лидам · данные и сроки вымышленные
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 pb-5 xl:grid-cols-3">
        {byBucket.map((group) => (
          <section
            key={group.key}
            aria-label={`Задачи: ${group.title}`}
            className={`flex h-fit flex-col rounded-2xl border p-3 ${
              light ? "border-[#eceef2] bg-white shadow-sm" : "border-white/[0.07] bg-white/[0.04]"
            }`}
          >
            <header className="flex items-center gap-2 px-1.5 pt-1 pb-3">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: group.color }}
              />
              <h2 className={`text-[13px] font-bold ${light ? "text-[#374151]" : "text-white/85"}`}>
                {group.title}
              </h2>
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
                style={{
                  backgroundColor: light ? `${group.color}14` : `${group.color}26`,
                  color: group.color,
                }}
              >
                {group.items.length}
              </span>
            </header>

            <div className="space-y-2">
              {group.items.length === 0 && (
                <p
                  className={`rounded-xl border border-dashed px-3 py-6 text-center text-[11.5px] font-medium ${
                    light ? "border-[#d8dbe3] text-[#9ca3af]" : "border-white/[0.1] text-white/30"
                  }`}
                >
                  Задач нет
                </p>
              )}
              {group.items.map((lead) => (
                <TaskCard key={lead.id} lead={lead} stages={stages} light={light} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function TaskCard({
  lead,
  stages,
  light,
}: {
  lead: BoardLead;
  stages: { id: number; name: string; color: { dot: string; tint: string; dark: string } }[];
  light: boolean;
}) {
  const stage = stages.find((item) => item.id === lead.stage_id);
  const seller = SELLERS.find((item) => item.id === lead.assigned_to_id);
  const overdue = new Date(lead.next_contact_at!).getTime() < Date.now();

  return (
    <article
      className={`group rounded-xl border p-3 transition-all ${
        light
          ? "border-[#eceef2] bg-white hover:shadow-[0_6px_16px_rgba(15,23,42,0.08)]"
          : "border-white/[0.07] bg-white/[0.05] hover:bg-white/[0.08]"
      }`}
      style={{ borderLeft: `3px solid ${stage?.color.dot ?? "#9ca3af"}` }}
    >
      <div className="flex items-start gap-2 pl-1">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[12.5px] font-semibold leading-snug ${
              light ? "text-[#111827]" : "text-white/85"
            }`}
          >
            {lead.next_contact_text}
          </p>
          <Link
            to={`/crm2/leads/${lead.id}`}
            className={`mt-0.5 inline-block truncate text-[11.5px] font-semibold hover:underline ${
              light ? "text-[#7c5cff]" : "text-[#8b7dff]"
            }`}
          >
            {lead.name}
          </Link>
        </div>
        <button
          type="button"
          aria-label={`Выполнить задачу: ${lead.next_contact_text} (${lead.name})`}
          title="Выполнить напоминание"
          onClick={() => completeTask(lead.id)}
          className={`shrink-0 rounded-lg p-1.5 transition-colors ${
            light
              ? "text-[#9ca3af] hover:bg-[#ecfdf5] hover:text-[#059669]"
              : "text-white/35 hover:bg-white/[0.08] hover:text-[#84cc16]"
          }`}
        >
          <CheckCircle2 aria-hidden="true" size={16} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 pl-1">
        <span
          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            overdue
              ? "bg-[#f43f5e]/12 text-[#f43f5e]"
              : light
                ? "bg-[#f3f4f6] text-[#6b7280]"
                : "bg-white/[0.08] text-white/45"
          }`}
        >
          <AlarmClockCheck aria-hidden="true" size={11} />
          {contactTimeLabel(lead.next_contact_at!)}
        </span>
        {stage && (
          <span
            className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
            style={{
              backgroundColor: light ? `${stage.color.dot}14` : `${stage.color.dot}26`,
              color: stage.color.dot,
            }}
          >
            {stage.name}
          </span>
        )}
        <span
          title={seller ? `Продавец: ${seller.name}` : undefined}
          className="ml-auto grid h-5 w-5 shrink-0 place-items-center rounded-full text-[8px] font-extrabold text-white"
          style={{ backgroundColor: seller?.color ?? "#9ca3af" }}
        >
          {seller?.initials ?? "—"}
        </span>
      </div>
    </article>
  );
}
