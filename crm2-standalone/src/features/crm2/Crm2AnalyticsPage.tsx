import { useCrm2Board } from "./crm2-store";
import { useCrm2Theme } from "./crm2-theme";
import { SELLERS, SOURCE_STYLES } from "./kanban-data";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Страница «Аналитика» новой CRM (шаг 5 переноса).
 *
 * Всё считается на клиенте из общего макетного стора, сервер не
 * запрашивается: воронка по этапам в цветах владельца, динамика
 * поступления за 8 недель (макетные даты создания), источники (макет-поле
 * карточки) и рейтинг продавцов. Поля «источник» помечены макетными там же,
 * где и везде: при подключении настоящих данных форма отчётов решается
 * отдельно.
 */

const WEEK_MS = 7 * 86_400_000;

export function Crm2AnalyticsPage() {
  const theme = useCrm2Theme();
  const light = theme === "light";
  const { leads, stages } = useCrm2Board();

  const active = leads.filter((lead) => !lead.lost);
  const lostCount = leads.length - active.length;

  // Воронка по этапам: доля активных лидов, цвета этапов.
  const funnel = stages.map((stage) => ({
    stage,
    count: active.filter((lead) => lead.stage_id === stage.id).length,
  }));
  const maxFunnel = Math.max(1, ...funnel.map((item) => item.count));

  // Динамика: лидов за каждую из последних 8 недель (старшая слева — во всех
  // смотреть непривычно, поэтому слева прошлое, справа — свежая неделя).
  const now = Date.now();
  const weeks = Array.from({ length: 8 }, (_, index) => {
    const end = now - (7 - index) * WEEK_MS;
    const start = end - WEEK_MS;
    return {
      label: index === 7 ? "эта нед." : `${8 - index} нед. назад`,
      count: leads.filter((lead) => {
        const at = new Date(lead.created_at ?? "").getTime();
        return Number.isFinite(at) && at > start && at <= end;
      }).length,
    };
  });
  const maxWeek = Math.max(1, ...weeks.map((week) => week.count));
  const points = weeks
    .map(
      (week, index) => `${(index / (weeks.length - 1)) * 100},${40 - (week.count / maxWeek) * 33}`,
    )
    .join(" ");

  // Источники: цвета те же, что у меток на карточках.
  const sources = Object.entries(
    active.reduce<Record<string, number>>((acc, lead) => {
      acc[lead.source] = (acc[lead.source] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const maxSource = Math.max(1, ...sources.map(([, count]) => count));

  // Рейтинг продавцов по активным лидам.
  const rating = SELLERS.map((seller) => ({
    seller,
    total: active.filter((lead) => lead.assigned_to_id === seller.id).length,
    hot: active.filter((lead) => lead.assigned_to_id === seller.id && lead.priority === 3).length,
  })).sort((a, b) => b.total - a.total);
  const maxSeller = Math.max(1, ...rating.map((item) => item.total));

  const cardClass = light
    ? "border-[#eceef2] bg-white shadow-sm"
    : "border-white/[0.07] bg-white/[0.04]";
  const headerText = light ? "text-[#6b7280]" : "text-white/45";
  const titleText = light ? "text-[#111827]" : "text-white/85";

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
            Аналитика
          </h1>
          <p className={`mt-1 text-[12px] font-medium ${headerText}`}>
            Воронка и динамика · данные вымышленные
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 pb-5 xl:grid-cols-2">
        <section aria-label="Воронка продаж" className={`rounded-2xl border p-4 ${cardClass}`}>
          <h2 className={`text-[13px] font-bold ${titleText}`}>Воронка продаж</h2>
          <p className={`mt-0.5 mb-4 text-[11.5px] font-medium ${headerText}`}>
            {active.length} активных лидов · {lostCount} вне воронки
          </p>
          <div className="space-y-2.5">
            {funnel.map(({ stage, count }) => (
              <div key={stage.id}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span
                    className="inline-flex items-center gap-1.5 font-semibold"
                    style={{ color: stage.color.dot }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: stage.color.dot }}
                    />
                    {stage.name}
                  </span>
                  <span className={`font-bold tabular-nums ${headerText}`}>{count}</span>
                </div>
                <div
                  className={`h-2.5 overflow-hidden rounded-full ${
                    light ? "bg-[#f1f2f6]" : "bg-white/[0.07]"
                  }`}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(count > 0 ? 4 : 0, (count / maxFunnel) * 100)}%`,
                      backgroundColor: stage.color.dot,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section aria-label="Поступление лидов" className={`rounded-2xl border p-4 ${cardClass}`}>
          <h2 className={`text-[13px] font-bold ${titleText}`}>Поступление лидов</h2>
          <p className={`mt-0.5 mb-4 text-[11.5px] font-medium ${headerText}`}>
            По неделям за последние восемь
          </p>
          <svg
            aria-label="График поступления лидов по неделям"
            viewBox="0 0 100 44"
            preserveAspectRatio="none"
            className="h-36 w-full"
          >
            <defs>
              <linearGradient id="crm2-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c5cff" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#7c5cff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[0, 1, 2].map((i) => (
              <line
                key={i}
                x1="0"
                x2="100"
                y1={8 + i * 13}
                y2={8 + i * 13}
                stroke={light ? "#e5e7eb" : "rgba(255,255,255,0.08)"}
                strokeWidth="0.3"
              />
            ))}
            <polygon points={`0,42 ${points} 100,42`} fill="url(#crm2-area)" />
            <polyline
              points={points}
              fill="none"
              stroke="#7c5cff"
              strokeWidth="1.4"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div
            className={`mt-2 flex justify-between text-[10px] font-bold tabular-nums ${headerText}`}
          >
            <span>{weeks[0].count}</span>
            <span>{weeks[2].count}</span>
            <span>{weeks[4].count}</span>
            <span>{weeks[6].count}</span>
            <span>{weeks[7].count}</span>
          </div>
        </section>

        <section aria-label="Источники лидов" className={`rounded-2xl border p-4 ${cardClass}`}>
          <h2 className={`text-[13px] font-bold ${titleText}`}>Источники лидов</h2>
          <p className={`mt-0.5 mb-4 text-[11.5px] font-medium ${headerText}`}>
            Метки источника — макет-поле карточки
          </p>
          <div className="space-y-2.5">
            {sources.map(([source, count]) => {
              const color = SOURCE_STYLES[source]?.color ?? "#94a3b8";
              return (
                <div key={source} className="flex items-center gap-3">
                  <span
                    className="w-28 shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
                    style={{
                      backgroundColor: light ? `${color}14` : `${color}26`,
                      color,
                    }}
                  >
                    {source}
                  </span>
                  <div
                    className={`h-2 flex-1 overflow-hidden rounded-full ${
                      light ? "bg-[#f1f2f6]" : "bg-white/[0.07]"
                    }`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(count / maxSource) * 100}%`, backgroundColor: color }}
                    />
                  </div>
                  <span
                    className={`w-6 text-right text-[12px] font-bold tabular-nums ${titleText}`}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section aria-label="Рейтинг продавцов" className={`rounded-2xl border p-4 ${cardClass}`}>
          <h2 className={`text-[13px] font-bold ${titleText}`}>Рейтинг продавцов</h2>
          <p className={`mt-0.5 mb-4 text-[11.5px] font-medium ${headerText}`}>
            Активные лиды и горячие (приоритет ★★★)
          </p>
          <div className="space-y-3">
            {rating.map(({ seller, total, hot }, index) => (
              <div key={seller.id} className="flex items-center gap-3">
                <span
                  className={`w-5 text-center text-[11px] font-extrabold tabular-nums ${headerText}`}
                >
                  {index + 1}
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: seller.color }}
                >
                  {seller.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className={`truncate font-semibold ${titleText}`}>{seller.name}</span>
                    <span className={`font-bold tabular-nums ${headerText}`}>
                      {total} · горячих {hot}
                    </span>
                  </div>
                  <div
                    className={`mt-1 h-1.5 overflow-hidden rounded-full ${
                      light ? "bg-[#f1f2f6]" : "bg-white/[0.07]"
                    }`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(total / maxSeller) * 100}%`,
                        backgroundColor: seller.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
