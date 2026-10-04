import { test, expect } from "@playwright/test";

test.describe("Admin Login & Select Tenant E2E Test (Mobile)", () => {
  test.setTimeout(60000);

  test("Deve logar como admin, selecionar o CT e acessar o painel admin no mobile mesmo se houver sessão expirada no storage", async ({
    page,
  }) => {
    // 1. Simula a condição exata do mobile: uma sessão antiga com token expirado deixada no AsyncStorage
    await page.addInitScript(() => {
      const expiredUser = {
        accessToken: "expired-jwt-token-from-old-session",
        refreshToken: "expired-refresh-token",
        expiresAtUtc: "2020-01-01T00:00:00Z",
        userId: "old-user-id",
        userName: "Old User",
        email: "Admin@krava.com.br",
        tenantId: "a1b2c3d4-0001-7000-8000-000000000001",
        tenantName: "CT Demo - Academia Krava",
        role: "Admin",
      };
      localStorage.setItem("@krava:auth-state", JSON.stringify(expiredUser));
      localStorage.setItem(
        "@krava:tenant-selection",
        JSON.stringify({
          preAuthToken: "old-expired-preauth-token",
          currentToken: expiredUser,
          availableTenants: [
            {
              tenantId: "a1b2c3d4-0001-7000-8000-000000000001",
              tenantName: "CT Demo - Academia Krava",
              role: "Admin",
              isActive: true,
            },
          ],
        }),
      );
    });

    // Monitorar chamadas de rede e erros de console
    page.on("console", (msg) => {
      console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`);
    });

    page.on("request", (req) => {
      if (req.url().includes("/api/")) {
        console.log(`[REQUEST] ${req.method()} ${req.url()}`);
      }
    });

    page.on("response", async (res) => {
      if (res.url().includes("/api/")) {
        console.log(`[RESPONSE] ${res.status()} ${res.url()}`);
        if (res.status() >= 400) {
          try {
            const body = await res.text();
            console.log(`[RESPONSE ERROR BODY] ${body}`);
          } catch {}
        }
      }
    });

    // 2. Acessa a tela de signIn
    await page.goto("/signIn");
    await page.waitForLoadState("domcontentloaded");

    // 3. Preenche credenciais de admin
    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.click();
    await emailInput.pressSequentially("Admin@krava.com.br", { delay: 20 });

    const passwordInput = page.getByPlaceholder("••••••••");
    await passwordInput.click();
    await passwordInput.pressSequentially("Admin@123", { delay: 20 });

    // 4. Clica em entrar
    const btnEntrar = page.getByRole("button", { name: "entrar" });
    await btnEntrar.click();

    // 5. Aguarda carregar a tela de seleção de CT
    await expect(page.getByText("onde vamos treinar?")).toBeVisible({
      timeout: 20000,
    });

    await page.screenshot({
      path: "./e2e-screenshots/debug-01-select-tenant.png",
    });

    // 6. Clica no CT disponível
    const ctCard = page.getByText("CT Demo - Academia Krava").first();
    await expect(ctCard).toBeVisible();
    await ctCard.click();

    // 7. Aguarda transição para o painel de Admin
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: "./e2e-screenshots/debug-02-after-ct-click.png",
    });

    // 8. Valida que entrou com sucesso no painel do Admin e NÃO foi deslogado
    expect(page.url()).not.toContain("/signIn");
    const adminTab = page.getByRole("tab", { name: "Painel" });
    await expect(adminTab).toBeVisible({ timeout: 10000 });
  });
});
