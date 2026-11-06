import { render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { resetCrm2Board } from "./crm2-store";
import { Crm2AnalyticsPage } from "./Crm2AnalyticsPage";

beforeEach(() => {
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

it("воронка показывает шесть этапов в цветах владельца с живыми счётчиками", () => {
  render(<Crm2AnalyticsPage />);

  const funnel = screen.getByLabelText("Воронка продаж");
  expect(funnel).toHaveTextContent("16 активных лидов");
  for (const name of [
    "Новый",
    "Перезвонить",
    "Вышел на ЛПР",
    "Потенциальный",
    "Уехали",
    "Ждем заявку",
  ]) {
    expect(within(funnel).getByText(name)).toBeVisible();
  }
  expect(funnel).toHaveTextContent("1 вне воронки");
});

it("динамика рисует график по неделям, а источники — метки цвета карточек", () => {
  render(<Crm2AnalyticsPage />);

  expect(screen.getByLabelText("График поступления лидов по неделям")).toBeInTheDocument();
  const sources = screen.getByLabelText("Источники лидов");
  // Посев: Сайт — 5, Звонок — 5, Рекомендация — 4, Мессенджер — 2.
  expect(within(sources).getByText("Сайт")).toBeVisible();
  expect(within(sources).getByText("Мессенджер")).toBeVisible();
});

it("рейтинг продавцов показывает активные и горячие лиды каждого", () => {
  render(<Crm2AnalyticsPage />);

  const rating = screen.getByLabelText("Рейтинг продавцов");
  // Посев даёт по четыре активных лида у каждого продавца; горячих — по
  // одному, кроме Марии Лебедевой.
  const rows = within(rating).getAllByText(/· горячих \d/);
  expect(rows).toHaveLength(4);
  expect(rows.map((row) => row.textContent)).toEqual([
    "4 · горячих 1",
    "4 · горячих 1",
    "4 · горячих 0",
    "4 · горячих 1",
  ]);
  expect(within(rating).getByText("Мария Лебедева")).toBeVisible();
});
