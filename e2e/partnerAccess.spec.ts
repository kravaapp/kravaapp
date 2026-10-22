import { expect, Page, test } from "@playwright/test";

const ALUNO_ID = "88888888-8888-4888-8888-888888888888";
const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const access = { partner: "Gympass", since: "2026-10-01T12:00:00Z", monthlyLimit: 8, usedThisMonth: 3, futureBookings: 2 };

type State = { posts: { path: string; body: unknown }[]; linked: boolean };

async function routeApi(page: Page, role: "Admin" | "Aluno", state: State, extra?: (url: URL) => unknown) {
  await page.addInitScript((r) => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
    userId: "user", userName: r === "Admin" ? "Admin Teste" : "Aluno Teste", email: "teste@example.com",
    tenantId: "ct", tenantName: "CT Teste", role: r, gender: "M", studentLevel: "Iniciante",
  })), role);
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const fulfill = (body: unknown, status = 200) => route.fulfill({ status, json: body });
    if (request.method() === "POST") {
      state.posts.push({ path: url.pathname, body: request.postDataJSON() });
      if (url.pathname.endsWith("/end")) state.linked = false;
      return route.fulfill({ status: 204, body: "" });
    }
    const custom = extra?.(url);
    if (custom !== undefined) return fulfill(custom);
    if (/partner-access$|partner-requests\/my\/access$/.test(url.pathname)) return fulfill(state.linked ? access : null);
    if (/\/membership\/(plan|partner)-requests(\/my)?$/.test(url.pathname)) return fulfill(url.pathname.endsWith("/my") ? null : []);
    if (/\/tenant\/(professors|join-requests)$/.test(url.pathname)) return fulfill([]);
    if (url.pathname.endsWith("/notifications/unread-count")) return fulfill({ count: 0 });
    if (url.pathname.endsWith("/plans/current")) return fulfill(null);
    return fulfill({ items: [] });
  });
}

test("painel mostra o acesso via Gympass no lugar do plano e desvincula com motivo", async ({ page }) => {
  const state: State = { posts: [], linked: true };
  await routeApi(page, "Admin", state, (url) => {
    if (url.pathname.endsWith("/membership/alunos")) return { items: [{
      id: ALUNO_ID, userId: "user-1", userName: "Aluno Parceiro", userEmail: "a***o@example.com", phone: null,
      status: "Ativo", level: "Iniciante", planoAtivo: null, paymentMethods: state.linked ? ["Gympass"] : [],
      modalities: [], checkinsThisMonth: 3, enrolledAtUtc: "2026-10-01",
    }], totalPages: 1 };
    if (url.pathname.endsWith(`/membership/alunos/${ALUNO_ID}`)) return {
      id: ALUNO_ID, userId: "user-1", userName: "Aluno Parceiro", userEmail: "a***o@example.com", cpf: null, birthDate: null,
      phone: null, emergencyContact: null, emergencyPhone: null, medicalNotes: null, photoUrl: null, status: "Ativo",
      level: "Iniciante", sex: null, enrolledAtUtc: "2026-10-01", optOutReengagement: false, planoId: null, planoName: null,
      paymentMethods: ["Gympass"],
    };
    return undefined;
  });

  await page.goto("/(admin)/students");
  await expect(page.getByText("Acesso via Gympass · 3 check-in(s) no mês", { exact: true })).toBeVisible();
  await expect(page.getByText("Sem plano ativo", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "e2e-screenshots/partner-admin-list.png" });

  await page.getByText("Aluno Parceiro", { exact: true }).click();
  await expect(page.getByText("ACESSO VIA GYMPASS", { exact: true })).toBeVisible();
  await expect(page.getByText(/3 de 8 check-ins este mês · 2 aula\(s\) agendada\(s\)/)).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/partner-admin-card.png" });

  await page.getByText("Desvincular Gympass", { exact: true }).click();
  await expect(page.getByText(/2 aulas agendadas pelo parceiro serão canceladas/)).toBeVisible();
  await page.getByPlaceholder(/Aluno não utiliza mais/).fill("Saiu da empresa");
  await page.screenshot({ path: "e2e-screenshots/partner-admin-end.png" });
  await page.getByText("Confirmar desvínculo", { exact: true }).click();

  await expect.poll(() => state.posts.length).toBe(1);
  expect(state.posts[0]).toEqual({ path: `/api/membership/alunos/${ALUNO_ID}/partner-access/end`, body: { reason: "Saiu da empresa" } });
});

test("app do aluno mostra o Gympass como acesso atual e permite desvincular", async ({ page }) => {
  const state: State = { posts: [], linked: true };
  await routeApi(page, "Aluno", state);

  await page.goto("/paymentPlans");
  await expect(page.getByText("SEU ACESSO ATUAL", { exact: true })).toBeVisible();
  await expect(page.getByText("3 de 8 check-ins este mês", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/partner-student-card.png" });

  await page.getByRole("button", { name: "Desvincular Gympass" }).click();
  await expect(page.getByText(/2 aulas agendadas pelo parceiro serão canceladas/)).toBeVisible();
  await page.waitForTimeout(500); // fim da animação de entrada do modal
  await page.screenshot({ path: "e2e-screenshots/partner-student-end.png" });
  await page.getByRole("button", { name: "Desvincular", exact: true }).click();

  await expect.poll(() => state.posts.map((p) => p.path)).toEqual(["/api/membership/partner-requests/my/end"]);
  await expect(page.getByText("Você ainda não possui um plano ativo. Escolha um plano abaixo para começar!", { exact: true })).toBeVisible();
});

test("aluno só com Gympass agenda e vê de onde a aula será descontada", async ({ page }) => {
  const state: State = { posts: [], linked: true };
  await routeApi(page, "Aluno", state, (url) => {
    if (url.pathname.endsWith(`/ocorrencias/${OCORRENCIA_ID}/booking-source`)) {
      return { kind: "Partner", label: "Gympass", used: 3, limit: 8, period: "month", message: null };
    }
    if (url.pathname.endsWith("/scheduling/ocorrencias")) return { items: [{
      id: OCORRENCIA_ID, aulaName: "Futevôlei", modalityName: "Futevôlei", professorName: "Professor",
      date: "2099-01-01", startTime: "20:00:00", endTime: "21:00:00", minLevel: null,
      publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: null,
      confirmedCount: 5, maxCapacity: 20,
    }] };
    if (url.pathname.endsWith("/scheduling/modalidades")) return { items: [{ id: "category", name: "Futevôlei" }] };
    return undefined;
  });

  await page.goto("/(user)/schedule");
  await page.getByRole("button", { name: /^Reservar aula/ }).first().click();
  await expect(page.getByText("Será descontada do seu Gympass · 4 de 8 check-ins este mês.", { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/partner-booking-preview.png" });
});
