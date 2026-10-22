import { expect, Page, test } from "@playwright/test";

const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const morningPlan = {
  id: "plan-manha", name: "Plano Manhã", description: "Treinos pela manhã.", price: 120, durationDays: 30,
  maxClassesPerWeek: 3, maxClassesPerDay: 1, allowsAllModalidades: true, isRecurring: true, isActive: true,
  modalidadeIds: null, startTime: "06:00", endTime: "12:00",
};

async function login(page: Page, role: "Admin" | "Aluno") {
  await page.addInitScript((r) => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: r === "Admin" ? "Admin Teste" : "Aluno Teste", email: "t@example.com", tenantId: "ct",
    tenantName: "CT Teste", role: r, gender: "M", studentLevel: "Iniciante",
  })), role);
}

test("cadastro do plano define a faixa pelos atalhos e envia início e fim", async ({ page }) => {
  await login(page, "Admin");
  const posts: unknown[] = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/membership/planos")) {
      posts.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: "new-plan" });
    }
    if (path.endsWith("/membership/planos")) return route.fulfill({ json: { items: [morningPlan], totalPages: 1, totalCount: 1 } });
    if (path.endsWith("/avulso-config") || /professors|join-requests$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });

  await page.goto("/(admin)/financial/plans");
  await expect(page.getByText("06:00–12:00", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/plan-time-admin-list.png" });

  await page.getByText("Novo", { exact: true }).click();
  await page.getByPlaceholder("Plano trimestral").fill("Plano Noite");
  await page.getByPlaceholder("150,00").fill("9900");
  await page.getByPlaceholder("30").fill("30");

  // Só o início: a mesma regra da API recusa antes de enviar.
  await page.getByPlaceholder("06:00").fill("1800");
  await page.getByText("Salvar plano", { exact: true }).click();
  await expect(page.getByText("Informe o início e o fim do horário, ou deixe os dois em branco.", { exact: true })).toBeVisible();

  await page.getByText("Noite 18–00", { exact: true }).click();
  await expect(page.getByPlaceholder("12:00")).toHaveValue("00:00");
  await page.getByText("Horário do plano", { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/plan-time-admin-form.png" });

  await page.getByText("Salvar plano", { exact: true }).click();
  await expect.poll(() => posts.length).toBe(1);
  expect(posts[0]).toMatchObject({ name: "Plano Noite", startTime: "18:00", endTime: "00:00" });
});

test("aluno vê a faixa no plano e o motivo ao reservar fora dela", async ({ page }) => {
  await login(page, "Aluno");
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/plans/current")) return route.fulfill({ json: {
      contratoId: "c", planoName: "Plano Manhã", startDate: "2026-10-01", endDate: "2099-01-01", status: "Ativo",
      maxClassesPerMonth: 12, classesUsedThisMonth: 1, classesRemainingThisMonth: 11, modalitiesPermitted: [],
      autoRenew: true, maxClassesPerWeek: 3, classesUsedThisWeek: 1, classesRemainingThisWeek: 2,
      startTime: "06:00", endTime: "12:00",
    } });
    if (path.endsWith("/membership/planos")) return route.fulfill({ json: { items: [morningPlan], totalPages: 1 } });
    if (path.endsWith(`/ocorrencias/${OCORRENCIA_ID}/booking-options`)) return route.fulfill({ json: {
      defaultOrigin: null,
      options: [{ origin: "Plan", kind: "Plan", label: "Plano Manhã", used: 1, limit: 3, period: "week",
        available: false, reason: "Seu plano vale das 06:00 às 12:00." }],
    } });
    if (path.endsWith("/scheduling/ocorrencias")) return route.fulfill({ json: { items: [{
      id: OCORRENCIA_ID, aulaName: "Futevôlei", modalityName: "Futevôlei", professorName: "Professor",
      date: "2099-01-01", startTime: "19:00:00", endTime: "20:00:00", minLevel: null,
      publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: null,
      confirmedCount: 5, maxCapacity: 20,
    }] } });
    if (path.endsWith("/scheduling/modalidades")) return route.fulfill({ json: { items: [{ id: "category", name: "Futevôlei" }] } });
    if (/accesses$|partner-requests$|plan-requests$|my-week-classes$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/my") || path.endsWith("/my-next-class")) return route.fulfill({ json: null });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });

  await page.goto("/paymentPlans");
  await expect(page.getByText("Horário", { exact: true })).toBeVisible();
  await expect(page.getByText("06:00 às 12:00", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/plan-time-student-plan.png", fullPage: true });

  await page.goto("/(user)/schedule");
  await page.getByRole("button", { name: /^Reservar aula/ }).first().click();
  await expect(page.getByText("Seu plano vale das 06:00 às 12:00.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirmar", exact: true })).toBeDisabled();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/plan-time-booking.png" });
});
