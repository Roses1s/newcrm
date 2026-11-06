// Демо-данные канбан-доски /crm2.
//
// Данные вымышленные (CRM2 пока работает без сервера), но СТРУКТУРА повторяет
// поля настоящего API (`/crm/leads`, `/crm/stages`): числовые id, ИНН с
// контрольной суммой, контакты логиста, приоритет 0–3, теги с цветом HEX,
// продавец по ссылке на сотрудника. Так подключение реальных данных в
// отдельном шаге станет заменой источника, а не переписыванием разметки.
//
// Поля `source` и `time` — макетные: на сервере у лида их нет. Оставлены
// потому, что владелец согласовал их вид на карточке (цветная метка
// источника и «сколько назад»); при подключении API они упадут сами собой.

export type StageId = number;

/** Тройка цветов этапа: насыщенный, заливка колонки в светлой, в тёмной. */
export interface StageColor {
  dot: string;
  tint: string;
  dark: string;
}

// Палитра CRM2: шесть красочных цветов, которые выбрал владелец.
export const STAGE_PALETTE: StageColor[] = [
  { dot: "#7c5cff", tint: "#ede9ff", dark: "rgba(124,92,255,0.13)" },
  { dot: "#f59e0b", tint: "#fff2dc", dark: "rgba(245,158,11,0.13)" },
  { dot: "#0ea5e9", tint: "#e0f3fe", dark: "rgba(14,165,233,0.13)" },
  { dot: "#14b8a6", tint: "#dcf7f3", dark: "rgba(20,184,166,0.13)" },
  { dot: "#f43f5e", tint: "#ffe4e8", dark: "rgba(244,63,94,0.13)" },
  { dot: "#84cc16", tint: "#edfbd6", dark: "rgba(132,204,22,0.13)" },
];

export interface BoardStage {
  id: StageId;
  name: string;
  color: StageColor;
}

// Порядок и названия колонок — ровно как задал владелец.
export const STAGES: BoardStage[] = [
  { id: 1, name: "Новый", color: STAGE_PALETTE[0] },
  { id: 2, name: "Перезвонить", color: STAGE_PALETTE[1] },
  { id: 3, name: "Вышел на ЛПР", color: STAGE_PALETTE[2] },
  { id: 4, name: "Потенциальный", color: STAGE_PALETTE[3] },
  { id: 5, name: "Уехали", color: STAGE_PALETTE[4] },
  { id: 6, name: "Ждем заявку", color: STAGE_PALETTE[5] },
];

/** У источника тоже свой цвет — метка на карточке окрашивается по нему. */
export interface SourceStyle {
  color: string;
  tint: string;
}

export const SOURCE_STYLES: Record<string, SourceStyle> = {
  Сайт: { color: "#2563eb", tint: "#eaf1ff" },
  Звонок: { color: "#ea580c", tint: "#ffeee2" },
  Рекомендация: { color: "#059669", tint: "#e5f8f0" },
  Мессенджер: { color: "#db2777", tint: "#fdeaf3" },
};

/** Теги как в общем справочнике CRM: название и свободный HEX-цвет. */
export interface MockTag {
  id: number;
  name: string;
  color: string;
}

export const MOCK_TAGS: MockTag[] = [
  { id: 1, name: "ФУРА", color: "#0ea5e9" },
  { id: 2, name: "Негабарит", color: "#f43f5e" },
  { id: 3, name: "Регулярный груз", color: "#84cc16" },
  { id: 4, name: "Тендер", color: "#7c5cff" },
  { id: 5, name: "Реф", color: "#14b8a6" },
  { id: 6, name: "Постоянник", color: "#f59e0b" },
];

/** Сотрудники-продавцы макета; «Анна Ким» — тот же человек, что в панели. */
export interface Seller {
  id: number;
  name: string;
  initials: string;
  color: string;
}

export const SELLERS: Seller[] = [
  { id: 1, name: "Анна Ким", initials: "АК", color: "#d946ef" },
  { id: 2, name: "Сергей Полянский", initials: "СП", color: "#0ea5e9" },
  { id: 3, name: "Мария Лебедева", initials: "МЛ", color: "#14b8a6" },
  { id: 4, name: "Игорь Сафонов", initials: "ИС", color: "#f59e0b" },
];

export interface BoardLead {
  id: number;
  name: string;
  inn: string;
  logist_contact: string;
  logist_phone: string;
  /** Приоритет 0–3, как в основной CRM (звёзды на карточке). */
  priority: number;
  stage_id: StageId;
  assigned_to_id: number;
  tags: MockTag[];
  /** Проигранные макеты прячутся с доски (как is_archived в сервере). */
  lost: boolean;
  source: string;
  time: string;
  /** МАКЕТ-ПОЛЯ «следующий контакт»: на сервере их нет (действия удалены
   *  из основной CRM 29.09.2026). Нужны странице «Задачи»; при подключении
   *  настоящих данных судьбу страницы решает владелец отдельно. */
  next_contact_text?: string;
  next_contact_at?: string;
  /** Дата создания (макет, в формате ISO как поля created_at сервера) —
   *  нужна странице «Аналитика» для динамики поступления. */
  created_at?: string;
}

const tag = (id: number): MockTag => MOCK_TAGS.find((t) => t.id === id)!;

export const INITIAL_LEADS: BoardLead[] = [
  {
    id: 1,
    name: "Севертрейд",
    inn: "7701000001",
    logist_contact: "Анна Смирнова",
    logist_phone: "+7 915 204-18-73",
    priority: 2,
    stage_id: 1,
    assigned_to_id: 1,
    tags: [tag(3)],
    lost: false,
    source: "Сайт",
    time: "20 мин назад",
  },
  {
    id: 2,
    name: "Волга-Строй",
    inn: "5402000031",
    logist_contact: "Игорь Мальцев",
    logist_phone: "+7 903 771-22-09",
    priority: 3,
    stage_id: 1,
    assigned_to_id: 2,
    tags: [tag(2), tag(6)],
    lost: false,
    source: "Звонок",
    time: "1 ч назад",
  },
  {
    id: 3,
    name: "Клиника Здоровье",
    inn: "6617000065",
    logist_contact: "Мария Орлова",
    logist_phone: "+7 926 440-71-15",
    priority: 1,
    stage_id: 1,
    assigned_to_id: 3,
    tags: [tag(5)],
    lost: false,
    source: "Рекомендация",
    time: "2 ч назад",
  },
  {
    id: 4,
    name: "Аквилон",
    inn: "7840000094",
    logist_contact: "Дмитрий Савельев",
    logist_phone: "+7 921 118-54-30",
    priority: 1,
    stage_id: 2,
    assigned_to_id: 4,
    tags: [],
    lost: false,
    source: "Звонок",
    time: "3 ч назад",
  },
  {
    id: 5,
    name: "Ясная Поляна",
    inn: "1655000028",
    logist_contact: "Ольга Титова",
    logist_phone: "+7 950 332-80-44",
    priority: 0,
    stage_id: 2,
    assigned_to_id: 2,
    tags: [tag(3)],
    lost: false,
    source: "Мессенджер",
    time: "5 ч назад",
  },
  {
    id: 6,
    name: "ТехноПарк",
    inn: "5260000058",
    logist_contact: "Павел Гринёв",
    logist_phone: "+7 912 605-13-87",
    priority: 2,
    stage_id: 2,
    assigned_to_id: 1,
    tags: [tag(4)],
    lost: false,
    source: "Сайт",
    time: "вчера",
  },
  {
    id: 7,
    name: "Меридиан Логистика",
    inn: "6164000089",
    logist_contact: "Сергей Кузнецов",
    logist_phone: "+7 985 712-66-01",
    priority: 3,
    stage_id: 3,
    assigned_to_id: 4,
    tags: [tag(1), tag(6)],
    lost: false,
    source: "Звонок",
    time: "40 мин назад",
  },
  {
    id: 8,
    name: "Фарватер Трейд",
    inn: "5907000019",
    logist_contact: "Елена Волкова",
    logist_phone: "+7 917 330-95-62",
    priority: 2,
    stage_id: 3,
    assigned_to_id: 3,
    tags: [],
    lost: false,
    source: "Рекомендация",
    time: "4 ч назад",
  },
  {
    id: 9,
    name: "Гранит-Авто",
    inn: "0278000042",
    logist_contact: "Артём Белов",
    logist_phone: "+7 911 240-77-18",
    priority: 1,
    stage_id: 3,
    assigned_to_id: 2,
    tags: [tag(2)],
    lost: false,
    source: "Сайт",
    time: "вчера",
  },
  {
    id: 10,
    name: "Ритм-Сервис",
    inn: "4631000070",
    logist_contact: "Наталья Гордеева",
    logist_phone: "+7 922 811-09-54",
    priority: 2,
    stage_id: 4,
    assigned_to_id: 1,
    tags: [tag(4)],
    lost: false,
    source: "Мессенджер",
    time: "6 ч назад",
  },
  {
    id: 11,
    name: "Центр-Профи",
    inn: "7016000009",
    logist_contact: "Виктор Лапин",
    logist_phone: "+7 918 503-14-26",
    priority: 1,
    stage_id: 4,
    assigned_to_id: 4,
    tags: [tag(3)],
    lost: false,
    source: "Звонок",
    time: "вчера",
  },
  {
    id: 12,
    name: "Балтик Фиш",
    inn: "2312000031",
    logist_contact: "Ксения Дорошова",
    logist_phone: "+7 906 124-39-77",
    priority: 1,
    stage_id: 4,
    assigned_to_id: 3,
    tags: [tag(5)],
    lost: false,
    source: "Сайт",
    time: "2 дн назад",
  },
  {
    id: 13,
    name: "СтальИнвест",
    inn: "5018000064",
    logist_contact: "Роман Ефремов",
    logist_phone: "+7 961 448-02-31",
    priority: 2,
    stage_id: 5,
    assigned_to_id: 2,
    tags: [tag(6)],
    lost: false,
    source: "Звонок",
    time: "вчера",
  },
  {
    id: 14,
    name: "Дом Тканей",
    inn: "3327000090",
    logist_contact: "Юлия Панова",
    logist_phone: "+7 983 220-64-85",
    priority: 0,
    stage_id: 5,
    assigned_to_id: 4,
    tags: [],
    lost: false,
    source: "Сайт",
    time: "2 дн назад",
  },
  {
    id: 15,
    name: "Горный Ключ",
    inn: "3613000020",
    logist_contact: "Алексей Тарасов",
    logist_phone: "+7 927 667-41-02",
    priority: 3,
    stage_id: 6,
    assigned_to_id: 1,
    tags: [tag(1)],
    lost: false,
    source: "Рекомендация",
    time: "3 ч назад",
  },
  {
    id: 16,
    name: "Медиалайн",
    inn: "7451000052",
    logist_contact: "Ирина Соколова",
    logist_phone: "+7 977 015-83-49",
    priority: 1,
    stage_id: 6,
    assigned_to_id: 3,
    tags: [tag(3)],
    lost: false,
    source: "Мессенджер",
    time: "5 ч назад",
  },
];

/** Следующий id и цвет для новой колонки: цвета идут по кругу палитры. */
export function nextStage(stages: BoardStage[]): { id: number; color: StageColor } {
  return {
    id: Math.max(0, ...stages.map((stage) => stage.id)) + 1,
    color: STAGE_PALETTE[stages.length % STAGE_PALETTE.length],
  };
}
