// Общее вымышленное состояние новой CRM (/crm2).
//
// До шага 3 карточки и этапы жили внутри компонента доски: переход на
// страницу лида терял правки. Теперь состояние макета — отдельное
// хранилище уровня страниц: доска и карточка читают и правят одни данные,
// навигация ничего не сбрасывает. Механика та же, что у темы
// (crm2-theme.ts): внешнее состояние + useSyncExternalStore.
//
// ВСЁ здесь — макет в памяти вкладки: сервер и настоящие данные CRM не
// затрагиваются. Имена полей повторяют ответы API; действия (смена этапа,
// проигрыш, передача) пишут историю в ленту карточки, как делает бэкенд
// основной CRM — так чаттер выглядит настоящим ещё до подключения данных.

import { useSyncExternalStore } from "react";

import {
  INITIAL_LEADS,
  STAGES,
  nextStage,
  type BoardLead,
  type BoardStage,
  type StageColor,
  type StageId,
  SELLERS,
} from "./kanban-data";

/** Запись ленты карточки (по образцу timeline_entries основной CRM). */
export interface Crm2TimelineEntry {
  id: number;
  kind: "note" | "history";
  author: string;
  at: string;
  body?: string;
  /** Для истории: подпись поля, старое и новое значение. */
  field?: string;
  from?: string;
  to?: string;
}

/** Вложение чаттера макета. */
export interface Crm2Attachment {
  id: number;
  name: string;
  size: string;
  kind: "pdf" | "image" | "other";
}

/** Демо-справочники: причины проигрыша и бухгалтеры, как в основной CRM. */
export const LOSS_REASONS = [
  "Цена не устроила",
  "Выбрали конкурента",
  "Сроки не подошли",
  "Клиент не отвечает",
];

export const ACCOUNTANTS = ["Елена Сафонова", "Игорь Мостовой", "Ольга Грей"];

interface Crm2BoardState {
  leads: BoardLead[];
  stages: BoardStage[];
  timeline: Record<number, Crm2TimelineEntry[]>;
  attachments: Record<number, Crm2Attachment[]>;
}

function seedTimeline(leads: BoardLead[]): Record<number, Crm2TimelineEntry[]> {
  const timeline: Record<number, Crm2TimelineEntry[]> = {};
  let entryId = 1;
  for (const lead of leads) {
    const seller = SELLERS.find((s) => s.id === lead.assigned_to_id)?.name ?? "Анна Ким";
    const stageName = STAGES.find((s) => s.id === lead.stage_id)?.name ?? "Новый";
    const entries: Crm2TimelineEntry[] = [];
    if (lead.stage_id !== 1) {
      entries.push({
        id: entryId++,
        kind: "history",
        author: seller,
        at: lead.time,
        field: "Этапы лидов",
        from: "Новый",
        to: stageName,
      });
    }
    if (lead.id % 3 === 0) {
      entries.push({
        id: entryId++,
        kind: "note",
        author: seller,
        at: lead.time,
        body: `Созвонились с ${lead.logist_contact}: обсудили условия, ждём расчёт ставки от логиста.`,
      });
    }
    timeline[lead.id] = entries;
  }
  return timeline;
}

// Сроки «следующего контакта» считаем от текущего момента, чтобы макет не
// старел: просроченные остаются просроченными, «сегодня» — сегодняшними.
const NEXT_CONTACTS: { id: number; hours: number; text: string }[] = [
  { id: 2, hours: -26, text: "Отправить расчёт ставки" },
  { id: 8, hours: -6, text: "Перезвонить после отправки КП" },
  { id: 1, hours: 4, text: "Уточнить дату отгрузки" },
  { id: 10, hours: 6, text: "Согласовать условия договора" },
  { id: 7, hours: 26, text: "Встреча с ЛПР по договору" },
  { id: 6, hours: 48, text: "Собрать документы на ТС" },
  { id: 5, hours: 72, text: "Напомнить о себе" },
  { id: 12, hours: 120, text: "Повторный контакт" },
];

function initialState(): Crm2BoardState {
  const now = Date.now();
  const leads = INITIAL_LEADS.map((lead) => ({ ...lead, tags: [...lead.tags] }));
  // Макетные даты создания равномерно растянуты на 8 недель назад, чтобы
  // график «Аналитики» выглядел живым, но оставался воспроизводимым.
  for (const lead of leads) {
    lead.created_at = new Date(
      now - (((lead.id * 11) % 56) * 86_400_000 + ((lead.id * 3) % 20) * 3_600_000),
    ).toISOString();
  }
  for (const contact of NEXT_CONTACTS) {
    const lead = leads.find((item) => item.id === contact.id);
    if (lead) {
      lead.next_contact_text = contact.text;
      lead.next_contact_at = new Date(now + contact.hours * 3_600_000).toISOString();
    }
  }
  // Отдельный проигранный лид: показывает ленточку и режим «только чтение»,
  // на доске его нет — как is_archived в основной CRM.
  const lostLead: BoardLead = {
    id: 17,
    name: "Ледокол-Опторг",
    inn: "5029000073",
    logist_contact: "Тимофей Арбацкий",
    logist_phone: "+7 916 380-44-11",
    priority: 1,
    stage_id: 5,
    assigned_to_id: 4,
    tags: [],
    lost: true,
    source: "Мессенджер",
    time: "3 дн назад",
  };
  leads.push(lostLead);
  const timeline = seedTimeline(leads);
  timeline[17] = [
    {
      id: 9001,
      kind: "history",
      author: "Анна Ким",
      at: "3 дн назад",
      field: "Активный",
      from: "Да",
      to: "Нет",
    },
    {
      id: 9002,
      kind: "history",
      author: "Анна Ким",
      at: "3 дн назад",
      field: "Причина проигрыша",
      from: "—",
      to: "Выбрали конкурента",
    },
  ];
  return {
    leads,
    stages: STAGES.map((stage) => ({ ...stage, color: { ...stage.color } })),
    timeline,
    attachments: {
      2: [{ id: 1, name: "КП-Волга-Строй.pdf", size: "184 КБ", kind: "pdf" }],
      7: [{ id: 2, name: "Фото груза.jpg", size: "1,2 МБ", kind: "image" }],
    },
  };
}

let state: Crm2BoardState = initialState();
let entrySeq = 10_000;
let attachmentSeq = 10_000;

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getCrm2Board(): Crm2BoardState {
  return state;
}

/** Снимок состояния для React: доска и карточка перерисовываются вместе. */
export function useCrm2Board(): Crm2BoardState {
  return useSyncExternalStore(subscribe, getCrm2Board, getCrm2Board);
}

/** Сброс к исходному макету: используют «Настройки» и тесты. */
export function resetCrm2Board(): void {
  state = initialState();
  notify();
}

function nowLabel(): string {
  return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function pushHistory(leadId: number, field: string, from: string, to: string): void {
  const entry: Crm2TimelineEntry = {
    id: entrySeq++,
    kind: "history",
    author: "Анна Ким",
    at: `сегодня, ${nowLabel()}`,
    field,
    from,
    to,
  };
  state = {
    ...state,
    timeline: {
      ...state.timeline,
      [leadId]: [entry, ...(state.timeline[leadId] ?? [])],
    },
  };
}

export function findLead(leadId: number): BoardLead | undefined {
  return state.leads.find((lead) => lead.id === leadId);
}

export function findStage(stageId: StageId): BoardStage | undefined {
  return state.stages.find((stage) => stage.id === stageId);
}

/** Перенос карточки: в конец колонки или точно перед `beforeLeadId`. */
export function moveLead(leadId: number, stageId: number, beforeLeadId: number | null): void {
  const moving = findLead(leadId);
  if (!moving) return;
  if (moving.stage_id === stageId && (beforeLeadId === null || beforeLeadId === leadId)) return;
  const stageChanged = moving.stage_id !== stageId;
  const fromStage = findStage(moving.stage_id)?.name ?? "—";
  const next = state.leads.filter((lead) => lead.id !== leadId);
  const updated = { ...moving, stage_id: stageId };
  if (beforeLeadId !== null && beforeLeadId !== leadId) {
    const at = next.findIndex((lead) => lead.id === beforeLeadId);
    if (at >= 0) {
      next.splice(at, 0, updated);
      state = { ...state, leads: next };
      if (stageChanged) pushHistory(leadId, "Этапы лидов", fromStage, findStage(stageId)!.name);
      notify();
      return;
    }
  }
  state = { ...state, leads: [...next, updated] };
  if (stageChanged) pushHistory(leadId, "Этапы лидов", fromStage, findStage(stageId)!.name);
  notify();
}

export function setLeadPriority(leadId: number, priority: number): void {
  state = {
    ...state,
    leads: state.leads.map((lead) => (lead.id === leadId ? { ...lead, priority } : lead)),
  };
  notify();
}

/** Проигрыш: причина обязательна, как в основной CRM. */
export function loseLead(leadId: number, reason: string): void {
  const lead = findLead(leadId);
  if (!lead || lead.lost) return;
  state = {
    ...state,
    leads: state.leads.map((item) => (item.id === leadId ? { ...item, lost: true } : item)),
  };
  pushHistory(leadId, "Активный", "Да", "Нет");
  pushHistory(leadId, "Причина проигрыша", "—", reason);
  notify();
}

export function restoreLead(leadId: number): void {
  const lead = findLead(leadId);
  if (!lead?.lost) return;
  state = {
    ...state,
    leads: state.leads.map((item) => (item.id === leadId ? { ...item, lost: false } : item)),
  };
  pushHistory(leadId, "Активный", "Нет", "Да");
  notify();
}

export function deleteLead(leadId: number): void {
  const timeline = { ...state.timeline };
  const attachments = { ...state.attachments };
  delete timeline[leadId];
  delete attachments[leadId];
  state = {
    ...state,
    leads: state.leads.filter((lead) => lead.id !== leadId),
    timeline,
    attachments,
  };
  notify();
}

export function transferLead(leadId: number, sellerId: number): void {
  const lead = findLead(leadId);
  const target = SELLERS.find((seller) => seller.id === sellerId);
  if (!lead || !target || lead.assigned_to_id === sellerId) return;
  const previous =
    SELLERS.find((seller) => seller.id === lead.assigned_to_id)?.name ?? "Не назначен";
  state = {
    ...state,
    leads: state.leads.map((item) =>
      item.id === leadId ? { ...item, assigned_to_id: sellerId } : item,
    ),
  };
  pushHistory(leadId, "Продавец", previous, target.name);
  notify();
}

/** Правки полей карточки (автосохранение макета). */
export function updateLeadFields(leadId: number, patch: Partial<BoardLead>): void {
  state = {
    ...state,
    leads: state.leads.map((lead) => (lead.id === leadId ? { ...lead, ...patch } : lead)),
  };
  notify();
}

export function addNote(leadId: number, body: string): void {
  const entry: Crm2TimelineEntry = {
    id: entrySeq++,
    kind: "note",
    author: "Анна Ким",
    at: `сегодня, ${nowLabel()}`,
    body,
  };
  state = {
    ...state,
    timeline: { ...state.timeline, [leadId]: [entry, ...(state.timeline[leadId] ?? [])] },
  };
  notify();
}

export function addAttachment(leadId: number, file: { name: string; size: number }): void {
  const kind: Crm2Attachment["kind"] = /\.(png|jpe?g|webp|gif)$/i.test(file.name)
    ? "image"
    : /\.pdf$/i.test(file.name)
      ? "pdf"
      : "other";
  const size =
    file.size >= 1_048_576
      ? `${(file.size / 1_048_576).toFixed(1)} МБ`
      : `${Math.max(1, Math.round(file.size / 1024))} КБ`;
  const entry: Crm2Attachment = { id: attachmentSeq++, name: file.name, size, kind };
  state = {
    ...state,
    attachments: {
      ...state.attachments,
      [leadId]: [entry, ...(state.attachments[leadId] ?? [])],
    },
  };
  notify();
}

export function removeAttachment(leadId: number, attachmentId: number): void {
  state = {
    ...state,
    attachments: {
      ...state.attachments,
      [leadId]: (state.attachments[leadId] ?? []).filter((file) => file.id !== attachmentId),
    },
  };
  notify();
}

// --- Этапы ---------------------------------------------------------------

export function renameStage(stageId: number, name: string): void {
  state = {
    ...state,
    stages: state.stages.map((stage) => (stage.id === stageId ? { ...stage, name } : stage)),
  };
  notify();
}

export function recolorStage(stageId: number, color: StageColor): void {
  state = {
    ...state,
    stages: state.stages.map((stage) => (stage.id === stageId ? { ...stage, color } : stage)),
  };
  notify();
}

export function addStage(): number {
  const created = nextStage(state.stages);
  state = {
    ...state,
    stages: [...state.stages, { id: created.id, name: "Новый этап", color: created.color }],
  };
  notify();
  return created.id;
}

export function deleteStage(stageId: number): void {
  const fallback = state.stages.find((stage) => stage.id !== stageId);
  if (!fallback) return;
  state = {
    ...state,
    stages: state.stages.filter((stage) => stage.id !== stageId),
    leads: state.leads.map((lead) =>
      lead.stage_id === stageId ? { ...lead, stage_id: fallback.id } : lead,
    ),
  };
  notify();
}

export function moveStage(stageId: number, beforeStageId: number): void {
  if (stageId === beforeStageId) return;
  const moving = state.stages.find((stage) => stage.id === stageId);
  if (!moving) return;
  const next = state.stages.filter((stage) => stage.id !== stageId);
  const at = next.findIndex((stage) => stage.id === beforeStageId);
  next.splice(at < 0 ? next.length : at, 0, moving);
  state = { ...state, stages: next };
  notify();
}

/** Пейджер «N из M» по порядку чтения доски: колонки по порядку, внутри —
 *  порядок карточек. Как `GET /crm/leads/{id}/pager` в основной CRM. */
export function pagerFor(leadId: number): {
  position: number;
  total: number;
  prevId: number | null;
  nextId: number | null;
} {
  const ordered: number[] = [];
  for (const stage of state.stages) {
    for (const lead of state.leads) {
      if (!lead.lost && lead.stage_id === stage.id) ordered.push(lead.id);
    }
  }
  const index = ordered.indexOf(leadId);
  if (index === -1) return { position: 0, total: ordered.length, prevId: null, nextId: null };
  return {
    position: index + 1,
    total: ordered.length,
    prevId: ordered[index - 1] ?? null,
    nextId: ordered[index + 1] ?? null,
  };
}

/** «Выполнить задачу» — снимает макетное напоминание с лида. */
export function completeTask(leadId: number): void {
  state = {
    ...state,
    leads: state.leads.map((lead) =>
      lead.id === leadId
        ? { ...lead, next_contact_text: undefined, next_contact_at: undefined }
        : lead,
    ),
  };
  pushHistory(leadId, "Следующий контакт", "запланирован", "выполнен");
  notify();
}

/** Отсчёт просроченных напоминаний для бейджа «Задачи» в панели. */
export function overdueTasksCount(): number {
  const now = Date.now();
  return state.leads.filter(
    (lead) => !lead.lost && lead.next_contact_at && new Date(lead.next_contact_at).getTime() < now,
  ).length;
}

/** Причина проигрыша макета — хранится в теле лида, как `loss_reason_name`. */
export function lossReasonOf(leadId: number): string | null {
  const entry = (state.timeline[leadId] ?? []).find(
    (item) => item.kind === "history" && item.field === "Причина проигрыша",
  );
  return entry?.to ?? null;
}
