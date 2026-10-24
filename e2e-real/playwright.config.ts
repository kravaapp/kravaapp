import { defineConfig } from "@playwright/test";
import { API_URL, FRONT_URL } from "./support/env";

/**
 * E2E de ponta a ponta contra a stack local (docker-compose deste diretório). Rodar com `npm run e2e:real`,
 * que sobe a stack e aplica as migrations antes. As specs de `e2e/` continuam simulando a API.
 */
export default defineConfig({
  testDir: "./specs",
  outputDir: "./test-results",
  timeout: 5 * 60_000,
  expect: { timeout: 20_000 },
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "./report", open: "never" }]],
  use: {
    baseURL: FRONT_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  globalSetup: "./support/global-setup.ts",
  webServer: {
    // Porta própria: o bundle precisa nascer com EXPO_PUBLIC_API_URL apontando para a stack local, nunca
    // reaproveitar o Metro de quem desenvolve (que aponta para produção). Se algo escapar, o fixture reprova.
    command: "npx expo start --web --port 8099",
    cwd: "..",
    url: FRONT_URL,
    reuseExistingServer: true,
    timeout: 5 * 60_000,
    env: { EXPO_PUBLIC_API_URL: API_URL, CI: "1", BROWSER: "none" },
  },
});
