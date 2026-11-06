# CRM2 — точная копия раздела `/crm2`

Отдельный проект, в котором живёт **только** новая CRM из
`Roses1s/newcrm` (раздел `/crm2`). Исходники страниц — байт в байт копия
`frontend/src/features/crm2/`; изменён только хост-каркас (см. «Отличия»).

## Запуск

```bash
cd crm2-standalone
npm install --legacy-peer-deps   # флаг нужен из-за набора peer-зависимостей vitest 4
npm run dev                      # http://localhost:5173 → редирект на /crm2
```

Остальные команды — как в основном проекте:

```bash
npm test               # 46 тестов (исходные тесты /crm2)
npm run lint           # eslint, 0 предупреждений
npm run format:check   # prettier
npm run build          # tsc -b + vite build
```

## Что внутри

```
src/features/crm2/    # копия 17 файлов исходников + 6 файлов тестов
src/app/router.tsx    # маршруты /crm2/*
src/app/ErrorBoundary.tsx
src/index.css         # Tailwind v4 + базовые стили (шрифт, размеры, поля, скроллбар)
public/logo.svg       # фирменный знак (плитка панели)
public/theme.js       # тема до первой отрисовки
```

Маршруты: `/crm2` (доска), `/crm2/leads/:id`, `/crm2/customers`,
`/crm2/tasks`, `/crm2/analytics`, `/crm2/deals`, `/crm2/calendar`,
`/crm2/settings`.

## Отличия от оригинала (только вынужденные)

1. Нет `RequireAuth` — копия открывается без входа: все данные `/crm2`
   вымышленные и живут в браузере, сервер не нужен.
2. `/` и неизвестные адреса редиректят на `/crm2` (в оригинале `/` — лаунчер
   основной CRM).
3. В проекте нет остальных разделов основной CRM (лаунчер, заявки,
   бухгалтерия, админка, `/crm`).

Всё остальное — тексты, классы Tailwind, `aria-*`, поведение, ключи
localStorage (`crm2.theme`, `crm2.sidebar.collapsed`) — совпадает с
оригиналом.
