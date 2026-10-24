import { test as base, devices, expect, type BrowserContext, type Page } from "@playwright/test";
import type { Token } from "../../src/types/auth.types";
import { CT_TIMEZONE } from "./env";

type Fixtures = {
  /** Abre o app logado com o token, num contexto de navegador só dele (cada papel tem a sua sessão). */
  openAs: (token: Token, path: string) => Promise<Page>;
};

export const test = base.extend<Fixtures>({
  openAs: async ({ browser, baseURL }, use) => {
    const contexts: BrowserContext[] = [];
    const prodRequests: string[] = [];
    const serverErrors: string[] = [];

    await use(async (token, path) => {
      const context = await browser.newContext({ ...devices["Pixel 7"], baseURL, timezoneId: CT_TIMEZONE, locale: "pt-BR" });
      contexts.push(context);
      // Trava de segurança: o bundle tem que falar só com a API local.
      await context.route(/api\.kravaapp\.com\.br/, (route) => {
        prodRequests.push(route.request().url());
        return route.abort();
      });
      await context.addInitScript((stored) => {
        localStorage.setItem("@krava:auth-state", JSON.stringify(stored));
      }, token);

      const page = await context.newPage();
      page.on("response", (response) => {
        if (response.status() >= 500 && response.url().includes("/api/")) {
          serverErrors.push(`${response.status()} ${response.request().method()} ${response.url()} (${token.userName})`);
        }
      });
      await page.goto(path);
      return page;
    });

    for (const context of contexts) await context.close();
    expect(prodRequests, "o app tentou falar com a API de produção").toEqual([]);
    expect(serverErrors, "a API respondeu erro 5xx durante o fluxo").toEqual([]);
  },
});

export { expect };

/** Abre o sino e espera a notificação com esse título; reabre até ela chegar (outbox, fila e jobs são assíncronos). */
export async function expectNotification(page: Page, title: string, message: RegExp, timeoutMs = 30_000) {
  await expect(async () => {
    await page.getByLabel("Abrir notificações").click();
    try {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible({ timeout: 3_000 });
      await expect(page.getByText(message).first()).toBeVisible({ timeout: 1_000 });
    } finally {
      await page.getByText("Fechar", { exact: true }).click();
    }
  }).toPass({ timeout: timeoutMs, intervals: [2_000, 5_000] });
}
