import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  MoreVertical,
  Paperclip,
  RotateCcw,
  X,
} from "lucide-react";
import { Link, useBlocker, useNavigate, useParams } from "react-router-dom";

import { useCrm2Theme } from "./crm2-theme";
import {
  ACCOUNTANTS,
  LOSS_REASONS,
  addAttachment,
  addNote,
  deleteLead,
  findStage,
  lossReasonOf,
  loseLead,
  moveLead,
  pagerFor,
  removeAttachment,
  restoreLead,
  transferLead,
  updateLeadFields,
  useCrm2Board,
  type Crm2Attachment,
} from "./crm2-store";
import { innProblem } from "./inn";
import { MOCK_TAGS, SELLERS, type BoardLead, type MockTag } from "./kanban-data";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Отдельная страница лида новой CRM (шаг 3 переноса; решение владельца
 * 31.10.2026 — страница с чаттером, как в основной CRM, а не боковая панель).
 *
 * Состав повторяет карточку основной CRM: шапка с названием и действиями,
 * пейджер «N из M» по порядку чтения доски, кликабельный статусбар этапов
 * (видно пять, остальные — за «…»), поля компании и контакта, лента чаттера
 * со заметками, историей и вложениями, автосохранение через 3 секунды простоя
 * с защитой перехода. Проигранный лид получает ленточку и режим «только
 * чтение», восстановление — кнопкой.
 *
 * Всё это макет поверх crm2-store: изменения живут в памяти вкладки, сервер
 * не запрашивается. Поля и поведение повторяют основную CRM, чтобы подключение
 * API стало заменой источника, а не переписыванием страницы.
 */

const AUTOSAVE_DELAY_MS = 3000;

interface LeadDraft {
  name: string;
  inn: string;
  logist_contact: string;
  logist_phone: string;
  logist_email: string;
  accountant_name: string;
  priority: number;
  tags: MockTag[];
}

function toDraft(lead: BoardLead): LeadDraft {
  return {
    name: lead.name,
    inn: lead.inn,
    logist_contact: lead.logist_contact,
    logist_phone: lead.logist_phone,
    logist_email: "",
    accountant_name: ACCOUNTANTS[(lead.id - 1) % ACCOUNTANTS.length],
    priority: lead.priority,
    tags: lead.tags,
  };
}

export function LeadPage() {
  const { id } = useParams();
  // Ключ по id: переход «предыдущий / следующий» пересоздаёт страницу и не
  // тащит черновик соседней карточки — как в форме основной CRM.
  return <LeadPageBody key={id ?? ""} id={Number(id)} />;
}

function LeadPageBody({ id }: { id: number }) {
  const theme = useCrm2Theme();
  const light = theme === "light";
  const navigate = useNavigate();
  const { leads, stages, timeline, attachments } = useCrm2Board();
  const lead = leads.find((item) => item.id === id);

  const [draft, setDraft] = useState<LeadDraft | null>(lead ? toDraft(lead) : null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loseOpen, setLoseOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [expandedStages, setExpandedStages] = useState(false);
  const [note, setNote] = useState("");
  const [attachError, setAttachError] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

  const innProblemText = draft ? innProblem(draft.inn) : null;
  const nameProblem = draft && !draft.name.trim() ? "Укажите название лида" : null;
  const stage = lead ? findStage(lead.stage_id) : undefined;
  const pager = pagerFor(id);
  const entries = timeline[id] ?? [];
  const files = attachments[id] ?? [];
  const reason = lossReasonOf(id);

  const persist = useCallback(
    (snapshot: LeadDraft) => {
      updateLeadFields(id, {
        name: snapshot.name.trim(),
        inn: snapshot.inn.replace(/\D/g, ""),
        logist_contact: snapshot.logist_contact.trim(),
        logist_phone: snapshot.logist_phone.trim(),
        priority: snapshot.priority,
        tags: snapshot.tags,
      });
      setSavedAt(new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }));
      setDirty(false);
    },
    [id],
  );

  // Автосохранение через 3 секунды простоя — как в карточке основной CRM.
  // Ошибка поля (говорящий ИНН, пустое название) приостанавливает запись:
  // лучше подсказать, чем сохранить заведомо плохие данные макета.
  useEffect(() => {
    if (!dirty || !draft || innProblemText || nameProblem) return;
    const snapshot = draft;
    saveTimer.current = window.setTimeout(() => persist(snapshot), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(saveTimer.current);
  }, [dirty, draft, innProblemText, nameProblem, persist]);

  function edit<K extends keyof LeadDraft>(key: K, value: LeadDraft[K]): void {
    if (lead?.lost) return;
    setDirty(true);
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  // Удерживаем переход с несохранёнными правками, как делает Data Router в
  // карточке основной CRM.
  const blocker = useBlocker(dirty && !lead?.lost);
  useEffect(() => {
    if (blocker.state === "blocked" && !dirty) blocker.proceed?.();
  }, [blocker, dirty]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  if (!lead || !draft) {
    return (
      <Shell light={light} theme={theme}>
        <div className="grid min-h-0 flex-1 place-items-center">
          <div className="text-center">
            <p
              className={`text-[15px] font-semibold ${light ? "text-[#111827]" : "text-white/80"}`}
            >
              Лид №{id} не найден в макете
            </p>
            <Link
              to="/crm2"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c5cff] hover:underline"
            >
              <ArrowLeft aria-hidden="true" size={15} /> К доске лидов
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  function selectStage(stageId: number): void {
    if (lead!.lost) return;
    moveLead(id, stageId, null);
  }

  function choosePriority(priority: number): void {
    if (lead!.lost) return;
    const next = { ...draft!, priority };
    setDraft(next);
    // Звёзды сохраняются сразу — как отдельный быстрый PATCH в старой CRM.
    persist(next);
  }

  function toggleTag(tag: MockTag): void {
    if (lead!.lost) return;
    const has = draft!.tags.some((item) => item.id === tag.id);
    const tags = has ? draft!.tags.filter((item) => item.id !== tag.id) : [...draft!.tags, tag];
    setDirty(true);
    setDraft({ ...draft!, tags });
  }

  function submitNote(): void {
    const body = note.trim();
    if (!body) return;
    addNote(id, body);
    setNote("");
  }

  const visibleStages = expandedStages ? stages : stages.slice(0, 5);
  const hiddenCount = stages.length - visibleStages.length;

  return (
    <Shell light={light} theme={theme}>
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <Link
            to="/crm2"
            className={`inline-flex shrink-0 items-center gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-semibold transition-colors ${
              light
                ? "text-[#6b7280] hover:bg-white hover:text-[#111827]"
                : "text-white/50 hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <ArrowLeft aria-hidden="true" size={14} /> Доска лидов
          </Link>

          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: stage?.color.dot ?? "#9ca3af" }}
            />
            <div className="min-w-0">
              <input
                aria-label="Название лида"
                value={draft.name}
                disabled={lead.lost}
                onChange={(event) => edit("name", event.target.value)}
                placeholder="Название лида"
                className={`w-full min-w-0 rounded-lg bg-transparent px-1.5 py-0.5 text-[17px] font-extrabold tracking-tight outline-none transition-colors disabled:opacity-70 ${
                  light
                    ? "text-[#111827] hover:bg-white focus:bg-white focus:ring-2 focus:ring-[#7c5cff]/40"
                    : "text-white hover:bg-white/[0.05] focus:bg-white/[0.06] focus:ring-2 focus:ring-[#8b7dff]/50"
                }`}
              />
              <p
                className={`truncate px-1.5 text-[11.5px] font-medium ${
                  light ? "text-[#6b7280]" : "text-white/40"
                }`}
              >
                {lead.logist_contact} · {lead.logist_phone}
                {savedAt && !dirty
                  ? ` · сохранено ${savedAt}`
                  : dirty
                    ? " · есть несохранённые правки"
                    : ""}
              </p>
            </div>
          </div>

          <div
            className="flex shrink-0 items-center gap-1.5 rounded-xl border px-1 py-1"
            style={{
              borderColor: light ? "#e5e7eb" : "rgba(255,255,255,0.08)",
              backgroundColor: light ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.05)",
            }}
          >
            <button
              type="button"
              aria-label="Предыдущий лид"
              disabled={pager.prevId === null}
              onClick={() => pager.prevId && navigate(`/crm2/leads/${pager.prevId}`)}
              className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-black/[0.04]"
              style={{ color: light ? "#374151" : "rgba(255,255,255,0.8)" }}
            >
              <ChevronLeft aria-hidden="true" size={16} />
            </button>
            <span
              aria-live="polite"
              className={`min-w-14 text-center text-[12px] font-bold tabular-nums ${
                light ? "text-[#374151]" : "text-white/70"
              }`}
            >
              {pager.position} из {pager.total}
            </span>
            <button
              type="button"
              aria-label="Следующий лид"
              disabled={pager.nextId === null}
              onClick={() => pager.nextId && navigate(`/crm2/leads/${pager.nextId}`)}
              className="rounded-lg p-1.5 transition-colors disabled:opacity-30 hover:bg-black/[0.04]"
              style={{ color: light ? "#374151" : "rgba(255,255,255,0.8)" }}
            >
              <ChevronRight aria-hidden="true" size={16} />
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              type="button"
              aria-label="Действия с лидом"
              aria-expanded={actionsOpen}
              onClick={() => {
                setActionsOpen((open) => !open);
                setConfirmDelete(false);
              }}
              className={`grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
                light
                  ? "border-[#e5e7eb] bg-white text-[#6b7280] hover:text-[#111827]"
                  : "border-white/[0.08] bg-white/[0.06] text-white/50 hover:text-white"
              }`}
            >
              <MoreVertical aria-hidden="true" size={16} />
            </button>
            {actionsOpen && (
              <div
                role="menu"
                aria-label="Действия с лидом"
                tabIndex={-1}
                className={`absolute top-11 right-0 z-30 w-56 overflow-hidden rounded-xl border py-1 shadow-xl ${
                  light
                    ? "border-[#e5e7eb] bg-white"
                    : "border-white/[0.1] bg-[#1d1f26] shadow-black/40"
                }`}
              >
                {!lead.lost && (
                  <>
                    <MenuAction
                      light={light}
                      onClick={() => {
                        setLoseOpen(true);
                        setActionsOpen(false);
                      }}
                    >
                      Отметить проигрышем
                    </MenuAction>
                    <MenuAction
                      light={light}
                      onClick={() => {
                        setTransferOpen(true);
                        setActionsOpen(false);
                      }}
                    >
                      Передать коллеге
                    </MenuAction>
                  </>
                )}
                <MenuAction
                  light={light}
                  danger
                  onClick={() => {
                    if (!confirmDelete) {
                      setConfirmDelete(true);
                      return;
                    }
                    deleteLead(id);
                    navigate("/crm2");
                  }}
                >
                  {confirmDelete ? (
                    <>
                      <X aria-hidden="true" size={13} /> Точно удалить безвозвратно?
                    </>
                  ) : (
                    "Удалить лид"
                  )}
                </MenuAction>
              </div>
            )}
          </div>
        </div>
      </header>

      {lead.lost && (
        <div
          role="alert"
          className="mx-5 mb-2 rounded-xl border border-rose-300/60 bg-rose-500/10 px-4 py-2.5 text-[12.5px] font-semibold text-rose-600 dark:border-rose-400/30"
          style={{ color: light ? "#be123c" : "#fda4af" }}
        >
          Лид проигран{reason ? ` — ${reason}` : ""}. Поля доступны только для чтения, пока карточку
          не вернут в работу
        </div>
      )}

      <div aria-label="Этапы лида" className="flex flex-wrap items-center gap-1.5 px-5 pb-3">
        {visibleStages.map((item) => {
          const active = item.id === lead.stage_id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={active}
              disabled={lead.lost}
              onClick={() => selectStage(item.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-all disabled:opacity-60"
              style={
                active
                  ? { backgroundColor: item.color.dot, color: "#fff" }
                  : light
                    ? { backgroundColor: item.color.tint, color: item.color.dot }
                    : { backgroundColor: item.color.dark, color: item.color.dot }
              }
            >
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-current"
                style={{ opacity: active ? 0.9 : 0.7 }}
              />
              {item.name}
            </button>
          );
        })}
        {hiddenCount > 0 && (
          <button
            type="button"
            aria-label="Показать остальные этапы"
            onClick={() => setExpandedStages(true)}
            className={`rounded-full px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              light ? "text-[#6b7280] hover:bg-white" : "text-white/40 hover:bg-white/[0.06]"
            }`}
          >
            …
          </button>
        )}
        {lead.lost && (
          <button
            type="button"
            onClick={() => restoreLead(id)}
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#84cc16] px-3 py-1.5 text-[12px] font-bold text-[#1a2e05] transition hover:brightness-105"
          >
            <RotateCcw aria-hidden="true" size={13} /> Вернуть в работу
          </button>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto px-5 pb-5 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <section
          aria-label="Поля лида"
          className={`h-fit space-y-4 rounded-2xl border p-4 ${
            light ? "border-[#eceef2] bg-white shadow-sm" : "border-white/[0.07] bg-white/[0.04]"
          }`}
        >
          <FieldGroup title="Информация о компании" light={light}>
            <FieldRow label="ИНН" light={light} invalid={Boolean(dirty && innProblemText)}>
              <input
                aria-label="ИНН лида"
                value={draft.inn}
                disabled={lead.lost}
                inputMode="numeric"
                onChange={(event) => edit("inn", event.target.value)}
                className={inputClass(light)}
              />
              {dirty && innProblemText && (
                <p role="alert" className="mt-1 text-[11px] font-medium text-rose-500">
                  {innProblemText}
                </p>
              )}
            </FieldRow>
            <FieldRow label="Бухгалтер" light={light}>
              <select
                aria-label="Бухгалтер"
                value={draft.accountant_name}
                disabled={lead.lost}
                onChange={(event) => edit("accountant_name", event.target.value)}
                className={inputClass(light)}
              >
                {ACCOUNTANTS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </FieldRow>
            <FieldRow label="Приоритет" light={light}>
              <span aria-label={`Приоритет лида: ${draft.priority} из 3`} className="leading-none">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Приоритет ${n}`}
                    disabled={lead.lost}
                    onClick={() => choosePriority(n)}
                    className="px-px text-[17px] disabled:opacity-70"
                    style={{
                      color:
                        draft.priority >= n
                          ? "#f59e0b"
                          : light
                            ? "#d1d5db"
                            : "rgba(255,255,255,0.25)",
                    }}
                  >
                    {draft.priority >= n ? "★" : "☆"}
                  </button>
                ))}
              </span>
            </FieldRow>
            <FieldRow label="Теги" light={light}>
              <div className="flex flex-wrap gap-1.5">
                {MOCK_TAGS.map((tag) => {
                  const active = draft.tags.some((item) => item.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      aria-pressed={active}
                      disabled={lead.lost}
                      onClick={() => toggleTag(tag)}
                      className="rounded-md px-2 py-1 text-[11px] font-bold transition-all disabled:opacity-70"
                      style={
                        active
                          ? { backgroundColor: tag.color, color: "#fff" }
                          : {
                              backgroundColor: light ? `${tag.color}14` : `${tag.color}22`,
                              color: tag.color,
                            }
                      }
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </FieldRow>
          </FieldGroup>

          <FieldGroup title="Информация о клиенте" light={light}>
            <FieldRow label="Контакт логиста" light={light}>
              <input
                aria-label="Контакт логиста"
                value={draft.logist_contact}
                disabled={lead.lost}
                onChange={(event) => edit("logist_contact", event.target.value)}
                className={inputClass(light)}
              />
            </FieldRow>
            <FieldRow label="Телефон" light={light}>
              <input
                aria-label="Телефон логиста"
                value={draft.logist_phone}
                disabled={lead.lost}
                onChange={(event) => edit("logist_phone", event.target.value)}
                className={inputClass(light)}
              />
            </FieldRow>
            <FieldRow label="Эл. почта" light={light}>
              <input
                aria-label="Эл. почта логиста"
                value={draft.logist_email}
                disabled={lead.lost}
                placeholder="пока не указана"
                onChange={(event) => edit("logist_email", event.target.value)}
                className={inputClass(light)}
              />
            </FieldRow>
            <FieldRow label="Источник" light={light}>
              <span
                className="inline-flex rounded-md px-2 py-1 text-[11px] font-bold"
                style={
                  light
                    ? { backgroundColor: "#eef1f5", color: "#475569" }
                    : { backgroundColor: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }
                }
              >
                {lead.source} (макет)
              </span>
            </FieldRow>
            <FieldRow label="Продавец" light={light}>
              <span
                className="inline-flex items-center gap-2 text-[12.5px] font-semibold"
                style={{ color: light ? "#374151" : "rgba(255,255,255,0.8)" }}
              >
                <span
                  aria-hidden="true"
                  className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-extrabold text-white"
                  style={{
                    backgroundColor:
                      SELLERS.find((s) => s.id === lead.assigned_to_id)?.color ?? "#9ca3af",
                  }}
                >
                  {SELLERS.find((s) => s.id === lead.assigned_to_id)?.initials ?? "—"}
                </span>
                {SELLERS.find((s) => s.id === lead.assigned_to_id)?.name ?? "Не назначен"}
              </span>
            </FieldRow>
          </FieldGroup>
        </section>

        <section
          aria-label="Переписка и вложения"
          className={`flex min-h-0 flex-col rounded-2xl border ${
            light ? "border-[#eceef2] bg-white shadow-sm" : "border-white/[0.07] bg-white/[0.04]"
          }`}
        >
          <div
            className={`border-b px-4 py-3 ${light ? "border-[#eceef2]" : "border-white/[0.07]"}`}
          >
            <p
              className={`text-[11px] font-bold tracking-wider uppercase ${
                light ? "text-[#9ca3af]" : "text-white/35"
              }`}
            >
              Чаттер
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!lead.lost && (
              <form
                aria-label="Новая заметка"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitNote();
                }}
                className="flex items-start gap-2.5"
              >
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d946ef] to-[#7c3aed] text-[10px] font-extrabold text-white"
                >
                  АК
                </span>
                <div className="min-w-0 flex-1">
                  <textarea
                    aria-label="Текст заметки"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitNote();
                      }
                    }}
                    placeholder="Добавить заметку по лиду…"
                    rows={2}
                    className={inputClass(light)}
                  />
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-semibold transition-colors ${
                        light
                          ? "text-[#6b7280] hover:bg-[#f3f4f6]"
                          : "text-white/45 hover:bg-white/[0.06]"
                      }`}
                    >
                      <Paperclip aria-hidden="true" size={13} /> Приложить файл
                    </button>
                    <input
                      ref={fileInput}
                      type="file"
                      aria-label="Выбрать вложение"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (!file) return;
                        if (file.size > 25 * 1024 * 1024) {
                          setAttachError("Файл больше 25 МБ — как лимит основной CRM");
                          return;
                        }
                        setAttachError("");
                        addAttachment(id, { name: file.name, size: file.size });
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!note.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#7c5cff] px-3 py-1.5 text-[11.5px] font-bold text-white transition disabled:opacity-40 hover:bg-[#6d4df0]"
                    >
                      <MessageSquare aria-hidden="true" size={13} /> Отправить
                    </button>
                  </div>
                  {attachError && (
                    <p role="alert" className="mt-1 text-[11px] font-medium text-rose-500">
                      {attachError}
                    </p>
                  )}
                </div>
              </form>
            )}

            {files.length > 0 && (
              <div aria-label="Вложения" className="space-y-1.5">
                {files.map((file) => (
                  <AttachmentRow
                    key={file.id}
                    file={file}
                    light={light}
                    readOnly={lead.lost}
                    onRemove={() => removeAttachment(id, file.id)}
                  />
                ))}
              </div>
            )}

            <ol aria-label="Лента лида" className="space-y-2.5">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className={`rounded-xl border px-3.5 py-2.5 ${
                    light ? "border-[#eceef2] bg-[#fafafa]" : "border-white/[0.06] bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {entry.kind === "note" ? (
                      <MessageSquare
                        aria-hidden="true"
                        size={13}
                        className="shrink-0 text-[#0ea5e9]"
                      />
                    ) : (
                      <FileText aria-hidden="true" size={13} className="shrink-0 text-[#7c5cff]" />
                    )}
                    <span
                      className={`text-[11px] font-bold ${
                        light ? "text-[#374151]" : "text-white/70"
                      }`}
                    >
                      {entry.author}
                    </span>
                    <span
                      className={`ml-auto text-[10.5px] font-medium ${
                        light ? "text-[#9ca3af]" : "text-white/30"
                      }`}
                    >
                      {entry.at}
                    </span>
                  </div>
                  <p
                    className={`mt-1 text-[12.5px] leading-relaxed ${
                      light ? "text-[#4b5563]" : "text-white/60"
                    }`}
                  >
                    {entry.kind === "note"
                      ? entry.body
                      : `${entry.field}: ${entry.from} → ${entry.to}`}
                  </p>
                </li>
              ))}
              {entries.length === 0 && (
                <p
                  className={`py-6 text-center text-[12px] font-medium ${
                    light ? "text-[#9ca3af]" : "text-white/30"
                  }`}
                >
                  Записей пока нет — добавьте первую заметку
                </p>
              )}
            </ol>
          </div>
        </section>
      </div>

      {loseOpen && (
        <Dialog light={light} title="Отметить проигрышем?" onClose={() => setLoseOpen(false)}>
          <p className={`text-[12.5px] ${light ? "text-[#4b5563]" : "text-white/60"}`}>
            Выберите причину из справочника — карточка уйдёт с доски и станет доступной только для
            чтения, пока её не вернут.
          </p>
          <div className="mt-3 space-y-1.5">
            {LOSS_REASONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  loseLead(id, item);
                  setLoseOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[12.5px] font-semibold transition-colors ${
                  light
                    ? "hover:bg-[#fff1f2] text-[#374151]"
                    : "hover:bg-white/[0.06] text-white/75"
                }`}
              >
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#f43f5e]" />
                {item}
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {transferOpen && (
        <Dialog light={light} title="Передать лид коллеге" onClose={() => setTransferOpen(false)}>
          <div className="space-y-1.5">
            {SELLERS.filter((seller) => seller.id !== lead.assigned_to_id).map((seller) => (
              <button
                key={seller.id}
                type="button"
                onClick={() => {
                  transferLead(id, seller.id);
                  setTransferOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
                  light ? "hover:bg-[#f3f4f6]" : "hover:bg-white/[0.06]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="grid h-7 w-7 place-items-center rounded-full text-[10px] font-extrabold text-white"
                  style={{ backgroundColor: seller.color }}
                >
                  {seller.initials}
                </span>
                <span
                  className={`text-[12.5px] font-semibold ${
                    light ? "text-[#374151]" : "text-white/80"
                  }`}
                >
                  {seller.name}
                </span>
              </button>
            ))}
          </div>
        </Dialog>
      )}

      {blocker.state === "blocked" && (
        <Dialog light={light} title="Несохранённые изменения" onClose={() => blocker.reset?.()}>
          <p className={`text-[12.5px] ${light ? "text-[#4b5563]" : "text-white/60"}`}>
            В карточке есть правки, которые макет ещё не сохранил. Что делаем?
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => blocker.reset?.()}
              className={`rounded-xl border px-3 py-2 text-[12px] font-semibold ${
                light
                  ? "border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb]"
                  : "border-white/[0.12] text-white/70 hover:bg-white/[0.06]"
              }`}
            >
              Остаться
            </button>
            <button
              type="button"
              onClick={() => blocker.proceed?.()}
              className={`rounded-xl px-3 py-2 text-[12px] font-semibold ${
                light
                  ? "bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]"
                  : "bg-white/[0.08] text-white/80 hover:bg-white/[0.12]"
              }`}
            >
              Уйти без сохранения
            </button>
            <button
              type="button"
              onClick={() => {
                if (draft && !innProblemText && !nameProblem) persist(draft);
                blocker.proceed?.();
              }}
              className="rounded-xl bg-[#7c5cff] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#6d4df0]"
            >
              Сохранить и выйти
            </button>
          </div>
        </Dialog>
      )}
    </Shell>
  );
}

function Shell({
  light,
  theme,
  children,
}: {
  light: boolean;
  theme: "light" | "dark";
  children: React.ReactNode;
}) {
  return (
    <div
      data-theme={theme}
      className={`flex h-full min-h-0 flex-col ${
        light ? "bg-[linear-gradient(160deg,#f7f6ff,#f3f7ff_45%,#f2fbf6)]" : "bg-[#15161b]"
      }`}
    >
      <div className="flex justify-end px-5 pt-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

function FieldGroup({
  title,
  light,
  children,
}: {
  title: string;
  light: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-3">
      <legend
        className={`text-[11px] font-bold tracking-wider uppercase ${
          light ? "text-[#9ca3af]" : "text-white/35"
        }`}
      >
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function FieldRow({
  label,
  light,
  invalid,
  children,
}: {
  label: string;
  light: boolean;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
      <span
        className={`pt-[7px] text-[12px] font-semibold ${
          invalid ? "text-rose-500" : light ? "text-[#6b7280]" : "text-white/45"
        }`}
      >
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function inputClass(light: boolean): string {
  return `w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none transition disabled:opacity-70 ${
    light
      ? "border-[#e5e7eb] bg-[#fafafa] text-[#111827] focus:border-[#7c5cff] focus:bg-white focus:ring-2 focus:ring-[#7c5cff]/25"
      : "border-white/[0.1] bg-white/[0.04] text-white/85 focus:border-[#8b7dff]/60 focus:ring-2 focus:ring-[#8b7dff]/30"
  }`;
}

function MenuAction({
  light,
  danger,
  onClick,
  children,
}: {
  light: boolean;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] font-medium transition-colors ${
        danger
          ? light
            ? "text-[#e11d48] hover:bg-[#fff1f2]"
            : "text-rose-300/90 hover:bg-white/[0.06]"
          : light
            ? "text-[#374151] hover:bg-[#f3f4f6]"
            : "text-white/75 hover:bg-white/[0.06]"
      }`}
    >
      {children}
    </button>
  );
}

function Dialog({
  light,
  title,
  onClose,
  children,
}: {
  light: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${
          light ? "border-[#e5e7eb] bg-white" : "border-white/[0.1] bg-[#1d1f26]"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className={`text-[14px] font-bold ${light ? "text-[#111827]" : "text-white"}`}>
            {title}
          </h3>
          <button
            type="button"
            aria-label="Закрыть окно"
            onClick={onClose}
            className={`rounded-lg p-1 transition-colors ${
              light ? "text-[#9ca3af] hover:bg-[#f3f4f6]" : "text-white/40 hover:bg-white/[0.08]"
            }`}
          >
            <X aria-hidden="true" size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AttachmentRow({
  file,
  light,
  readOnly,
  onRemove,
}: {
  file: Crm2Attachment;
  light: boolean;
  readOnly: boolean;
  onRemove: () => void;
}) {
  const Icon = file.kind === "pdf" ? FileText : file.kind === "image" ? ImageIcon : Paperclip;
  const tint = file.kind === "pdf" ? "#f43f5e" : file.kind === "image" ? "#0ea5e9" : "#8b7dff";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-1.5 ${
        light ? "border-[#eceef2]" : "border-white/[0.07]"
      }`}
    >
      <span
        aria-hidden="true"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${tint}18`, color: tint }}
      >
        <Icon size={14} />
      </span>
      <span
        className={`min-w-0 flex-1 truncate text-[12px] font-semibold ${
          light ? "text-[#374151]" : "text-white/75"
        }`}
      >
        {file.name}
      </span>
      <span
        className={`shrink-0 text-[10.5px] font-medium ${
          light ? "text-[#9ca3af]" : "text-white/35"
        }`}
      >
        {file.size}
      </span>
      {!readOnly && (
        <button
          type="button"
          aria-label={`Удалить вложение ${file.name}`}
          onClick={onRemove}
          className={`shrink-0 rounded-md p-1 transition-colors ${
            light
              ? "text-[#9ca3af] hover:bg-[#fff1f2] hover:text-[#e11d48]"
              : "text-white/30 hover:bg-white/[0.08] hover:text-rose-300"
          }`}
        >
          <X aria-hidden="true" size={12} />
        </button>
      )}
    </div>
  );
}
