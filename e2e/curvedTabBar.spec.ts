import { test, expect } from "@playwright/test";

test.describe("CurvedTabBar Mobile E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Injeta sessão de usuário simulada no AsyncStorage para entrar direto no fluxo do aluno (user)
    await page.addInitScript(() => {
      const mockUser = {
        accessToken: "mock-token",
        refreshToken: "mock-refresh",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "user-123",
        userName: "Lucaum",
        email: "lucaum@krava.com",
        tenantId: "ct-123-demo",
        tenantName: "CT Demo - Academia Krava",
        role: "Aluno",
        gender: "M",
        studentLevel: "Iniciante",
      };
      localStorage.setItem("@krava:auth-state", JSON.stringify(mockUser));
    });

    // Mock das requisições de API para não depender de backend rodando no momento do teste visual
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/my-week-classes")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      }
      if (url.includes("/categories") || url.includes("/modalities")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            { id: "cat-1", name: "Futevolei" },
            { id: "cat-2", name: "Beach Tennis" },
          ]),
        });
      }
      if (url.includes("/monthly-schedule")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalPresencas: 0,
            totalFaltas: 0,
            availableForSchedulingThisMonth: 12,
            totalUsedThisMonth: 0,
          }),
        });
      }
      if (url.includes("/history")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            items: [
              {
                bookingId: "b-1",
                ocorrenciaDate: new Date().toISOString(),
                startTime: "20:00:00",
                modalityName: "Futevolei",
                professorName: "Professor Demo",
                bookingStatus: "Confirmado",
              },
            ],
            total: 1,
          }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], data: [] }),
      });
    });
  });

  test("Deve renderizar a barra de navegação com todas as 4 abas visíveis no mobile", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Espera os botões das abas estarem visíveis
    const tabInicio = page.getByTestId("tab-index");
    const tabSchedule = page.getByTestId("tab-schedule");
    const tabPlans = page.getByTestId("tab-paymentPlans");
    const tabHistory = page.getByTestId("tab-history");

    await expect(tabInicio).toBeVisible({ timeout: 10000 });
    await expect(tabSchedule).toBeVisible();
    await expect(tabPlans).toBeVisible();
    await expect(tabHistory).toBeVisible();

    // Captura da tela na aba Início
    await page.screenshot({
      path: "./e2e-screenshots/01-tab-inicio.png",
      fullPage: true,
    });
  });

  test("Deve transitar suavemente e exibir a bola ativa na aba Histórico", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    const tabHistory = page.getByTestId("tab-history");
    await expect(tabHistory).toBeVisible({ timeout: 10000 });

    // Clica na aba Histórico
    await tabHistory.click();
    await page.waitForTimeout(600); // Aguarda o quique e animação da bola

    // Captura da tela na aba Histórico (onde o usuário relatou o sumiço do 4º ícone)
    await page.screenshot({
      path: "./e2e-screenshots/02-tab-historico-ativo.png",
      fullPage: true,
    });
  });

  test("Deve transitar entre todas as abas quicando sem sumir nenhum ícone", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Agendamento
    await page.getByTestId("tab-schedule").click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "./e2e-screenshots/03-tab-agendamento.png",
    });

    // 2. Planos
    await page.getByTestId("tab-paymentPlans").click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "./e2e-screenshots/04-tab-planos.png",
    });

    // 3. Volta para Início
    await page.getByTestId("tab-index").click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: "./e2e-screenshots/05-tab-volta-inicio.png",
    });
  });
});
