import { useEffect, useState, type DragEvent } from "react";
import { MoreVertical, PencilLine, X } from "lucide-react";

import { STAGE_PALETTE, type BoardLead, type BoardStage, type StageColor } from "./kanban-data";
import { LeadBoardCard } from "./LeadBoardCard";

/**
 * Колонка доски /crm2: красочная шапка с заголовком, счётчиком и меню этапа.
 *
 * Этап — живой: переименовывается по двойному клику, у него можно сменить
 * цвет из палитры CRM2 или удалить колонку (карточки переезжают в первую
 * оставшуюся — правило как в основной CRM при удалении с переносом).
 * Колонки сами перетаскиваются за заголовок — порядок меняется мышью.
 * Всё это макет в памяти страницы: сервер не трогается.
 */

export const STAGE_MIME = "application/x-crm2-stage";

interface ColumnProps {
  stage: BoardStage;
  stages: BoardStage[];
  leads: BoardLead[];
  light: boolean;
  isOver: boolean;
  draggingLeadId: number | null;
  startEditingTitle: boolean;
  onEditConsumed: () => void;
  onLeadDragStart: (event: DragEvent<HTMLElement>, leadId: number) => void;
  onLeadDragEnd: () => void;
  onLeadDrop: (event: DragEvent<HTMLElement>, stageId: number) => void;
  onLeadDropBefore: (event: DragEvent<HTMLElement>, beforeLeadId: number) => void;
  onOver: (stageId: number) => void;
  onOverEnd: (stageId: number) => void;
  onRename: (stageId: number, name: string) => void;
  onRecolor: (stageId: number, color: StageColor) => void;
  onDelete: (stageId: number) => void;
  onMoveLead: (leadId: number, stageId: number) => void;
  onLoseLead: (leadId: number) => void;
  onDeleteLead: (leadId: number) => void;
  onPriorityLead: (leadId: number, priority: number) => void;
  onStageDragStart: (event: DragEvent<HTMLElement>, stageId: number) => void;
  onStageDragEnd: () => void;
}

export function LeadBoardColumn({
  stage,
  stages,
  leads,
  light,
  isOver,
  draggingLeadId,
  startEditingTitle,
  onEditConsumed,
  onLeadDragStart,
  onLeadDragEnd,
  onLeadDrop,
  onLeadDropBefore,
  onOver,
  onOverEnd,
  onRename,
  onRecolor,
  onDelete,
  onMoveLead,
  onLoseLead,
  onDeleteLead,
  onPriorityLead,
  onStageDragStart,
  onStageDragEnd,
}: ColumnProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stage.name);

  // Режим правки по запросу сверху (свежедобавленный этап сразу ждёт имя):
  // запускаем в эффекте, а не при рендере, чтобы не трогать состояние доски
  // посреди отрисовки.
  useEffect(() => {
    if (startEditingTitle) {
      setDraft(stage.name);
      setEditing(true);
      onEditConsumed();
    }
  }, [startEditingTitle, stage.name, onEditConsumed]);

  function commitRename(): void {
    const name = draft.trim();
    if (name && name !== stage.name) onRename(stage.id, name);
    else setDraft(stage.name);
    setEditing(false);
  }

  return (
    <section
      aria-label={`Колонка ${stage.name}`}
      className={`flex w-[300px] shrink-0 flex-col rounded-2xl transition-all ${
        light ? "shadow-sm" : ""
      }`}
      style={{
        backgroundColor: light ? stage.color.tint : stage.color.dark,
        boxShadow: isOver ? `inset 0 0 0 2px ${stage.color.dot}` : undefined,
      }}
    >
      <header
        aria-label={`Заголовок этапа ${stage.name}`}
        title="Перетащите, чтобы поменять порядок; двойной клик — переименовать"
        draggable
        onDragStart={(event) => onStageDragStart(event, stage.id)}
        onDragEnd={onStageDragEnd}
        className="flex cursor-grab items-center gap-2 px-3.5 pt-3 pb-2 active:cursor-grabbing"
      >
        <span
          aria-hidden="true"
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: stage.color.dot }}
        />
        {editing ? (
          <input
            autoFocus
            value={draft}
            aria-label={`Название этапа ${stage.name}`}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitRename();
              if (event.key === "Escape") {
                setDraft(stage.name);
                setEditing(false);
              }
            }}
            onClick={(event) => event.stopPropagation()}
            className={`min-w-0 flex-1 rounded-md border px-1.5 py-0.5 text-[13px] font-bold outline-none ${
              light
                ? "border-[#c4b5fd] bg-white text-[#111827]"
                : "border-white/25 bg-white/10 text-white"
            }`}
            style={{ borderColor: stage.color.dot }}
          />
        ) : (
          <h2
            onDoubleClick={() => {
              setDraft(stage.name);
              setEditing(true);
            }}
            className={`truncate text-[13px] font-bold ${light ? "" : "text-white/85"}`}
            style={light ? { color: stage.color.dot } : undefined}
          >
            {stage.name}
          </h2>
        )}
        <span
          className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${
            light ? "bg-white shadow-sm" : "bg-white/[0.09]"
          }`}
          style={{ color: stage.color.dot }}
        >
          {leads.filter((lead) => !lead.lost).length}
        </span>
        <div className="relative">
          <button
            type="button"
            aria-label={`Настройки этапа ${stage.name}`}
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
              setConfirmDelete(false);
            }}
            className={`rounded-md p-1 transition-colors ${
              light
                ? "text-[#9ca3af] hover:bg-white hover:text-[#374151]"
                : "text-white/35 hover:bg-white/10 hover:text-white/85"
            }`}
          >
            <MoreVertical aria-hidden="true" size={14} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              tabIndex={-1}
              aria-label={`Настройки этапа ${stage.name}`}
              onMouseDown={(event) => event.stopPropagation()}
              className={`absolute top-7 right-0 z-30 w-52 overflow-hidden rounded-xl border py-1.5 shadow-xl ${
                light
                  ? "border-[#e5e7eb] bg-white"
                  : "border-white/[0.1] bg-[#1d1f26] shadow-black/40"
              }`}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setDraft(stage.name);
                  setEditing(true);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium ${
                  light
                    ? "text-[#374151] hover:bg-[#f3f4f6]"
                    : "text-white/70 hover:bg-white/[0.06]"
                }`}
              >
                <PencilLine aria-hidden="true" size={13} />
                Переименовать этап
              </button>

              <p
                className={`px-3 pt-2 pb-1 text-[10px] font-bold tracking-wider uppercase ${
                  light ? "text-[#9ca3af]" : "text-white/30"
                }`}
              >
                Цвет этапа
              </p>
              <div className="flex gap-1.5 px-3 pb-2">
                {STAGE_PALETTE.map((color) => (
                  <button
                    key={color.dot}
                    type="button"
                    title={`Цвет ${color.dot}`}
                    aria-label={`Цвет этапа ${color.dot}`}
                    onClick={() => {
                      onRecolor(stage.id, color);
                      setMenuOpen(false);
                    }}
                    className="h-5 w-5 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color.dot,
                      boxShadow:
                        color.dot === stage.color.dot
                          ? `0 0 0 2px ${light ? "#fff" : "#1d1f26"}, 0 0 0 4px ${color.dot}`
                          : undefined,
                    }}
                  />
                ))}
              </div>

              <div className={`h-px ${light ? "bg-[#e5e7eb]" : "bg-white/[0.08]"}`} />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (confirmDelete) onDelete(stage.id);
                  else setConfirmDelete(true);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium ${
                  light
                    ? "text-[#e11d48] hover:bg-[#fff1f2]"
                    : "text-rose-300/90 hover:bg-white/[0.06]"
                }`}
              >
                {confirmDelete && <X aria-hidden="true" size={13} />}
                {confirmDelete ? "Точно удалить? Карточки переедут в первый этап" : "Удалить этап"}
              </button>
            </div>
          )}
        </div>
      </header>

      <div
        role="list"
        aria-label={`Карточки этапа ${stage.name}`}
        className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2.5 pb-2.5"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          onOver(stage.id);
        }}
        onDragLeave={() => onOverEnd(stage.id)}
        onDrop={(event) => {
          event.preventDefault();
          onLeadDrop(event, stage.id);
        }}
      >
        {leads.filter((lead) => !lead.lost).length === 0 && (
          <p
            className="rounded-xl border border-dashed px-1 py-4 text-center text-[11px] font-medium"
            style={{ borderColor: `${stage.color.dot}66`, color: stage.color.dot }}
          >
            {isOver ? "Перетащите сюда" : "Пусто"}
          </p>
        )}
        {leads
          .filter((lead) => !lead.lost)
          .map((lead) => (
            <LeadBoardCard
              key={lead.id}
              lead={lead}
              stage={stage}
              stages={stages}
              light={light}
              dragging={draggingLeadId === lead.id}
              onDragStart={onLeadDragStart}
              onDragEnd={onLeadDragEnd}
              onDropBefore={onLeadDropBefore}
              onMove={onMoveLead}
              onLose={onLoseLead}
              onDelete={onDeleteLead}
              onPriority={onPriorityLead}
            />
          ))}
      </div>
    </section>
  );
}
