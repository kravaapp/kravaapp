import { expect, Page, test } from "@playwright/test";

const planoId = "019318b8-4720-7216-953a-0e6205791c10";
const cobrancaId = "019318bc-8910-74e2-89b1-5916ba58bc32";

async function setup(page: Page, gateway = "abacatepay") {
  await page.addInitScript(() => {
    localStorage.setItem("@krava:auth-state", JSON.stringify({
      accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "student", userName: "Aluno Teste", email: "aluno@example.com", tenantId: "ct",
      tenantName: "CT Teste", role: "Aluno", gender: "M", studentLevel: "Iniciante",
    }));
  });
  const state = { subscribed: false, paid: false, planReads: 0, paymentRequests: [] as Record<string, unknown>[],
    subscriptions: [] as Record<string, unknown>[], lock: false };
  await page.route("https://sdk.mercadopago.com/**", (route) => route.fulfill({ body: "", contentType: "text/javascript" }));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const fulfill = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.endsWith("/membership/planos")) return fulfill({ items: [{
      id: planoId, name: "Plano Muay Thai", description: "Treine no CT", price: 180, durationDays: 30,
      maxClassesPerWeek: null, maxClassesPerDay: null, allowsAllModalidades: true, isActive: true, modalidadeIds: [],
    }] });
    if (url.pathname.endsWith("/plans/current")) {
      state.planReads++;
      return fulfill(state.paid ? {
        contratoId: "contract", planoName: "Plano Muay Thai", startDate: "2026-10-05", endDate: "2026-11-05",
        status: "Ativo", maxClassesPerMonth: null, classesUsedThisMonth: 0, classesRemainingThisMonth: null,
        modalitiesPermitted: [], autoRenew: false,
      } : null);
    }
    if (url.pathname.endsWith("/contratos/subscribe")) {
      state.subscriptions.push(request.postDataJSON());
      if (state.lock) return fulfill({ detail: "Bad Request", errors: [{ code: "Membership.ContratoLongTermLock" }] }, 400);
      state.subscribed = true;
      return route.fulfill({ status: 201, headers: { Location: `/api/payments/${cobrancaId}` }, json: {
        cobrancaId, alunoId: "student", planoId, planoName: "Plano Muay Thai", amount: 180,
        dueDate: "2026-10-10", status: "Pendente", description: "Assinatura - Plano Muay Thai",
      } });
    }
    if (url.pathname.endsWith("/payments/my")) {
      const currentPage = Number(url.searchParams.get("page") ?? 1);
      // A cobrança está fora da primeira página para validar o checkout após subscribe.
      return fulfill({ items: currentPage === 2 && state.subscribed ? [{
        id: cobrancaId, alunoName: "Aluno Teste", amount: 180, dueDate: "2026-10-10",
        description: "Assinatura - Plano Muay Thai", status: state.paid ? "Pago" : "Pendente", type: "Mensalidade",
      }] : [], page: currentPage, pageSize: 1, totalCount: 2, totalPages: 2,
        hasNextPage: currentPage === 1, hasPreviousPage: currentPage > 1 });
    }
    if (url.pathname.endsWith("/payments/gateways/active")) return fulfill({ gateway, publicKey: gateway === "mercadopago" ? "TEST-public-key" : null });
    if (url.pathname.endsWith(`/payments/${cobrancaId}/pay`)) {
      const payload = request.postDataJSON();
      state.paymentRequests.push(payload);
      if (payload.method === "CreditCard") {
        state.paid = true;
        return fulfill({ cobrancaId, status: "Pago" });
      }
      return fulfill({ cobrancaId, status: "Pendente", pixCopyPaste: "000201-Pix-teste" });
    }
    return fulfill({ items: [] });
  });
  await page.goto("/paymentPlans");
  await expect(page.getByRole("button", { name: "Assinar Plano" })).toBeVisible();
  return state;
}

async function subscribe(page: Page) {
  await page.getByRole("button", { name: "Assinar Plano" }).click();
  await expect(page).toHaveURL(new RegExp(`/payment\\?id=${cobrancaId}`));
  await expect(page.getByText("Assinatura - Plano Muay Thai", { exact: true })).toBeVisible();
}

async function fillCustomer(page: Page) {
  await page.getByRole("textbox", { name: "Nome completo", exact: true }).fill("Aluno Teste");
  await page.getByRole("textbox", { name: "E-mail", exact: true }).fill("aluno@example.com");
  await page.getByRole("textbox", { name: "CPF ou CNPJ", exact: true }).fill("12345678901");
  await page.getByRole("button", { name: "continuar", exact: true }).click();
}

test("subscribe abre a cobrança e aguarda confirmação do Pix antes de atualizar o plano", async ({ page }) => {
  const state = await setup(page);
  await subscribe(page);
  expect(state.subscriptions).toEqual([{ planoId, cancelExistingActive: true, immediate: true }]);
  const planReads = state.planReads;
  await fillCustomer(page);
  await page.getByRole("button", { name: "continuar", exact: true }).click();
  await page.getByRole("button", { name: "gerar código Pix", exact: true }).click();
  await expect(page.getByText("Aguardando confirmação do pagamento.", { exact: true })).toBeVisible();
  expect(state.paymentRequests).toHaveLength(1);
  expect(state.paymentRequests[0].method).toBe("Pix");
  expect(state.paymentRequests[0]).not.toHaveProperty("paymentMethod");
  expect(state.planReads).toBe(planReads);
  state.paid = true;
  await expect(page).toHaveURL(/\/paymentPlans$/, { timeout: 15000 });
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /Começar o novo plano/ })).toHaveCount(0);
  await expect(page.getByText("O novo plano começará assim que o pagamento for confirmado.", { exact: true })).toBeVisible();
  expect(state.planReads).toBeGreaterThan(planReads);
});

test("baixa manual é detectada mesmo sem iniciar Pix ou cartão", async ({ page }) => {
  const state = await setup(page);
  await subscribe(page);
  state.paid = true;
  await expect(page).toHaveURL(/\/paymentPlans$/, { timeout: 15000 });
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  expect(state.paymentRequests).toHaveLength(0);
});

test("aprovação do cartão envia CreditCard e atualiza o plano", async ({ page }) => {
  const state = await setup(page, "mercadopago");
  await subscribe(page);
  await fillCustomer(page);
  await page.getByRole("radio", { name: /cartão de crédito/ }).click();
  await page.getByRole("button", { name: "continuar", exact: true }).click();
  await expect(page.locator('iframe[title="Pagamento seguro com cartão"]')).toBeVisible();
  const frame = page.frames().find((item) => item.parentFrame());
  // Simula o token retornado pelo SDK; nunca envia número ou CVV para a API.
  await frame!.evaluate(() => parent.postMessage({ type: "card-token", fields: {
    cardToken: "test-card-token", installments: 1, cardPaymentMethodId: "visa",
  } }, "*"));
  await expect(page).toHaveURL(/\/paymentPlans$/, { timeout: 15000 });
  await expect(page.getByText("Ativo", { exact: true })).toBeVisible();
  expect(state.paymentRequests).toHaveLength(1);
  expect(state.paymentRequests[0].method).toBe("CreditCard");
  expect(state.paymentRequests[0].cardToken).toBe("test-card-token");
});

test("contrato com fidelidade orienta procurar a recepção e não abre pagamento", async ({ page }) => {
  const state = await setup(page);
  state.lock = true;
  await page.getByRole("button", { name: "Assinar Plano" }).click();
  await expect(page.getByText("Você possui um plano com fidelidade vigente. Para trocar ou cancelar, fale com a recepção do CT.", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/paymentPlans$/);
  expect(state.paymentRequests).toHaveLength(0);
});

test("recusa do pagamento exibe Pagamento Recusado e mantém a cobrança pendente", async ({ page }) => {
  const state = await setup(page);
  await page.route(`**/api/payments/${cobrancaId}/pay`, (route) => route.fulfill({ status: 400, json: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.1", title: "Bad Request", status: 400,
    detail: "At least one policy returned UNAUTHORIZED.",
    errors: [{ code: "Payments.PaymentDeclined", description: "At least one policy returned UNAUTHORIZED." }],
  } }));
  await subscribe(page);
  await fillCustomer(page);
  await page.getByRole("button", { name: "continuar", exact: true }).click();
  await page.getByRole("button", { name: "gerar código Pix", exact: true }).click();
  await expect(page.getByText("Pagamento Recusado", { exact: true })).toBeVisible();
  await expect(page.getByText(/UNAUTHORIZED|At least one policy/)).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`/payment\\?id=${cobrancaId}`));
  expect(state.paid).toBe(false);
});
