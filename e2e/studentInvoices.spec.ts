import { expect, Page, test } from "@playwright/test";

const PENDING_ID = "66666666-6666-4666-8666-666666666666";
const REFUNDED_ID = "77777777-7777-4777-8777-777777777777";

async function setup(page: Page, { hasGateway, path = "/paymentPlans" }: { hasGateway: boolean; path?: string }) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
    userId: "student", userName: "Aluno Teste", email: "aluno@example.com", tenantId: "ct",
    tenantName: "CT Teste", role: "Aluno", gender: "M", studentLevel: "Iniciante",
  })));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const fulfill = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (url.pathname.endsWith("/payments/my")) return fulfill({
      items: [
        { id: PENDING_ID, description: "Mensalidade Novembro", amount: 180, dueDate: "2026-11-10", status: "Pendente", type: "Mensalidade", paidAtUtc: null, paymentMethod: null },
        { id: REFUNDED_ID, description: "Assinatura - Diária", amount: 25, dueDate: "2026-10-20", status: "Estornado", type: "Mensalidade", paidAtUtc: null, paymentMethod: null },
      ],
      page: 1, pageSize: 20, totalCount: 2, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
    });
    if (url.pathname.endsWith("/payments/gateways/active")) {
      return hasGateway
        ? fulfill({ gateway: "mercadopago", publicKey: "TEST-public-key" })
        : fulfill({
          detail: "Configuração de gateway não encontrada para este CT.",
          errors: [{ code: "Payments.GatewayConfigNotFound", description: "Configuração de gateway não encontrada para este CT." }],
        }, 404);
    }
    if (/\/membership\/(plan|partner)-requests\/my$/.test(url.pathname)) return fulfill(null);
    if (url.pathname.endsWith("/plans/current")) return fulfill(null);
    return fulfill({ items: [] });
  });
  await page.goto(path);
  if (path === "/paymentPlans") await expect(page.getByText("Assinatura - Diária", { exact: true })).toBeVisible();
}

test("cobrança estornada aparece como estornada e não pode ser paga", async ({ page }) => {
  await setup(page, { hasGateway: true });
  await expect(page.getByText("ESTORNADO", { exact: true })).toBeVisible();
  await expect(page.getByText("Pagamento estornado pelo CT", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pagar Assinatura - Diária" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pagar Mensalidade Novembro" })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/student-invoices-refunded.png" });
});

test("CT sem gateway mostra pagar no CT em vez do botão de pagamento", async ({ page }) => {
  await setup(page, { hasGateway: false });
  await expect(page.getByText("PAGAR NO CT", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Pagar / })).toHaveCount(0);
  await page.screenshot({ path: "e2e-screenshots/student-invoices-no-gateway.png" });
});

test("tela de pagamento em CT sem gateway orienta pagar na recepção", async ({ page }) => {
  await setup(page, { hasGateway: false, path: `/payment?id=${PENDING_ID}` });
  await expect(page.getByText(/Este CT não recebe pagamentos pelo app/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar aos planos" })).toBeVisible();
  await expect(page.getByText("Configuração de gateway não encontrada para este CT.", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "e2e-screenshots/student-payment-no-gateway.png" });
});
