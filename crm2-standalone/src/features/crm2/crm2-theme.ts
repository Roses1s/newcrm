// Общая тема новой CRM (/crm2): светлая по умолчанию, тёмная — по выбору.
//
// Раньше тема жила только в доске LeadBoard. С шага переноса оболочки тема
// общая на все разделы /crm2: переключатель может стоять в шапке любой
// страницы, и все они перекрашиваются синхронно, потому что состояние лежит
// здесь, а не внутри одного компонента. Ключ и значения в localStorage те же,
// что были у доски (`crm2.theme` = "dark"), поэтому выбор человека не теряется.

import { useSyncExternalStore } from "react";

export type Crm2Theme = "light" | "dark";

const THEME_KEY = "crm2.theme";

const listeners = new Set<() => void>();
let current: Crm2Theme = loadTheme();

function loadTheme(): Crm2Theme {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function getCrm2Theme(): Crm2Theme {
  return current;
}

export function setCrm2Theme(next: Crm2Theme): void {
  if (current === next) return;
  current = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Хранилище недоступно (приватный режим/запрет) — просто работаем без
    // запоминания, тема переключится только на время сессии.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Текущая тема /crm2: компонент перерисуется при её смене из любого места. */
export function useCrm2Theme(): Crm2Theme {
  return useSyncExternalStore(subscribe, getCrm2Theme, () => "light");
}
