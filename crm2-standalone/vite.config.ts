import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Tailwind v4 подключается плагином Vite — postcss.config и tailwind.config
  // не нужны, все токены темы живут в src/index.css.
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    // Предпросмотр открывается через проброшенный домен: сервер слушает все
    // интерфейсы и принимает любой Host.
    host: "0.0.0.0",
    port: 5173,
    allowedHosts: true,
  },
  // Тесты интерфейса: jsdom вместо браузера, общая подготовка в src/test/setup.ts.
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: [...configDefaults.exclude],
    css: false,
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    allowedHosts: true,
  },
});
