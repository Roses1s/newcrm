import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { getCrm2Board, resetCrm2Board } from "./crm2-store";
import { contactTimeLabel } from "./time-label";
import { Crm2TasksPage } from "./Crm2TasksPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <Crm2TasksPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

it("напоминания делятся на просроченные, сегодняшние и предстоящие", () => {
  renderPage();

  const overdue = screen.getByLabelText("Задачи: Просрочено");
  const today = screen.getByLabelText("Задачи: Сегодня");
  const upcoming = screen.getByLabelText("Задачи: Предстоящие");

  // Посев crm2-store: две просроченные, две сегодняшние, четыре будущие.
  expect(within(overdue).getByText("Отправить расчёт ставки")).toBeVisible();
  expect(within(overdue).getByText("Перезвонить после отправки КП")).toBeVisible();
  expect(within(today).getByText("Уточнить дату отгрузки")).toBeVisible();
  expect(within(today).getByText("Согласовать условия договора")).toBeVisible();
  expect(within(upcoming).getByText("Напомнить о себе")).toBeVisible();
  expect(within(upcoming).getAllByRole("article")).toHaveLength(4);

  // Просроченные помечены красным «вчера».
  expect(within(overdue).getAllByText(/вчера/).length).toBeGreaterThan(0);
});

it("карточка задачи ведёт на страницу лида и показывает этап и продавца", () => {
  renderPage();

  const today = screen.getByLabelText("Задачи: Сегодня");
  expect(within(today).getByRole("link", { name: "Севертрейд" })).toHaveAttribute(
    "href",
    "/crm2/leads/1",
  );
  expect(within(today).getByText("Новый")).toBeVisible();
  expect(within(today).getAllByTitle("Продавец: Анна Ким")).toHaveLength(2);
});

it("«Выполнить» снимает напоминание и пишет запись в ленту лида", () => {
  renderPage();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Выполнить задачу: Отправить расчёт ставки (Волга-Строй)",
    }),
  );

  expect(screen.queryByText("Отправить расчёт ставки")).not.toBeInTheDocument();
  expect(getCrm2Board().leads.find((lead) => lead.id === 2)?.next_contact_at).toBeUndefined();
  expect(getCrm2Board().timeline[2]?.[0]?.field).toBe("Следующий контакт");
});

it("подписи сроков понятны: вчера/сегодня/завтра/дата", () => {
  const day = 24 * 3600 * 1000;
  const noon = new Date();
  noon.setHours(12, 30, 0, 0);
  expect(contactTimeLabel(noon.toISOString())).toBe("сегодня, 12:30");
  expect(contactTimeLabel(new Date(noon.getTime() - day).toISOString())).toBe("вчера, 12:30");
  expect(contactTimeLabel(new Date(noon.getTime() + day).toISOString())).toBe("завтра, 12:30");
});

it("после выполнения всех задач колонка честно показывает пустое состояние", () => {
  renderPage();

  fireEvent.click(
    screen.getByRole("button", {
      name: "Выполнить задачу: Отправить расчёт ставки (Волга-Строй)",
    }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "Выполнить задачу: Перезвонить после отправки КП (Фарватер Трейд)",
    }),
  );

  const overdue = screen.getByLabelText("Задачи: Просрочено");
  expect(within(overdue).getByText("Задач нет")).toBeVisible();
});
