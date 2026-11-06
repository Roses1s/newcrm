import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { getCrm2Board, resetCrm2Board } from "./crm2-store";
import { LeadPage } from "./LeadPage";

// Страница использует useBlocker — он работает только на data router,
// поэтому вместо MemoryRouter поднимаем createMemoryRouter с пробами соседей.
function renderLead(id: number) {
  const router = createMemoryRouter(
    [
      { path: "/crm2", element: <p>Доска-проба</p> },
      { path: "/crm2/tasks", element: <p>Задачи-проба</p> },
      { path: "/crm2/leads/:id", element: <LeadPage /> },
    ],
    { initialEntries: [`/crm2/leads/${id}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

beforeEach(() => {
  vi.useRealTimers();
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

it("показывает карточку: шапка, статусбар этапов, пейджер и поля", () => {
  renderLead(2);

  expect(screen.getByLabelText("Название лида")).toHaveValue("Волга-Строй");
  expect(screen.getByLabelText("ИНН лида")).toHaveValue("5402000031");
  expect(screen.getByLabelText("Контакт логиста")).toHaveValue("Игорь Мальцев");
  expect(screen.getByText("2 из 16")).toBeVisible();
  expect(screen.getByLabelText("Приоритет лида: 3 из 3")).toBeInTheDocument();

  // Статусбар: пять этапов видно, шестой — за «…», текущий отмечен.
  const bar = screen.getByLabelText("Этапы лида");
  const stageButtons = within(bar).getAllByRole("button", { pressed: undefined });
  expect(
    within(bar).getAllByRole("button", { name: /Новый|Перезвонить|ЛПР|Потенциальный|Уехали/ }),
  ).toHaveLength(5);
  expect(stageButtons.length).toBeGreaterThan(0);
  expect(within(bar).getByRole("button", { name: "Показать остальные этапы" })).toBeVisible();
  expect(within(bar).getByRole("button", { name: /Новый/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("«…» раскрывает остальные этапы статусбара", () => {
  renderLead(2);
  const bar = screen.getByLabelText("Этапы лида");
  fireEvent.click(within(bar).getByRole("button", { name: "Показать остальные этапы" }));
  expect(within(bar).getByRole("button", { name: /Ждем заявку/ })).toBeVisible();
});

it("правка названия автосохраняется через 3 секунды простоя", () => {
  vi.useFakeTimers();
  renderLead(2);

  fireEvent.change(screen.getByLabelText("Название лида"), {
    target: { value: "Волга-Строй Норд" },
  });
  expect(screen.getByText(/есть несохранённые правки/)).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(3500));
  expect(getCrm2Board().leads.find((lead) => lead.id === 2)?.name).toBe("Волга-Строй Норд");
  expect(screen.getByText(/сохранено/)).toBeInTheDocument();
});

it("невалидный ИНН подсвечивается ошибкой и приостанавливает запись", () => {
  vi.useFakeTimers();
  renderLead(2);

  // ИНН валиден у демо-данных; ломаем последнюю цифру — контрольная сумма
  // перестаёт сходиться (та же проверка, что у сервера).
  fireEvent.change(screen.getByLabelText("ИНН лида"), { target: { value: "5402000032" } });
  vi.runAllTimers();

  expect(screen.getByText("Некорректный ИНН: не сходится контрольная сумма")).toBeVisible();
  expect(screen.queryByText(/сохранено/)).not.toBeInTheDocument();
  expect(getCrm2Board().leads.find((lead) => lead.id === 2)?.inn).toBe("5402000031");
});

it("клик по этапу переносит лид и пишет запись в ленту", () => {
  renderLead(2);

  fireEvent.click(
    within(screen.getByLabelText("Этапы лида")).getByRole("button", { name: /Потенциальный/ }),
  );

  expect(getCrm2Board().leads.find((lead) => lead.id === 2)?.stage_id).toBe(4);
  const feed = screen.getByLabelText("Лента лида");
  expect(within(feed).getByText("Этапы лидов: Новый → Потенциальный")).toBeInTheDocument();
});

it("заметка появляется в ленте сверху от имени текущего пользователя", () => {
  renderLead(1);

  fireEvent.change(screen.getByLabelText("Текст заметки"), {
    target: { value: "Договорились о встрече в четверг" },
  });
  fireEvent.click(screen.getByRole("button", { name: /Отправить/ }));

  const feed = screen.getByLabelText("Лента лида");
  expect(within(feed).getByText("Договорились о встрече в четверг")).toBeInTheDocument();
  expect(within(feed).getAllByText("Анна Ким").length).toBeGreaterThan(0);
});

it("вложение добавляется из выбора файла и удаляется крестом", () => {
  renderLead(3);
  const files = new File(["содержимое"], "договор.pdf", { type: "application/pdf" });

  fireEvent.change(screen.getByLabelText("Выбрать вложение"), { target: { files: [files] } });
  expect(screen.getByLabelText("Вложения")).toHaveTextContent("договор.pdf");

  fireEvent.click(screen.getByRole("button", { name: "Удалить вложение договор.pdf" }));
  expect(screen.queryByText("договор.pdf")).not.toBeInTheDocument();
});

it("проигрыш требует причину, затем карточка становится доступной только для чтения", () => {
  renderLead(1);

  fireEvent.click(screen.getByRole("button", { name: "Действия с лидом" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Отметить проигрышем" }));
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Отметить проигрышем?" })).getByRole("button", {
      name: /Цена не устроила/,
    }),
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Лид проигран — Цена не устроила");
  expect(screen.getByLabelText("Название лида")).toBeDisabled();
  expect(getCrm2Board().leads.find((lead) => lead.id === 1)?.lost).toBe(true);

  // Восстановление возвращает карточку в работу с записью в ленте.
  fireEvent.click(screen.getByRole("button", { name: "Вернуть в работу" }));
  expect(getCrm2Board().leads.find((lead) => lead.id === 1)?.lost).toBe(false);
  expect(screen.getByLabelText("Название лида")).toBeEnabled();
  expect(screen.getByLabelText("Лента лида")).toHaveTextContent("Активный: Нет → Да");
});

it("передача коллеге меняет продавца и пишет запись в ленту", () => {
  renderLead(2);

  fireEvent.click(screen.getByRole("button", { name: "Действия с лидом" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Передать коллеге" }));
  fireEvent.click(
    within(screen.getByRole("dialog", { name: "Передать лид коллеге" })).getByRole("button", {
      name: /Мария Лебедева/,
    }),
  );

  expect(getCrm2Board().leads.find((lead) => lead.id === 2)?.assigned_to_id).toBe(3);
  expect(screen.getByLabelText("Лента лида")).toHaveTextContent(
    "Продавец: Сергей Полянский → Мария Лебедева",
  );
});

it("пейджер листает карточки по порядку чтения доски", async () => {
  const router = renderLead(2);

  fireEvent.click(screen.getByRole("button", { name: "Следующий лид" }));
  expect(screen.getByLabelText("Название лида")).toHaveValue("Клиника Здоровье");
  expect(screen.getByText("3 из 16")).toBeVisible();
  expect(router.state.location.pathname).toBe("/crm2/leads/3");

  fireEvent.click(screen.getByRole("button", { name: "Предыдущий лид" }));
  expect(screen.getByLabelText("Название лида")).toHaveValue("Волга-Строй");
});

it("удаление со вторым подтверждением возвращает на доску и стирает лид", () => {
  const router = renderLead(1);

  fireEvent.click(screen.getByRole("button", { name: "Действия с лидом" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Удалить лид" }));
  // Первый клик только просит подтверждение — лид на месте.
  expect(getCrm2Board().leads.find((lead) => lead.id === 1)).toBeDefined();
  fireEvent.click(screen.getByRole("menuitem", { name: /Точно удалить/ }));

  expect(getCrm2Board().leads.find((lead) => lead.id === 1)).toBeUndefined();
  expect(router.state.location.pathname).toBe("/crm2");
  expect(screen.getByText("Доска-проба")).toBeVisible();
});

it("уход с несохранёнными правками удерживается диалогом", async () => {
  const router = renderLead(2);
  fireEvent.change(screen.getByLabelText("Название лида"), { target: { value: "Черновик" } });

  // Проба-сосед: ссылки на него нет в разметке страницы, поэтому уходим
  // навигацией роутера — blocker срабатывает одинаково.
  await act(async () => {
    router.navigate("/crm2/tasks");
  });

  expect(screen.getByRole("dialog", { name: "Несохранённые изменения" })).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/crm2/leads/2");

  fireEvent.click(screen.getByRole("button", { name: "Остаться" }));
  expect(screen.queryByRole("dialog", { name: "Несохранённые изменения" })).not.toBeInTheDocument();

  await act(async () => {
    router.navigate("/crm2/tasks");
  });
  fireEvent.click(screen.getByRole("button", { name: "Уйти без сохранения" }));
  expect(router.state.location.pathname).toBe("/crm2/tasks");
  expect(screen.getByText("Задачи-проба")).toBeVisible();
});

it("неизвестный номер лида показывает аккуратное пустое состояние", () => {
  renderLead(999);

  expect(screen.getByText("Лид №999 не найден в макете")).toBeVisible();
  expect(screen.getByRole("link", { name: "К доске лидов" })).toHaveAttribute("href", "/crm2");
});
