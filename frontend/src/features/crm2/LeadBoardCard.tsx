import { useEffect, useState, type DragEvent } from "react";
import { MoreVertical, X } from "lucide-react";
import { Link } from "react-router-dom";

import { SOURCE_STYLES, SELLERS, type BoardLead, type BoardStage } from "./kanban-data";

/**
 * Карточка лида доски /crm2.
 *
 * Состав согласован с владельцем: название, ИНН, контакт логиста и телефон,
 * цветные теги, приоритет звёздами, продавец, метка источника и «сколько
 * назад». Клик по названию ведёт на отдельную страницу лида (решение
 * владельца от 31.10.2026 — страница с чаттером, как в основной CRM).
 *
 * Перетаскивание нативное: карточка умеет принимать другую карточку «перед
 * собой» (onDropBefore) — так её можно вставить в середину колонки, а не
 * только в конец. Все изменения живут в памяти макета: сервер не трогается.
 */

export const LEAD_MIME = "application/x-crm2-lead";

interface CardProps {
  lead: BoardLead;
  stage: BoardStage;
  stages: BoardStage[];
  light: boolean;
  dragging: boolean;
  onDragStart: (event: DragEvent<HTMLElement>, leadId: number) => void;
  onDragEnd: () => void;
  onDropBefore: (event: DragEvent<HTMLElement>, beforeLeadId: number) => void;
  onMove: (leadId: number, stageId: number) => void;
  onLose: (leadId: number) => void;
  onDelete: (leadId: number) => void;
  onPriority: (leadId: number, priority: number) => void;
}

/** Звёзды приоритета. Цвета здесь явные, потому что CRM2 не пользуется
 *  тёмными токенами старой CRM (StarRating) и в тёмной теме ей нужны свои. */
function CardStars({
  value,
  light,
  onChange,
}: {
  value: number;
  light: boolean;
  onChange: (priority: number) => void;
}) {
  const active = "#f59e0b";
  const inactive = light ? "#d1d5db" : "rgba(255,255,255,0.25)";
  return (
    <span aria-label={`Приоритет: ${value} из 3`} className="flex shrink-0 leading-none">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Приоритет ${n}`}
          onClick={(event) => {
            event.stopPropagation();
            onChange(value === n ? 0 : n);
          }}
          className="cursor-pointer px-px text-[14px] transition-transform hover:scale-110 focus-visible:outline-none"
          style={{ color: value >= n ? active : inactive }}
        >
          {value >= n ? "★" : "☆"}
        </button>
      ))}
    </span>
  );
}

export function LeadBoardCard({
  lead,
  stage,
  stages,
  light,
  dragging,
  onDragStart,
  onDragEnd,
  onDropBefore,
  onMove,
  onLose,
  onDelete,
  onPriority,
}: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dropHere, setDropHere] = useState(false);
  const seller = SELLERS.find((s) => s.id === lead.assigned_to_id);
  const source = SOURCE_STYLES[lead.source];
  const sourceStyle = source
    ? light
      ? { backgroundColor: source.tint, color: source.color }
      : { backgroundColor: `${source.color}26`, color: source.color }
    : undefined;

  // Удаление из макета — необратимо для сессии страницы, поэтому спрашиваем
  // вторым кликом в том же меню, без браузерного alert.
  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => {
      setMenuOpen(false);
      setConfirmDelete(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  return (
    <article
      role="listitem"
      draggable
      onDragStart={(event) => onDragStart(event, lead.id)}
      onDragEnd={onDragEnd}
      onDragOver={(event) => {
        // Карточка принимает только карточки, колонки примут контейнеры.
        if (event.dataTransfer.types.includes(LEAD_MIME)) {
          event.preventDefault();
          event.stopPropagation();
          setDropHere(true);
        }
      }}
      onDragLeave={() => setDropHere(false)}
      onDrop={(event) => {
        setDropHere(false);
        event.preventDefault();
        event.stopPropagation();
        onDropBefore(event, lead.id);
      }}
      className={`relative cursor-grab rounded-xl border p-3 transition-all active:cursor-grabbing ${
        light
          ? "border-[#eceef2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] hover:shadow-[0_6px_16px_rgba(15,23,42,0.10)]"
          : "border-white/[0.07] bg-white/[0.06] hover:bg-white/[0.09]"
      } ${dragging ? "opacity-40" : ""}`}
      style={{ borderLeft: `4px solid ${stage.color.dot}` }}
    >
      {dropHere && (
        <div
          aria-hidden="true"
          className="absolute -top-1.5 right-2 left-2 h-1 rounded-full"
          style={{ backgroundColor: stage.color.dot }}
        />
      )}

      <div className="flex items-start justify-between gap-2 pl-1">
        <Link
          to={`/crm2/leads/${lead.id}`}
          onClick={(event) => event.stopPropagation()}
          className={`min-w-0 flex-1 truncate text-[13px] font-semibold hover:underline ${
            light ? "text-[#111827]" : "text-white/90"
          }`}
        >
          {lead.name}
        </Link>
        <CardStars
          value={lead.priority}
          light={light}
          onChange={(priority) => onPriority(lead.id, priority)}
        />
      </div>

      <p
        className={`mt-0.5 pl-1 text-[11px] font-medium tracking-wide ${
          light ? "text-[#9ca3af]" : "text-white/35"
        }`}
      >
        ИНН {lead.inn}
      </p>
      <p
        className={`mt-0.5 truncate pl-1 text-[11.5px] font-medium ${
          light ? "text-[#6b7280]" : "text-white/45"
        }`}
        title={`${lead.logist_contact}, ${lead.logist_phone}`}
      >
        {lead.logist_contact} · {lead.logist_phone}
      </p>

      {(lead.tags.length > 0 || lead.source) && (
        <div className="mt-2 flex flex-wrap items-center gap-1 pl-1">
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
          {lead.source && (
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={sourceStyle}>
              {lead.source}
            </span>
          )}
        </div>
      )}

      <div
        className={`mt-2.5 flex items-center gap-2 border-t border-dashed pl-1 pt-2 ${
          light ? "border-[#eceef2]" : "border-white/10"
        }`}
      >
        <span
          title={seller ? `Продавец: ${seller.name}` : "Продавец не назначен"}
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[9.5px] font-extrabold text-white"
          style={{ backgroundColor: seller?.color ?? "#9ca3af" }}
        >
          {seller?.initials ?? "—"}
        </span>
        <span className={`text-[10px] font-medium ${light ? "text-[#9ca3af]" : "text-white/35"}`}>
          {lead.time}
        </span>

        <div className="relative ml-auto">
          <button
            type="button"
            aria-label={`Действия: ${lead.name}`}
            aria-expanded={menuOpen}
            onClick={(event) => {
              event.stopPropagation();
              setMenuOpen((open) => !open);
              setConfirmDelete(false);
            }}
            className={`rounded-md p-1 transition-colors ${
              light
                ? "text-[#9ca3af] hover:bg-[#f3f4f6] hover:text-[#374151]"
                : "text-white/35 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <MoreVertical aria-hidden="true" size={15} />
          </button>

          {menuOpen && (
            <div
              role="menu"
              tabIndex={-1}
              aria-label={`Действия: ${lead.name}`}
              onMouseDown={(event) => event.stopPropagation()}
              className={`absolute top-7 right-0 z-30 w-48 overflow-hidden rounded-xl border py-1 shadow-xl ${
                light
                  ? "border-[#e5e7eb] bg-white"
                  : "border-white/[0.1] bg-[#1d1f26] shadow-black/40"
              }`}
            >
              <p
                className={`px-3 pt-1 pb-1.5 text-[10px] font-bold tracking-wider uppercase ${
                  light ? "text-[#9ca3af]" : "text-white/30"
                }`}
              >
                Перенести в
              </p>
              {stages
                .filter((item) => item.id !== stage.id)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onMove(lead.id, item.id);
                      setMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium ${
                      light
                        ? "text-[#374151] hover:bg-[#f3f4f6]"
                        : "text-white/70 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: item.color.dot }}
                    />
                    {item.name}
                  </button>
                ))}
              <div className={`my-1 h-px ${light ? "bg-[#e5e7eb]" : "bg-white/[0.08]"}`} />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  onLose(lead.id);
                  setMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium ${
                  light
                    ? "text-[#b45309] hover:bg-[#fff7ed]"
                    : "text-amber-300/90 hover:bg-white/[0.06]"
                }`}
              >
                Отметить проигрышем
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (confirmDelete) onDelete(lead.id);
                  else setConfirmDelete(true);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] font-medium ${
                  light
                    ? "text-[#e11d48] hover:bg-[#fff1f2]"
                    : "text-rose-300/90 hover:bg-white/[0.06]"
                }`}
              >
                {confirmDelete ? <X aria-hidden="true" size={13} /> : null}
                {confirmDelete ? "Точно удалить?" : "Удалить"}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
