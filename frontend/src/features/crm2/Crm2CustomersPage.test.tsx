import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { resetCrm2Board } from "./crm2-store";
import { Crm2CustomersPage } from "./Crm2CustomersPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <Crm2CustomersPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

it("фильтр «Все / Активные / Проигранные» со счётчиками каталога", () => {
  renderPage();

  expect(screen.getByRole("button", { name: /Все/ })).toHaveTextContent("17");
  expect(screen.getByRole("button", { name: /Активные/ })).toHaveTextContent("16");
  expect(screen.getByRole("button", { name: /Проигранные/ })).toHaveTextContent("1");

  // По умолчанию — весь каталог, включая макетный проигрыш.
  expect(screen.getByRole("link", { name: "Волга-Строй" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Ледокол-Опторг" })).toBeVisible();
});

it("«Проигранные» показывают только их и помечают ленточкой", () => {
  renderPage();

  fireEvent.click(screen.getByRole("button", { name: /Проигранные/ }));

  expect(screen.getByRole("link", { name: "Ледокол-Опторг" })).toBeVisible();
  expect(screen.getByText("Проигран")).toBeVisible();
  expect(screen.getByText("Вне воронки")).toBeVisible();
  expect(screen.queryByRole("link", { name: "Волга-Строй" })).not.toBeInTheDocument();
});

it("поиск ограничен названием и ИНН, как в каталоге основной CRM", () => {
  renderPage();

  fireEvent.change(screen.getByLabelText("Поиск клиентов"), { target: { value: "волга" } });
  expect(screen.getByRole("link", { name: "Волга-Строй" })).toBeVisible();
  expect(screen.queryByRole("link", { name: "Аквилон" })).not.toBeInTheDocument();

  // ИНН находит; контакт логиста — нет (он не входит в поиск каталога).
  fireEvent.change(screen.getByLabelText("Поиск клиентов"), { target: { value: "7840000094" } });
  expect(screen.getByRole("link", { name: "Аквилон" })).toBeVisible();
  fireEvent.change(screen.getByLabelText("Поиск клиентов"), { target: { value: "Дмитрий" } });
  expect(screen.queryByRole("link", { name: "Аквилон" })).not.toBeInTheDocument();
});

it("пустой результат показывает аккуратное состояние", () => {
  renderPage();

  fireEvent.change(screen.getByLabelText("Поиск клиентов"), { target: { value: "zzzz" } });
  expect(screen.getByText("Ничего не найдено")).toBeVisible();
});

it("строка ведёт на отдельную страницу лида, этап подсвечен цветом колонки", () => {
  renderPage();

  expect(screen.getByRole("link", { name: "Меридиан Логистика" })).toHaveAttribute(
    "href",
    "/crm2/leads/7",
  );
  const row = screen.getByRole("link", { name: "Меридиан Логистика" }).closest("tr")!;
  expect(within(row).getByText("Вышел на ЛПР")).toBeVisible();
  expect(within(row).getByText("Игорь")).toBeInTheDocument();
});
