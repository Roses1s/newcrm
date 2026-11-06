import { useCallback, useState, type DragEvent } from "react";
import { Flame, Globe, LayoutGrid, Plus, TrendingUp } from "lucide-react";

import {
  addStage as addStageToStore,
  deleteLead,
  deleteStage as deleteStageFromStore,
  loseLead,
  moveLead,
  moveStage,
  recolorStage,
  renameStage,
  setLeadPriority,
  useCrm2Board,
} from "./crm2-store";
import { useCrm2Theme } from "./crm2-theme";
import type { StageId } from "./kanban-data";
import { LEAD_MIME } from "./LeadBoardCard";
import { STAGE_MIME, LeadBoardColumn } from "./LeadBoardColumn";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Красочная канбан-доска /crm2 (шаг 2 переноса демо-версии владельца).
 *
 * Этапы — те шесть, что задал владелец, в его палитре; состав карточки
 * повторяет реальные поля лида основной CRM (название, ИНН, контакт и
 * телефон логиста, теги, звёзды приоритета 0–3, продавец) плюс согласованные
 * макет-поля «источник» и «сколько назад». Форма данных — как в ответах API,
 * чтобы подключение сервера стало заменой источника.
 *
 * Механика (всё в памяти страницы, сервер не трогается): перетаскивание
 * карточек между колонками и точная вставка перед картой, перестановка
 * колонок за их заголовок, меню карточки (перенос/проигрыш/удаление),
 * управление этапами в заголовке колонки (переименование по двойному клику,
 * цвет, удаление с переносом карточек в первый оставшийся этап), добавление
 * этапа в конец. Над доской — строка показателей, живая от текущего макета.
 * Тема общая на весь /crm2 (crm2-theme.ts), тумблер — в шапке (решение
 * владельца от 31.10.2026). Левая панель не затрагивается.
 */
export function LeadBoard() {
  const theme = useCrm2Theme();
  // Карточки и этапы — общее макетное состояние CRM2 (crm2-store.ts): оно
  // делится со страницей лида и переживает переходы по меню.
  const { leads, stages } = useCrm2Board();
  const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);
  const [editingStageId, setEditingStageId] = useState<number | null>(null);

  const light = theme === "light";

  const consumeEditRequest = useCallback(() => setEditingStageId(null), []);

  // --- Карточки ----------------------------------------------------------

  function handleLeadDragStart(event: DragEvent<HTMLElement>, leadId: number): void {
    event.dataTransfer.setData(LEAD_MIME, String(leadId));
    event.dataTransfer.setData("text/plain", String(leadId));
    event.dataTransfer.effectAllowed = "move";
    setDraggingLeadId(leadId);
  }

  function handleLeadDragEnd(): void {
    setDraggingLeadId(null);
    setOverStage(null);
  }

  function handleColumnDrop(event: DragEvent<HTMLElement>, stageId: StageId): void {
    const stagePayload = event.dataTransfer.getData(STAGE_MIME);
    if (stagePayload) {
      moveStage(Number(stagePayload), stageId);
      setOverStage(null);
      return;
    }
    const leadPayload = event.dataTransfer.getData(LEAD_MIME);
    if (leadPayload) moveLead(Number(leadPayload), stageId, null);
    setOverStage(null);
  }

  function handleDropBeforeCard(event: DragEvent<HTMLElement>, beforeLeadId: number): void {
    const leadPayload = event.dataTransfer.getData(LEAD_MIME);
    if (!leadPayload) return;
    const target = leads.find((lead) => lead.id === beforeLeadId);
    if (target) moveLead(Number(leadPayload), target.stage_id, beforeLeadId);
    setOverStage(null);
  }

  function loseMockLead(leadId: number): void {
    // Быстрый проигрыш с доски идёт с причиной по умолчанию; выбор причины
    // живёт на странице лида (шаг 3), где она обязательна.
    loseLead(leadId, "Цена не устроила");
  }

  // --- Этапы -------------------------------------------------------------

  function addStage(): void {
    // Новая колонка сразу ждёт своё название в режиме правки.
    setEditingStageId(addStageToStore());
  }

  function handleStageDragStart(event: DragEvent<HTMLElement>, stageId: number): void {
    event.dataTransfer.setData(STAGE_MIME, String(stageId));
    event.dataTransfer.effectAllowed = "move";
  }

  // --- Показатели над доской ---------------------------------------------

  const activeLeads = leads.filter((lead) => !lead.lost);
  const kpis = [
    {
      label: "Всего лидов",
      value: activeLeads.length,
      icon: LayoutGrid,
      color: "#7c5cff",
      bg: light ? "#ede9ff" : "rgba(124,92,255,0.16)",
    },
    {
      label: "Горячие",
      value: activeLeads.filter((lead) => lead.priority === 3).length,
      icon: Flame,
      color: "#f43f5e",
      bg: light ? "#ffe4e8" : "rgba(244,63,94,0.16)",
    },
    {
      label: "Потенциальные",
      value: activeLeads.filter((lead) => lead.stage_id === 4).length,
      icon: TrendingUp,
      color: "#14b8a6",
      bg: light ? "#dcf7f3" : "rgba(20,184,166,0.16)",
    },
    {
      label: "С сайта",
      value: activeLeads.filter((lead) => lead.source === "Сайт").length,
      icon: Globe,
      color: "#0ea5e9",
      bg: light ? "#e0f3fe" : "rgba(14,165,233,0.16)",
    },
  ];

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
            Мои лиды
          </h1>
          <p
            className={`mt-1 text-[12px] font-medium ${light ? "text-[#6b7280]" : "text-white/45"}`}
          >
            По состоянию на сегодня · данные вымышленные
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div
        aria-label="Показатели доски"
        className="grid grid-cols-2 gap-3 px-5 pb-4 lg:grid-cols-4"
      >
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className={`flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
              light
                ? "border-[#eceef2] bg-white/80 shadow-sm"
                : "border-white/[0.07] bg-white/[0.04]"
            }`}
          >
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ backgroundColor: bg, color }}
            >
              <Icon size={17} strokeWidth={2} />
            </span>
            <div className="leading-tight">
              <p
                className={`text-[10.5px] font-bold tracking-wider uppercase ${
                  light ? "text-[#6b7280]" : "text-white/40"
                }`}
              >
                {label}
              </p>
              <p
                className={`text-[17px] font-extrabold tabular-nums ${
                  light ? "text-[#111827]" : "text-white"
                }`}
              >
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto px-5 pb-5">
        {stages.map((stage) => (
          <LeadBoardColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            leads={leads.filter((lead) => lead.stage_id === stage.id)}
            light={light}
            isOver={overStage === stage.id}
            draggingLeadId={draggingLeadId}
            startEditingTitle={editingStageId === stage.id}
            onEditConsumed={consumeEditRequest}
            onLeadDragStart={handleLeadDragStart}
            onLeadDragEnd={handleLeadDragEnd}
            onLeadDrop={handleColumnDrop}
            onLeadDropBefore={handleDropBeforeCard}
            onOver={(stageId) => setOverStage(stageId)}
            onOverEnd={(stageId) =>
              setOverStage((current) => (current === stageId ? null : current))
            }
            onRename={renameStage}
            onRecolor={recolorStage}
            onDelete={deleteStageFromStore}
            onMoveLead={(leadId, stageId) => moveLead(leadId, stageId, null)}
            onLoseLead={loseMockLead}
            onDeleteLead={deleteLead}
            onPriorityLead={setLeadPriority}
            onStageDragStart={handleStageDragStart}
            onStageDragEnd={() => setOverStage(null)}
          />
        ))}

        <button
          type="button"
          onClick={addStage}
          className={`flex w-[180px] shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed transition-colors ${
            light
              ? "border-[#c9cdd6] text-[#6b7280] hover:border-[#7c5cff] hover:text-[#7c5cff]"
              : "border-white/[0.14] text-white/40 hover:border-[#7c5cff]/70 hover:text-[#8b7dff]"
          }`}
        >
          <Plus aria-hidden="true" size={18} strokeWidth={2} />
          <span className="text-[12px] font-semibold">Новый этап</span>
        </button>
      </div>
    </div>
  );
}
