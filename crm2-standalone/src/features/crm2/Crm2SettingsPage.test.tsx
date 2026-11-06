import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { setCrm2Theme } from "./crm2-theme";
import { getCrm2Board, resetCrm2Board } from "./crm2-store";
import { Crm2SettingsPage } from "./Crm2SettingsPage";

beforeEach(() => {
  window.localStorage.removeItem("crm2.theme");
  setCrm2Theme("light");
  resetCrm2Board();
});

it("карточки темы переключают оформление и запоминают выбор", () => {
  render(<Crm2SettingsPage />);

  const root = document.querySelector("[data-theme]");
  expect(root?.getAttribute("data-theme")).toBe("light");
  // Выбираем карточку в секции «Тема оформления»: в шапке есть тот же тумблер.
  const section = screen.getByRole("region", { name: "Тема оформления" });
  fireEvent.click(within(section).getByRole("button", { name: /Тёмная/ }));
  expect(root?.getAttribute("data-theme")).toBe("dark");
  expect(window.localStorage.getItem("crm2.theme")).toBe("dark");
  fireEvent.click(within(section).getByRole("button", { name: /Светлая/ }));
  expect(root?.getAttribute("data-theme")).toBe("light");
});

it("этап переименовывается через поле списка и перекрашивается свотчами", () => {
  render(<Crm2SettingsPage />);

  fireEvent.change(screen.getByRole("textbox", { name: "Название: Новый" }), {
    target: { value: "Свежий" },
  });
  expect(getCrm2Board().stages[0]?.name).toBe("Свежий");

  fireEvent.click(screen.getByRole("button", { name: "Цвет этапа Свежий — #14b8a6" }));
  expect(getCrm2Board().stages[0]?.color.dot).toBe("#14b8a6");
});

it("порядок этапов меняется стрелками, а удаление переносит карточки", () => {
  render(<Crm2SettingsPage />);

  fireEvent.click(screen.getByRole("button", { name: "Этап «Новый» ниже" }));
  expect(
    getCrm2Board()
      .stages.map((stage) => stage.name)
      .slice(0, 2),
  ).toEqual(["Перезвонить", "Новый"]);

  // Удаление — со вторым щелчком, как в меню колонки доски.
  fireEvent.click(screen.getByRole("button", { name: "Удалить этап «Уехали»" }));
  expect(getCrm2Board().stages).toHaveLength(6);
  fireEvent.click(screen.getByRole("button", { name: "Удалить этап «Уехали»" }));
  const state = getCrm2Board();
  expect(state.stages).toHaveLength(5);
  expect(state.leads.find((lead) => lead.id === 13)?.stage_id).toBe(state.stages[0]?.id);
});

it("сброс возвращает исходный макет после правок", () => {
  render(<Crm2SettingsPage />);

  fireEvent.click(screen.getByRole("button", { name: "Этап" }));
  expect(getCrm2Board().stages).toHaveLength(7);

  fireEvent.click(screen.getByRole("button", { name: "Сбросить демо-данные" }));
  fireEvent.click(screen.getByRole("button", { name: "Точно сбросить макет?" }));
  expect(getCrm2Board().stages).toHaveLength(6);
  expect(getCrm2Board().leads).toHaveLength(17);
  expect(getCrm2Board().stages[0]?.name).toBe("Новый");
});
