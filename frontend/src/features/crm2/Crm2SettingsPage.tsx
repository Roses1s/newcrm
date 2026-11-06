import { useState } from "react";
import { ArrowDown, ArrowUp, Moon, Plus, RotateCcw, Sun, Trash2 } from "lucide-react";

import { setCrm2Theme, useCrm2Theme } from "./crm2-theme";
import { ThemeToggle } from "./ThemeToggle";
import {
  addStage,
  deleteStage,
  moveStage,
  recolorStage,
  renameStage,
  resetCrm2Board,
  useCrm2Board,
} from "./crm2-store";
import { STAGE_PALETTE } from "./kanban-data";

/**
 * Страница «Настройки» новой CRM (шаг 5 переноса): выбор темы оформления и
 * управление этапами воронки списком (те же действия, что на доске — здесь в
 * «админском» виде). Сброс возвращает вымышленные данные к посеву. Меняется
 * только макет в памяти: сервер и настоящая воронка не затрагиваются.
 */
export function Crm2SettingsPage() {
  const theme = useCrm2Theme();
  const light = theme === "light";
  const { stages, leads } = useCrm2Board();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const cardClass = light
    ? "border-[#eceef2] bg-white shadow-sm"
    : "border-white/[0.07] bg-white/[0.04]";
  const headerText = light ? "text-[#6b7280]" : "text-white/45";
  const titleText = light ? "text-[#111827]" : "text-white/85";
  const rowClass = light ? "border-[#eceef2] bg-[#fafafa]" : "border-white/[0.08] bg-white/[0.03]";
  const inputClass = `min-w-0 flex-1 rounded-lg border bg-transparent px-2.5 py-1.5 text-[12.5px] font-semibold outline-none transition ${
    light
      ? "border-[#e5e7eb] text-[#111827] focus:border-[#7c5cff]"
      : "border-white/[0.12] text-white/85 focus:border-[#8b7dff]/60"
  }`;

  function moveBy(stageId: number, direction: -1 | 1): void {
    const index = stages.findIndex((stage) => stage.id === stageId);
    const neighbor = stages[index + direction];
    if (!neighbor) return;
    // «Вверх» = встать перед соседом; «вниз» = сосед встаёт перед нами.
    if (direction === -1) moveStage(stageId, neighbor.id);
    else moveStage(neighbor.id, stageId);
  }

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
            Настройки
          </h1>
          <p className={`mt-1 text-[12px] font-medium ${headerText}`}>
            Тема и воронка · меняется только макет в браузере
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 pb-5 xl:grid-cols-2">
        <section
          aria-label="Тема оформления"
          className={`h-fit rounded-2xl border p-4 ${cardClass}`}
        >
          <h2 className={`text-[13px] font-bold ${titleText}`}>Оформление</h2>
          <p className={`mt-0.5 mb-4 text-[11.5px] font-medium ${headerText}`}>
            Выбор сохраняется в браузере и действует на все разделы новой CRM
          </p>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["light", "Светлая", Sun],
                ["dark", "Тёмная", Moon],
              ] as const
            ).map(([key, label, Icon]) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCrm2Theme(key)}
                  className={`overflow-hidden rounded-2xl border-2 p-1.5 text-left transition ${
                    active
                      ? "border-[#7c5cff] shadow-lg shadow-[#7c5cff]/20"
                      : light
                        ? "border-[#e5e7eb] hover:border-[#c9cdd6]"
                        : "border-white/[0.1] hover:border-white/25"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`space-y-1.5 rounded-xl p-3 ${
                      key === "light" ? "bg-[#f3f4f6]" : "bg-[#15161b]"
                    }`}
                  >
                    <div
                      className={`h-2 w-12 rounded-full ${
                        key === "light" ? "bg-[#d1d5db]" : "bg-white/15"
                      }`}
                    />
                    <div
                      className={`h-6 rounded-lg ${
                        key === "light" ? "bg-white" : "bg-white/[0.07]"
                      }`}
                    />
                    <div
                      className={`h-6 rounded-lg ${
                        key === "light" ? "bg-white" : "bg-white/[0.07]"
                      }`}
                    />
                  </div>
                  <div className="flex items-center gap-2 px-2 py-2">
                    <Icon
                      aria-hidden="true"
                      size={14}
                      className={
                        active ? "text-[#7c5cff]" : light ? "text-[#9ca3af]" : "text-white/40"
                      }
                    />
                    <span className={`text-[12.5px] font-bold ${titleText}`}>{label}</span>
                    {active && (
                      <span className="ml-auto rounded-md bg-[#7c5cff]/15 px-1.5 py-0.5 text-[10px] font-bold text-[#7c5cff]">
                        активна
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className={`mt-4 rounded-xl border p-3.5 ${rowClass}`}>
            <p className={`text-[12.5px] font-bold ${titleText}`}>Демо-данные</p>
            <p className={`mt-0.5 mb-3 text-[11.5px] font-medium ${headerText}`}>
              Вернуть исходный макет: лиды, этапы и ленты станут как при открытии страницы впервые
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirmReset) {
                  resetCrm2Board();
                  setConfirmReset(false);
                } else {
                  setConfirmReset(true);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-bold transition ${
                confirmReset
                  ? "bg-[#f43f5e] text-white"
                  : light
                    ? "bg-[#fff1f2] text-[#e11d48] hover:bg-[#ffe4e8]"
                    : "bg-[#f43f5e]/12 text-rose-300 hover:bg-[#f43f5e]/20"
              }`}
            >
              <RotateCcw aria-hidden="true" size={14} />
              {confirmReset ? "Точно сбросить макет?" : "Сбросить демо-данные"}
            </button>
          </div>
        </section>

        <section aria-label="Этапы воронки" className={`rounded-2xl border p-4 ${cardClass}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className={`text-[13px] font-bold ${titleText}`}>Этапы воронки</h2>
              <p className={`mt-0.5 text-[11.5px] font-medium ${headerText}`}>
                Название, цвет и порядок колонок доски · {stages.length} этапов,{" "}
                {leads.filter((lead) => !lead.lost).length} лидов
              </p>
            </div>
            <button
              type="button"
              onClick={() => addStage()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#7c5cff] px-3 py-2 text-[12px] font-bold text-white transition hover:bg-[#6d4df0]"
            >
              <Plus aria-hidden="true" size={14} /> Этап
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {stages.map((stage, index) => (
              <div key={stage.id} className={`rounded-xl border p-2.5 ${rowClass}`}>
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: stage.color.dot }}
                  />
                  <input
                    value={stage.name}
                    aria-label={`Название: ${stage.name}`}
                    onChange={(event) => {
                      const name = event.target.value;
                      if (name.trim()) renameStage(stage.id, name);
                    }}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    aria-label={`Этап «${stage.name}» выше`}
                    disabled={index === 0}
                    onClick={() => moveBy(stage.id, -1)}
                    className={`shrink-0 rounded-lg border p-1.5 transition disabled:opacity-30 ${
                      light
                        ? "border-[#e5e7eb] text-[#6b7280] hover:bg-white"
                        : "border-white/[0.12] text-white/50 hover:bg-white/[0.06]"
                    }`}
                  >
                    <ArrowUp aria-hidden="true" size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Этап «${stage.name}» ниже`}
                    disabled={index === stages.length - 1}
                    onClick={() => moveBy(stage.id, 1)}
                    className={`shrink-0 rounded-lg border p-1.5 transition disabled:opacity-30 ${
                      light
                        ? "border-[#e5e7eb] text-[#6b7280] hover:bg-white"
                        : "border-white/[0.12] text-white/50 hover:bg-white/[0.06]"
                    }`}
                  >
                    <ArrowDown aria-hidden="true" size={13} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Удалить этап «${stage.name}»`}
                    onClick={() => {
                      if (confirmDeleteId === stage.id) {
                        deleteStage(stage.id);
                        setConfirmDeleteId(null);
                      } else {
                        setConfirmDeleteId(stage.id);
                      }
                    }}
                    className={`shrink-0 rounded-lg border p-1.5 transition ${
                      confirmDeleteId === stage.id
                        ? "border-[#f43f5e] bg-[#f43f5e] text-white"
                        : light
                          ? "border-rose-200 text-[#e11d48] hover:bg-[#fff1f2]"
                          : "border-rose-300/30 text-rose-300 hover:bg-[#f43f5e]/10"
                    }`}
                  >
                    {confirmDeleteId === stage.id ? (
                      <span className="text-[10.5px] font-bold">Точно?</span>
                    ) : (
                      <Trash2 aria-hidden="true" size={13} />
                    )}
                  </button>
                </div>
                <div className="mt-2 flex gap-1.5 pl-5">
                  {STAGE_PALETTE.map((color) => (
                    <button
                      key={color.dot}
                      type="button"
                      title={`Цвет ${color.dot}`}
                      aria-label={`Цвет этапа ${stage.name} — ${color.dot}`}
                      onClick={() => recolorStage(stage.id, color)}
                      className="h-4 w-4 rounded-full transition-transform hover:scale-110"
                      style={{
                        backgroundColor: color.dot,
                        boxShadow:
                          color.dot === stage.color.dot
                            ? `0 0 0 2px ${light ? "#fff" : "#15161b"}, 0 0 0 3.5px ${color.dot}`
                            : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-[11px] font-medium ${headerText}`}>
            При удалении этапа его карточки переезжают в первый оставшийся — как в основной CRM.
          </p>
        </section>
      </div>
    </div>
  );
}
