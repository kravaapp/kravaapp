import { expect, Page, test } from "@playwright/test";

const ALUNO_ID = "11111111-1111-4111-8111-111111111111";
const PENDING_ID = "22222222-2222-4222-8222-222222222222";
const OVERDUE_ID = "33333333-3333-4333-8333-333333333333";
const PAID_ID = "44444444-4444-4444-8444-444444444444";

const invoices = () => [
  { id: PENDING_ID, description: "Mensalidade - Novembro/2026", amount: 180, dueDate: "2026-11-10", status: "Pendente", type: "Mensalidade", paidAtUtc: null, paymentMethod: null },
  { id: OVERDUE_ID, description: "Mensalidade - Outubro/2026", amount: 180, dueDate: "2026-10-10", status: "Atrasado", type: "Mensalidade", paidAtUtc: null, paymentMethod: null },
  { id: PAID_ID, description: "Matrícula", amount: 50, dueDate: "2026-09-10", status: "Pago", type: "Matricula", paidAtUtc: "2026-09-09T15:00:00Z", paymentMethod: "Pix" },
];

async function setup(page: Page, items = invoices()) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
    userId: "admin", userName: "Admin Teste", email: "admin@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Admin",
  })));
  const state = { posts: [] as { path: string; body: unknown }[], invoiceRequests: 0 };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "POST" && url.pathname.includes("/payments/")) {
      state.posts.push({ path: url.pathname, body: request.postDataJSON() });
      return route.fulfill({ status: 200, json: {} });
    }
    if (url.pathname.endsWith(`/payments/aluno/${ALUNO_ID}`)) {
      state.invoiceRequests++;
      return route.fulfill({ json: { items, page: 1, pageSize: 50, totalCount: items.length, totalPages: 1 } });
    }
    if (url.pathname.endsWith("/membership/alunos")) {
      return route.fulfill({ json: { items: [{
        id: ALUNO_ID, userId: "user-1", userName: "Aluno Teste", userEmail: "aluno@example.com", phone: null,
        status: "Ativo", level: "Iniciante", planoAtivo: "Mensal", paymentMethods: ["Pix"], modalities: [],
        checkinsThisMonth: 1, enrolledAtUtc: "2026-10-01",
      }], totalPages: 1 } });
    }
    if (url.pathname.endsWith(`/membership/alunos/${ALUNO_ID}`)) {
      return route.fulfill({ json: {
        id: ALUNO_ID, userId: "user-1", userName: "Aluno Teste", userEmail: "aluno@example.com", cpf: null, birthDate: null,
        phone: null, emergencyContact: null, emergencyPhone: null, medicalNotes: null, photoUrl: null, status: "Ativo",
        level: "Iniciante", sex: null, enrolledAtUtc: "2026-10-01", optOutReengagement: false, planoId: null, planoName: "Mensal",
        contratoStartDate: "2026-10-01", contratoEndDate: "2026-10-31",
      } });
    }
    if (url.pathname.endsWith("/notifications/unread-count")) return route.fulfill({ json: { count: 0 } });
    if (/\/(tenant\/professors|tenant\/join-requests|membership\/(partner|plan)-requests)$/.test(url.pathname)) return route.fulfill({ json: [] });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
  await page.goto("/(admin)/students");
  await page.getByText("Aluno Teste", { exact: true }).click();
  await page.getByText("Cobranças", { exact: true }).click();
  return state;
}

test("aba Cobranças resume o saldo em aberto e lista as cobranças do aluno", async ({ page }) => {
  await setup(page);
  await expect(page.getByText("SITUAÇÃO FINANCEIRA", { exact: true })).toBeVisible();
  await expect(page.getByText("Inadimplente", { exact: true })).toBeVisible();
  await expect(page.getByText("2 cobranças em aberto · 1 vencida", { exact: true })).toBeVisible();
  await expect(page.getByText("Mensalidade - Outubro/2026", { exact: true })).toBeVisible();
  await expect(page.getByText("Vencida", { exact: true })).toBeVisible();
  await expect(page.getByText("Pago em 09/09/2026 via Pix", { exact: true })).toBeVisible();
  await expect(page.getByText("Marcar como paga", { exact: true })).toHaveCount(2);
  await expect(page.getByText("Estornar", { exact: true })).toHaveCount(1);
  await page.screenshot({ path: "e2e-screenshots/student-charges-tab.png", fullPage: true });
});

test("marcar como paga envia valor e forma de recebimento", async ({ page }) => {
  const state = await setup(page);
  await page.getByText("Marcar como paga", { exact: true }).first().click();
  await expect(page.getByText("Confirmar pagamento", { exact: true })).toBeVisible();
  await page.getByText("Dinheiro", { exact: true }).click();
  await page.screenshot({ path: "e2e-screenshots/student-charges-receive.png" });
  await page.getByText("Confirmar recebimento", { exact: true }).click();
  await expect.poll(() => state.posts.length).toBe(1);
  expect(state.posts[0]).toEqual({ path: `/api/payments/${PENDING_ID}/confirm`, body: { paidAmount: 180, paymentMethod: "Dinheiro" } });
  await expect(page.getByText("Pagamento registrado!", { exact: true })).toBeVisible();
  await expect.poll(() => state.invoiceRequests).toBeGreaterThan(1);
});

test("cancelar e estornar pedem confirmação e enviam o motivo", async ({ page }) => {
  const state = await setup(page);
  await page.getByText("Cancelar", { exact: true }).first().click();
  await page.getByPlaceholder(/Acordo direto/).fill("Cobrança duplicada");
  await page.screenshot({ path: "e2e-screenshots/student-charges-cancel.png" });
  await page.getByText("Confirmar cancelamento", { exact: true }).click();
  await expect.poll(() => state.posts.length).toBe(1);
  expect(state.posts[0]).toEqual({ path: `/api/payments/${PENDING_ID}/cancel`, body: { notes: "Cobrança duplicada" } });

  await page.getByText("Estornar", { exact: true }).click();
  await page.getByText("Confirmar estorno", { exact: true }).click();
  await expect.poll(() => state.posts.length).toBe(2);
  expect(state.posts[1]).toEqual({ path: `/api/payments/${PAID_ID}/refund`, body: { notes: null } });
});

test("aluno sem cobranças em aberto aparece em dia", async ({ page }) => {
  await setup(page, []);
  await expect(page.getByText("Em dia", { exact: true })).toBeVisible();
  await expect(page.getByText("Nenhuma cobrança gerada para este aluno.", { exact: true })).toBeVisible();
});
