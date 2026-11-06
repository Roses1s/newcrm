import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { startFakeApi, type FakeServer } from "@/test/fake-api";

const ADMIN = {
  id: 1,
  email: "admin@example.com",
  first_name: "Анна",
  last_name: "Администратор",
  role: "admin",
  is_active: true,
};

const ADMIN_APPS = [
  {
    id: 1,
    slug: "crm",
    name: "CRM",
    description: "Лиды и воронка продаж",
    icon: "Kanban",
    route: "/crm",
    min_role: "manager",
  },
  {
    id: 2,
    slug: "admin",
    name: "Администрирование",
    description: "Пользователи и безопасность",
    icon: "Settings",
    route: "/admin",
    min_role: "admin",
  },
];

let server: FakeServer | undefined;
let modules: AppModules | undefined;

afterEach(() => {
  modules?.cleanup();
  modules = undefined;
  server?.restore();
  server = undefined;
  window.history.replaceState({}, "", "/");
});

async function loadModules() {
  // router.tsx создаёт настоящий BrowserRouter на уровне модуля и считывает
  // текущий URL при создании. Задаём начальный путь перед импортом.
  vi.resetModules();
  const rtl = await import("@testing-library/react");
  const { AppRouter } = await import("@/app/router");
  const { Providers } = await import("@/app/providers");
  const auth = await import("@/shared/api/auth");
  const loaded = { ...rtl, AppRouter, Providers, auth };
  modules = loaded;
  return loaded;
}

type AppModules = Awaited<ReturnType<typeof loadModules>>;

it("неизвестный адрес ведёт в лаунчер, а /admin — на вложенный список пользователей", async () => {
  window.history.replaceState({}, "", "/unknown-page");
  server = startFakeApi([
    { path: "/auth/me", response: ADMIN },
    { path: "/launcher/apps", response: ADMIN_APPS },
    { path: "/admin/users", response: [] },
  ]);

  const app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  expect(await app.screen.findByRole("heading", { name: "Приложения" })).toBeVisible();
  expect(window.location.pathname).toBe("/");

  const user = userEvent.setup();
  const adminApp = await app.screen.findByRole("link", { name: /^Администрирование/ });
  await user.click(adminApp);

  expect(await app.screen.findByRole("heading", { name: "Пользователи" })).toBeVisible();
  expect(window.location.pathname).toBe("/admin/users");
  expect(server?.called("GET", "/admin/users")).toBe(true);
}, 15_000);

it("новая CRM показывает панель и доску без запросов к данным", async () => {
  window.history.replaceState({}, "", "/crm2");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([]);
  const app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  const page = app.screen.getByRole("main", { name: "Новая CRM" });
  // Основная область — канбан-доска с этапами владельца, данные вымышленные.
  expect(
    app
      .within(page)
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent),
  ).toEqual(["Новый", "Перезвонить", "Вышел на ЛПР", "Потенциальный", "Уехали", "Ждем заявку"]);
  expect(app.screen.getByRole("link", { name: "Волга-Строй" })).toBeVisible();
  expect(app.screen.getByText(/Игорь Мальцев/)).toBeVisible();
  expect(app.screen.getByRole("complementary", { name: "Боковая панель — пример" })).toBeVisible();
  expect(app.screen.getByText("CRM Детроид")).toBeVisible();
  // Пункты меню — семь ссылок: «Задачи» добавлен между «Клиенты» и
  // «Аналитика», временные разделы сохраняют метку «СКОРО». Остальные
  // ссылки на экране — названия карточек доски, ведущие на страницу лида.
  const sidebar = app.screen.getByRole("complementary", { name: "Боковая панель — пример" });
  expect(app.within(sidebar).getAllByRole("link")).toHaveLength(7);
  expect(app.screen.getByText("Доска лидов")).toBeVisible();
  expect(app.screen.getByText("Клиенты")).toBeVisible();
  expect(app.screen.getByText("Задачи")).toBeVisible();
  expect(app.screen.getByText("Аналитика")).toBeVisible();
  expect(app.screen.getByText("Сделки")).toBeVisible();
  expect(app.screen.getByText("Календарь")).toBeVisible();
  expect(app.screen.getByText("Настройки")).toBeVisible();
  // С шага 4 счётчики «Доска лидов», «Клиенты» и «Задачи» живые: 16 активных
  // лидов на доске, 17 записей в каталоге, 2 просроченных напоминания.
  expect(app.within(sidebar).getAllByText("16")).toHaveLength(1);
  expect(app.within(sidebar).getAllByText("17")).toHaveLength(1);
  expect(app.within(sidebar).getAllByText("2")).toHaveLength(1);
  expect(app.screen.getAllByText("СКОРО")).toHaveLength(2);
  expect(app.screen.getByText("86%")).toBeVisible();
  expect(app.screen.getByText("Тёмная тема")).toBeVisible();
  expect(app.screen.getByText("Анна Ким")).toBeVisible();
  // Ключевые кнопки каркаса: свернуть меню плюс переключатель темы доски.
  // Общий счёт не проверяем: с шага 2 у карточек есть звёзды и меню действий.
  expect(app.screen.getByRole("button", { name: "Свернуть меню" })).toBeVisible();
  expect(app.screen.getByRole("group", { name: "Тема оформления" })).toBeVisible();
  expect(app.screen.getByRole("button", { name: "Светлая" })).toBeVisible();
  expect(app.screen.getByRole("button", { name: "Тёмная" })).toBeVisible();
  expect(app.screen.getByRole("button", { name: "Действия: Волга-Строй" })).toBeVisible();
  expect(app.screen.getByRole("button", { name: "Настройки этапа Новый" })).toBeVisible();

  const user = userEvent.setup();
  // Декоративная плашка «Тёмная тема» в панели по-прежнему не кликабельна.
  await user.click(app.screen.getByText("Тёмная тема"));
  expect(window.location.pathname).toBe("/crm2");
  // Активный раздел помечен для скринридера.
  expect(app.screen.getByRole("link", { name: /Доска лидов/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  // Пункт меню «Клиенты» ведёт в свой раздел, доска доступна обратно.
  await user.click(app.screen.getByRole("link", { name: /Клиенты/ }));
  expect(window.location.pathname).toBe("/crm2/customers");
  expect(await app.screen.findByRole("heading", { level: 1, name: "Клиенты" })).toBeVisible();
  await user.click(app.screen.getByRole("link", { name: /Доска лидов/ }));
  expect(window.location.pathname).toBe("/crm2");
  expect(await app.screen.findByRole("link", { name: "Волга-Строй" })).toBeVisible();
  expect(server.calls).toEqual([]);
});

it("меню новой CRM ведёт по разделам без запросов к данным", async () => {
  window.history.replaceState({}, "", "/crm2");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([]);
  const app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  await app.screen.findByText("CRM Детроид");
  const user = userEvent.setup();

  // Плановые разделы: каркас уже открывается, наполнение — следующие шаги.
  const planned = [
    { link: /Клиенты/, path: "/crm2/customers", heading: "Клиенты" },
    { link: /Задачи/, path: "/crm2/tasks", heading: "Задачи" },
    { link: /Аналитика/, path: "/crm2/analytics", heading: "Аналитика" },
    { link: /Настройки/, path: "/crm2/settings", heading: "Настройки" },
  ];
  for (const section of planned) {
    await user.click(app.screen.getByRole("link", { name: section.link }));
    expect(window.location.pathname).toBe(section.path);
    expect(
      await app.screen.findByRole("heading", { level: 1, name: section.heading }),
    ).toBeVisible();
    expect(app.screen.getByRole("link", { name: section.link })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Переключатель темы доступен на каждой странице новой CRM.
    expect(app.screen.getByRole("group", { name: "Тема оформления" })).toBeVisible();
  }

  // Временные пункты показывают честную заглушку «Скоро».
  for (const soon of [
    { link: /Сделки/, path: "/crm2/deals", heading: "Сделки" },
    { link: /Календарь/, path: "/crm2/calendar", heading: "Календарь" },
  ]) {
    await user.click(app.screen.getByRole("link", { name: soon.link }));
    expect(window.location.pathname).toBe(soon.path);
    expect(await app.screen.findByRole("heading", { level: 1, name: soon.heading })).toBeVisible();
    expect(await app.screen.findByText(/Скоро/)).toBeVisible();
  }

  // Возврат на доску из главной области работает, запросов к данным не было.
  await user.click(app.screen.getByRole("link", { name: /Доска лидов/ }));
  expect(window.location.pathname).toBe("/crm2");
  expect(await app.screen.findByRole("heading", { level: 1, name: "Мои лиды" })).toBeVisible();
  expect(server.calls).toEqual([]);
}, 15_000);

it("карточка лида — отдельный маршрут новой CRM с полями и чаттером", async () => {
  window.history.replaceState({}, "", "/crm2/leads/7");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([]);
  const app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  // Название карточки — редактируемое поле; пейджер идёт по порядку доски.
  expect(await app.screen.findByLabelText("Название лида")).toHaveValue("Меридиан Логистика");
  expect(app.screen.getByLabelText("ИНН лида")).toHaveValue("6164000089");
  expect(app.screen.getByText("7 из 16")).toBeVisible();
  expect(app.screen.getByLabelText("Переписка и вложения")).toBeInTheDocument();
  // Подсвечен раздел доски; одноимённая ссылка возврата в шапке карточки
  // проверку не путает — смотрим только панель.
  const sidebar = app.screen.getByRole("complementary", { name: "Боковая панель — пример" });
  expect(app.within(sidebar).getByRole("link", { name: /Доска лидов/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(server.calls).toEqual([]);
});

it("панель новой CRM сворачивается до иконок и разворачивается обратно без запросов", async () => {
  window.history.replaceState({}, "", "/crm2");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([]);
  const app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  await app.screen.findByText("CRM Детроид");
  const user = userEvent.setup();
  await user.click(app.screen.getByRole("button", { name: "Свернуть меню" }));

  // Свёрнутая панель: все тексты и значки скрыты, видна только иконка-область.
  expect(app.screen.queryByText("CRM Детроид")).not.toBeInTheDocument();
  expect(app.screen.queryByText("CRM · ПРОДАЖИ")).not.toBeInTheDocument();
  expect(app.screen.queryByText("МЕНЮ")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Доска лидов")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Клиенты")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Настройки")).not.toBeInTheDocument();
  expect(app.screen.queryByText("17")).not.toBeInTheDocument();
  expect(app.screen.queryByText("СКОРО")).not.toBeInTheDocument();
  expect(app.screen.queryByText("86%")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Тёмная тема")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Анна Ким")).not.toBeInTheDocument();
  expect(app.screen.queryByRole("button", { name: "Свернуть меню" })).not.toBeInTheDocument();
  expect(app.screen.getByRole("complementary", { name: "Боковая панель — пример" })).toBeVisible();
  // Доска в основной области от сворачивания панели не зависит.
  expect(app.screen.getByRole("heading", { name: "Ждем заявку" })).toBeVisible();
  expect(app.screen.getByRole("link", { name: "Горный Ключ" })).toBeVisible();

  const expand = app.screen.getByRole("button", { name: "Развернуть меню" });
  expect(expand).toBeVisible();
  await user.click(expand);

  expect(app.screen.getByText("CRM Детроид")).toBeVisible();
  expect(app.screen.getByText("Доска лидов")).toBeVisible();
  expect(app.screen.getByText("86%")).toBeVisible();
  expect(app.screen.getByText("Анна Ким")).toBeVisible();
  expect(app.screen.getByRole("button", { name: "Свернуть меню" })).toBeVisible();
  expect(app.screen.queryByRole("button", { name: "Развернуть меню" })).not.toBeInTheDocument();
  expect(server.calls).toEqual([]);
});

it("панель новой CRM запоминает свёрнутое состояние после обновления страницы", async () => {
  window.history.replaceState({}, "", "/crm2");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([]);
  const user = userEvent.setup();

  // Первый заход: сворачиваем — выбор сохраняется в браузере.
  let app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );
  await app.screen.findByText("CRM Детроид");
  await user.click(app.screen.getByRole("button", { name: "Свернуть меню" }));
  expect(app.screen.queryByText("Доска лидов")).not.toBeInTheDocument();
  expect(window.localStorage.getItem("crm2.sidebar.collapsed")).toBe("1");

  // «Обновление страницы»: модули и страница создаются заново — панель сразу свёрнута.
  app.cleanup();
  app = await loadModules();
  app.auth.setAccessToken("тестовый-токен");
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );
  expect(await app.screen.findByRole("button", { name: "Развернуть меню" })).toBeVisible();
  expect(app.screen.queryByText("CRM Детроид")).not.toBeInTheDocument();
  expect(app.screen.queryByText("Доска лидов")).not.toBeInTheDocument();

  // Разворачиваем — сохраняется уже развёрнутый вид.
  await user.click(app.screen.getByRole("button", { name: "Развернуть меню" }));
  expect(app.screen.getByText("Доска лидов")).toBeVisible();
  expect(window.localStorage.getItem("crm2.sidebar.collapsed")).toBeNull();
  expect(server.calls).toEqual([]);
}, 15_000);

it("после обновления новая CRM восстанавливает вход, но данные не запрашивает", async () => {
  window.history.replaceState({}, "", "/crm2");
  window.localStorage.removeItem("crm2.sidebar.collapsed");
  server = startFakeApi([
    {
      method: "POST",
      path: "/auth/refresh",
      response: { access_token: "тестовый-токен", token_type: "bearer", expires_in: 1800 },
    },
  ]);
  const app = await loadModules();
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  expect(await app.screen.findByText("CRM Детроид")).toBeVisible();
  expect(server.calls.map(({ method, url }) => ({ method, url }))).toEqual([
    { method: "POST", url: "/api/v1/auth/refresh" },
  ]);
});

it("новая CRM без входа перенаправляет на существующий экран авторизации", async () => {
  window.history.replaceState({}, "", "/crm2");
  server = startFakeApi([{ method: "POST", path: "/auth/refresh", response: {}, status: 401 }]);
  const app = await loadModules();
  app.render(
    <app.Providers>
      <app.AppRouter />
    </app.Providers>,
  );

  expect(
    await app.screen.findByRole("heading", { name: "CRM Детроид" }, { timeout: 3000 }),
  ).toBeVisible();
  expect(window.location.pathname).toBe("/login");
  expect(app.screen.queryByRole("main", { name: "Новая CRM" })).not.toBeInTheDocument();
  expect(
    server.calls.every((call) => call.method === "POST" && call.url === "/api/v1/auth/refresh"),
  ).toBe(true);
});
