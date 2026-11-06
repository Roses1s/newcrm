import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { resetCrm2Board } from "./crm2-store";

import { STAGE_MIME } from "./LeadBoardColumn";
import { LeadBoard } from "./LeadBoard";

// Карточки доски ведут на страницу лида, поэтому доске нужен роутер.
function renderBoard() {
  return render(
    <MemoryRouter>
      <LeadBoard />
    </MemoryRouter>,
  );
}

// Макетное состояние CRM2 — общее (crm2-store): каждый тест начинает доску
// заново, иначе переносы из соседней проверки оставались бы на доске.
beforeEach(() => {
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

// В jsdom нет настоящего перетаскивания: подставляем dataTransfer с тем же
// контрактом setData/getData/types, которым пользуется компонент (типы
// отличают перенос карточки от переноса колонки).
function makeDataTransfer(): DataTransfer {
  const store: Record<string, string> = {};
  const types: string[] = [];
  return {
    setData: (type: string, value: string) => {
      if (!types.includes(type)) types.push(type);
      store[type] = value;
    },
    getData: (type: string) => store[type] ?? "",
    get types() {
      return types;
    },
    effectAllowed: "move",
    dropEffect: "move",
  } as unknown as DataTransfer;
}

function column(name: string): HTMLElement {
  return screen.getByRole("region", { name: `Колонка ${name}` });
}

function columnList(name: string): HTMLElement {
  return within(column(name)).getByRole("list", { name: `Карточки этапа ${name}` });
}

function dragLeadOntoColumn(leadTitle: string, stageName: string) {
  const dataTransfer = makeDataTransfer();
  const card = screen.getByRole("link", { name: leadTitle }).closest("article");
  expect(card).not.toBeNull();
  fireEvent.dragStart(card as HTMLElement, { dataTransfer });
  fireEvent.dragOver(columnList(stageName), { dataTransfer });
  fireEvent.drop(columnList(stageName), { dataTransfer });
  return dataTransfer;
}

it("показывает шесть колонок этапов владельца в заданном порядке", () => {
  renderBoard();

  const headings = screen.getAllByRole("heading", { level: 2 });
  expect(headings.map((heading) => heading.textContent)).toEqual([
    "Новый",
    "Перезвонить",
    "Вышел на ЛПР",
    "Потенциальный",
    "Уехали",
    "Ждем заявку",
  ]);
});

it("карточки содержат поля реального лида: название, ИНН, контакт, теги, продавца", () => {
  renderBoard();

  const newColumn = column("Новый");
  // Название — ссылка на отдельную страницу лида (решение владельца).
  const link = within(newColumn).getByRole("link", { name: "Волга-Строй" });
  expect(link).toHaveAttribute("href", "/crm2/leads/2");
  expect(within(newColumn).getByText("ИНН 5402000031")).toBeInTheDocument();
  expect(within(newColumn).getByText("Игорь Мальцев · +7 903 771-22-09")).toBeInTheDocument();
  expect(within(newColumn).getByText("Негабарит")).toBeInTheDocument();
  expect(within(newColumn).getByText("Постоянник")).toBeInTheDocument();
  expect(within(newColumn).getByText("Звонок")).toBeInTheDocument();
  expect(within(newColumn).getByText("1 ч назад")).toBeInTheDocument();
  expect(within(newColumn).getByTitle("Продавец: Сергей Полянский")).toBeInTheDocument();
  expect(within(link.closest("article")!).getByLabelText("Приоритет: 3 из 3")).toBeInTheDocument();

  // Распределение по колонкам прежнее: 3/3/3/3/2/2.
  expect(within(column("Новый")).getAllByRole("listitem")).toHaveLength(3);
  expect(within(column("Перезвонить")).getAllByRole("listitem")).toHaveLength(3);
  expect(within(column("Вышел на ЛПР")).getAllByRole("listitem")).toHaveLength(3);
  expect(within(column("Потенциальный")).getAllByRole("listitem")).toHaveLength(3);
  expect(within(column("Уехали")).getAllByRole("listitem")).toHaveLength(2);
  expect(within(column("Ждем заявку")).getAllByRole("listitem")).toHaveLength(2);
});

it("строка показателей живая: считает текущий макет доски", () => {
  renderBoard();

  const stats = screen.getByLabelText("Показатели доски");
  const totals = within(stats)
    .getAllByText(/^\d+$/)
    .map((node) => node.textContent);
  expect(totals).toEqual(["16", "3", "3", "5"]);
});

it("перетаскивание в конец колонки переносит карточку и меняет счётчики", () => {
  renderBoard();

  dragLeadOntoColumn("Волга-Строй", "Перезвонить");

  const from = column("Новый");
  const to = column("Перезвонить");
  expect(within(to).getByRole("link", { name: "Волга-Строй" })).toBeInTheDocument();
  expect(within(from).queryByText("Волга-Строй")).not.toBeInTheDocument();
  expect(within(from).getAllByRole("listitem")).toHaveLength(2);
  expect(within(to).getAllByRole("listitem")).toHaveLength(4);
});

it("карточку можно вставить перед другой карточкой внутри колонки", () => {
  renderBoard();

  const dataTransfer = makeDataTransfer();
  const moving = screen.getByRole("link", { name: "Клиника Здоровье" }).closest("article");
  const anchor = screen.getByRole("link", { name: "Севертрейд" }).closest("article");
  fireEvent.dragStart(moving as HTMLElement, { dataTransfer });
  fireEvent.dragOver(anchor as HTMLElement, { dataTransfer });
  fireEvent.drop(anchor as HTMLElement, { dataTransfer });

  const titles = within(column("Новый"))
    .getAllByRole("link")
    .map((link) => link.textContent);
  // Вставлена перед «Севертрейд» — не в конец колонки.
  expect(titles).toEqual(["Клиника Здоровье", "Севертрейд", "Волга-Строй"]);
});

it("меню карточки переносит её в выбранный этап без перетаскивания", () => {
  renderBoard();

  fireEvent.click(screen.getByRole("button", { name: "Действия: Аквилон" }));
  fireEvent.click(
    within(screen.getByRole("menu", { name: "Действия: Аквилон" })).getByText("Потенциальный"),
  );

  expect(
    within(column("Потенциальный")).getByRole("link", { name: "Аквилон" }),
  ).toBeInTheDocument();
  expect(within(column("Перезвонить")).queryByText("Аквилон")).not.toBeInTheDocument();
});

it("проигрыш из меню прячет карточку с доски и уменьшает показатель", () => {
  renderBoard();

  fireEvent.click(screen.getByRole("button", { name: "Действия: Аквилон" }));
  fireEvent.click(
    within(screen.getByRole("menu", { name: "Действия: Аквилон" })).getByText(
      "Отметить проигрышем",
    ),
  );

  expect(screen.queryByText("Аквилон")).not.toBeInTheDocument();
  expect(within(column("Перезвонить")).getAllByRole("listitem")).toHaveLength(2);
  const stats = screen.getByLabelText("Показатели доски");
  expect(
    within(stats)
      .getAllByText(/^\d+$/)
      .map((n) => n.textContent)[0],
  ).toBe("15");
});

it("удаление из меню спрашивает второй клик и затем убирает карточку", () => {
  renderBoard();

  const open = screen.getByRole("button", { name: "Действия: Медиалайн" });
  fireEvent.click(open);
  const menu = screen.getByRole("menu", { name: "Действия: Медиалайн" });

  // Первый клик только просит подтверждение, карточка на месте.
  fireEvent.click(within(menu).getByText("Удалить"));
  expect(screen.getByText("Медиалайн")).toBeInTheDocument();
  fireEvent.click(within(menu).getByText("Точно удалить?"));

  expect(screen.queryByText("Медиалайн")).not.toBeInTheDocument();
  expect(within(column("Ждем заявку")).getAllByRole("listitem")).toHaveLength(1);
});

it("звёзды меняют приоритет карточки и показатель «Горячие»", () => {
  renderBoard();

  const card = screen.getByRole("link", { name: "Ясная Поляна" }).closest("article")!;
  fireEvent.click(within(card).getByRole("button", { name: "Приоритет 3" }));

  expect(within(card).getByLabelText("Приоритет: 3 из 3")).toBeInTheDocument();
  const stats = screen.getByLabelText("Показатели доски");
  expect(
    within(stats)
      .getAllByText(/^\d+$/)
      .map((n) => n.textContent)[1],
  ).toBe("4");
});

it("новая колонка добавляется в конец и сразу ждёт название", () => {
  renderBoard();

  fireEvent.click(screen.getByRole("button", { name: /Новый этап/ }));

  // Седьмая колонка появилась в конце; пока ждёт название, вместо её
  // заголовка видно поле ввода — заголовков остаётся шесть.
  expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toHaveLength(6);
  const draft = screen.getByRole("textbox", { name: "Название этапа Новый этап" });
  expect(draft).toHaveValue("Новый этап");
  fireEvent.change(draft, { target: { value: "Подписан договор" } });
  fireEvent.keyDown(draft, { key: "Enter" });
  expect(screen.getByRole("heading", { level: 2, name: "Подписан договор" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(7);
});

it("этап переименовывается по двойному клику и через меню колонки", () => {
  renderBoard();

  fireEvent.doubleClick(screen.getByRole("heading", { level: 2, name: "Перезвонить" }));
  const draft = screen.getByRole("textbox", { name: "Название этапа Перезвонить" });
  fireEvent.change(draft, { target: { value: "Повторный звонок" } });
  fireEvent.blur(draft);

  expect(screen.getByRole("heading", { level: 2, name: "Повторный звонок" })).toBeInTheDocument();
  expect(within(column("Повторный звонок")).getAllByRole("listitem")).toHaveLength(3);
});

it("удаление этапа переносит его карточки в первый оставшийся", () => {
  renderBoard();

  fireEvent.click(screen.getByRole("button", { name: "Настройки этапа Уехали" }));
  const menu = screen.getByRole("menu", { name: "Настройки этапа Уехали" });
  fireEvent.click(within(menu).getByText("Удалить этап"));
  fireEvent.click(within(menu).getByText(/Точно удалить/));

  expect(screen.queryByRole("heading", { level: 2, name: "Уехали" })).not.toBeInTheDocument();
  const first = column("Новый");
  expect(within(first).getAllByRole("listitem")).toHaveLength(5);
  expect(within(first).getByRole("link", { name: "СтальИнвест" })).toBeInTheDocument();
});

it("этап перекрашивается из палитры CRM2", () => {
  renderBoard();

  fireEvent.click(screen.getByRole("button", { name: "Настройки этапа Новый" }));
  fireEvent.click(screen.getByRole("button", { name: "Цвет этапа #f59e0b" }));

  const heading = screen.getByRole("heading", { level: 2, name: "Новый" });
  expect(heading.style.color).toBe("rgb(245, 158, 11)");
});

it("колонки меняются местами перетаскиванием за заголовок", () => {
  renderBoard();

  const dataTransfer = makeDataTransfer();
  const movingHeader = screen.getByLabelText("Заголовок этапа Ждем заявку");
  fireEvent.dragStart(movingHeader, { dataTransfer });
  expect(dataTransfer.getData(STAGE_MIME)).toBe("6");
  fireEvent.dragOver(columnList("Новый"), { dataTransfer });
  fireEvent.drop(columnList("Новый"), { dataTransfer });

  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(headings.slice(0, 3)).toEqual(["Ждем заявку", "Новый", "Перезвонить"]);
});

it("перетаскивание колонки на карточку не сдвигает карточки и не ломает порядок", () => {
  renderBoard();

  // Колонку тянут за заголовок; бросок на карточку должен игнорировать
  // карточный тип переноса (иначе колонка «переезжала» бы как лид).
  const dataTransfer = makeDataTransfer();
  fireEvent.dragStart(screen.getByLabelText("Заголовок этапа Потенциальный"), { dataTransfer });
  expect(dataTransfer.getData(STAGE_MIME)).toBe("4");
  const card = screen.getByRole("link", { name: "Центр-Профи" }).closest("article");
  fireEvent.drop(card as HTMLElement, { dataTransfer });

  const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
  expect(headings).toEqual([
    "Новый",
    "Перезвонить",
    "Вышел на ЛПР",
    "Потенциальный",
    "Уехали",
    "Ждем заявку",
  ]);
  expect(within(column("Потенциальный")).getAllByRole("listitem")).toHaveLength(3);
});

it("по умолчанию светлая тема; переключатель ставит тёмную и запоминает выбор", () => {
  window.localStorage.removeItem("crm2.theme");
  renderBoard();

  const root = document.querySelector("[data-theme]");
  expect(root).not.toBeNull();
  expect(root?.getAttribute("data-theme")).toBe("light");

  const lightButton = screen.getByRole("button", { name: "Светлая" });
  const darkButton = screen.getByRole("button", { name: "Тёмная" });
  expect(lightButton).toHaveAttribute("aria-pressed", "true");
  expect(darkButton).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(darkButton);
  expect(root?.getAttribute("data-theme")).toBe("dark");
  expect(darkButton).toHaveAttribute("aria-pressed", "true");
  expect(lightButton).toHaveAttribute("aria-pressed", "false");
  expect(window.localStorage.getItem("crm2.theme")).toBe("dark");

  // Убираем выбор за собой, чтобы не влиять на другие тесты.
  window.localStorage.removeItem("crm2.theme");
});
