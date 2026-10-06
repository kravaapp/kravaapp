import { test, expect } from "@playwright/test";

test.describe("Admin Floating Dock & Launcher E2E Tests (Mobile)", () => {
  test.setTimeout(90000);

  test("Deve exibir o Floating Dock com 3 abas, abrir o Launcher (+), e navegar para Modalidades e Perfil", async ({
    page,
  }) => {
    // 1. Acessa a tela de login
    await page.goto("/signIn");
    await page.waitForLoadState("domcontentloaded");

    // Desativa o toast de erro de dev se houver para não interceptar cliques no mobile
    await page.addStyleTag({
      content:
        "#error-toast, [data-testid='error-toast'] { display: none !important; pointer-events: none !important; }",
    });

    // 2. Preenche credenciais de admin
    const emailInput = page.getByLabel("E-mail");
    await expect(emailInput).toBeVisible({ timeout: 15000 });
    await emailInput.click();
    await emailInput.pressSequentially("Admin@krava.com.br", { delay: 20 });

    const passwordInput = page.getByPlaceholder("••••••••");
    await passwordInput.click();
    await passwordInput.pressSequentially("Admin@123", { delay: 20 });

    // 3. Entra e seleciona CT
    const btnEntrar = page.getByRole("button", { name: "entrar" });
    await btnEntrar.click();

    await expect(page.getByText("onde vamos treinar?")).toBeVisible({
      timeout: 20000,
    });

    const ctCard = page.getByText("CT Demo - Academia Krava").first();
    await expect(ctCard).toBeVisible();
    await ctCard.click();

    // 4. Aguarda carregar o painel do Admin
    await page.waitForTimeout(3000);
    await page.addStyleTag({
      content:
        "#error-toast, [data-testid='error-toast'] { display: none !important; pointer-events: none !important; }",
    });

    // 5. Valida a presença das 3 abas do Dock Flutuante
    const tabPainel = page.getByTestId("tab-index");
    const tabMembros = page.getByTestId("tab-students");
    const tabAulas = page.getByTestId("tab-classes");

    await expect(tabPainel).toBeVisible({ timeout: 10000 });
    await expect(tabMembros).toBeVisible({ timeout: 5000 });
    await expect(tabAulas).toBeVisible({ timeout: 5000 });

    // 6. Valida o botão circular '+' do Launcher
    const plusButton = page.getByTestId("launcher-plus-btn");
    await expect(plusButton).toBeVisible();

    await page.screenshot({
      path: "./e2e-screenshots/admin-01-floating-dock.png",
    });

    // 7. Clica na aba Membros e valida navegação
    await tabMembros.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: "./e2e-screenshots/admin-tab-membros.png",
    });
    await expect(page.getByText("alunos").first()).toBeVisible({ timeout: 10000 });

    // Clica na aba Aulas e valida
    await tabAulas.click({ force: true });
    await page.waitForTimeout(600);
    await page.screenshot({
      path: "./e2e-screenshots/admin-tab-aulas.png",
    });

    // Volta para membros para abrir o launcher
    await tabMembros.click({ force: true });
    await page.waitForTimeout(600);

    // 8. Clica no botão '+' para abrir o Launcher Grid
    await plusButton.click({ force: true });
    await page.waitForTimeout(600);

    // Valida que o card do Launcher abriu com o título e os itens
    await expect(page.getByText("Gestão do CT")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Financeiro")).toBeVisible();
    await expect(page.getByText("Planos")).toBeVisible();
    await expect(page.getByText("Modalidades")).toBeVisible();
    await expect(page.getByText("Políticas")).toBeVisible();
    await expect(page.getByText("Perfil CT")).toBeVisible();
    await expect(page.getByText("Churn Risk")).toBeVisible();

    await page.screenshot({
      path: "./e2e-screenshots/admin-02-launcher-open.png",
    });

    // 9. Clica em "Churn Risk" e valida a nova tela dedicada
    const itemChurn = page.getByText("Churn Risk");
    await itemChurn.click({ force: true });
    await page.waitForTimeout(1500);

    await expect(
      page.getByText("Motor de prevenção de evasão e retenção", { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "./e2e-screenshots/admin-05-churn-screen.png",
    });

    // Clica no botão de ajuda da fórmula do score
    const helpBtn = page.getByRole("button", { name: "Como o score é calculado" });
    if (await helpBtn.isVisible()) {
      await helpBtn.click({ force: true });
      await page.waitForTimeout(600);
      await expect(
        page.getByText("Soma de 4 dimensões comportamentais", { exact: false }),
      ).toBeVisible({ timeout: 5000 });
      await page.screenshot({
        path: "./e2e-screenshots/admin-06-churn-formula-modal.png",
      });
      const closeFormulaBtn = page.getByText("Entendi").first();
      await closeFormulaBtn.click({ force: true });
      await page.waitForTimeout(600);
    }

    // 10. Volta usando o botão de voltar da tela
    const backBtn = page.getByRole("button", { name: "Voltar" });
    await expect(backBtn).toBeVisible();
    await backBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // 11. Abre o Launcher novamente e navega para "Modalidades"
    await plusButton.click({ force: true });
    await page.waitForTimeout(600);
    const itemModalidades = page.getByText("Modalidades");
    await itemModalidades.click({ force: true });
    await page.waitForTimeout(1500);

    await expect(
      page.getByText("Cadastre e gerencie as artes marciais", { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "./e2e-screenshots/admin-03-modalities-screen.png",
    });

    // Volta e navega para Perfil CT
    const backBtn2 = page.getByRole("button", { name: "Voltar" });
    await backBtn2.click({ force: true });
    await page.waitForTimeout(1000);

    await plusButton.click({ force: true });
    await page.waitForTimeout(600);
    const itemPerfil = page.getByText("Perfil CT");
    await itemPerfil.click({ force: true });
    await page.waitForTimeout(1500);

    await expect(
      page.getByText("Vitrine pública no catálogo", { exact: false }),
    ).toBeVisible({ timeout: 10000 });

    await page.screenshot({
      path: "./e2e-screenshots/admin-04-profile-screen.png",
    });
  });
});
