import { expect, Page, test } from "@playwright/test";

const ALUNO_ID = "88888888-8888-4888-8888-888888888888";
const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const gympass = { partner: "Gympass", since: "2026-10-01T12:00:00Z", monthlyLimit: 8, usedThisMonth: 3, futureBookings: 2 };
const totalPass = { partner: "TotalPass", since: "2026-10-10T12:00:00Z", monthlyLimit: 12, usedThisMonth: 5, futureBookings: 1 };

type State = { posts: { path: string; body: unknown }[]; accesses: typeof gympass[] };

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
      const body = request.postDataJSON();
      state.posts.push({ path: url.pathname, body });
      if (url.pathname.endsWith("/end")) {
        state.accesses = state.accesses.filter((a) => a.partner !== (body as { partner: string }).partner);
      }
      if (url.pathname.endsWith("/bookings")) return route.fulfill({ status: 201, json: { bookingId: "b" } });
      return route.fulfill({ status: 204, body: "" });
    }
    const custom = extra?.(url);
    if (custom !== undefined) return fulfill(custom);
    if (/partner-accesses$|partner-requests\/my\/accesses$/.test(url.pathname)) return fulfill(state.accesses);
    if (/\/membership\/(plan|partner)-requests(\/my)?$/.test(url.pathname)) return fulfill(url.pathname.endsWith("/my") ? null : []);
    if (/\/tenant\/(professors|join-requests)$/.test(url.pathname)) return fulfill([]);
    if (url.pathname.endsWith("/tenant/partners")) return fulfill([{ id: "g", name: "Gympass", isActive: true }, { id: "t", name: "TotalPass", isActive: true }]);
    if (url.pathname.endsWith("/notifications/unread-count")) return fulfill({ count: 0 });
    if (url.pathname.endsWith("/plans/current")) return fulfill(null);
    return fulfill({ items: [] });
  });
}

const occurrence = {
  id: OCORRENCIA_ID, aulaName: "Futevôlei", modalityName: "Futevôlei", professorName: "Professor",
  date: "2099-01-01", startTime: "20:00:00", endTime: "21:00:00", minLevel: null,
  publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: null,
  confirmedCount: 5, maxCapacity: 20,
};

function scheduleRoutes(options: unknown) {
  return (url: URL) => {
    if (url.pathname.endsWith(`/ocorrencias/${OCORRENCIA_ID}/booking-options`)) return options;
    if (url.pathname.endsWith("/scheduling/ocorrencias")) return { items: [occurrence] };
    if (url.pathname.endsWith("/scheduling/modalidades")) return { items: [{ id: "category", name: "Futevôlei" }] };
    return undefined;
  };
}

test("painel mostra um card por parceiro e desvincula só o escolhido, com motivo", async ({ page }) => {
  const state: State = { posts: [], accesses: [gympass, totalPass] };
  await routeApi(page, "Admin", state, (url) => {
    if (url.pathname.endsWith("/membership/alunos")) return { items: [{
      id: ALUNO_ID, userId: "user-1", userName: "Aluno Parceiro", userEmail: "a***o@example.com", phone: null,
      status: "Ativo", level: "Iniciante", planoAtivo: null, paymentMethods: state.accesses.map((a) => a.partner),
      modalities: [], checkinsThisMonth: 3, enrolledAtUtc: "2026-10-01",
    }], totalPages: 1 };
    if (url.pathname.endsWith(`/membership/alunos/${ALUNO_ID}`)) return {
      id: ALUNO_ID, userId: "user-1", userName: "Aluno Parceiro", userEmail: "a***o@example.com", cpf: null, birthDate: null,
      phone: null, emergencyContact: null, emergencyPhone: null, medicalNotes: null, photoUrl: null, status: "Ativo",
      level: "Iniciante", sex: null, enrolledAtUtc: "2026-10-01", optOutReengagement: false, planoId: null, planoName: null,
      paymentMethods: ["Gympass", "TotalPass"],
    };
    return undefined;
  });

  await page.goto("/(admin)/students");
  await expect(page.getByText("Acesso via Gympass e TotalPass · 3 check-in(s) no mês", { exact: true })).toBeVisible();
  await expect(page.getByText("Sem plano ativo", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: "e2e-screenshots/partner-admin-list.png" });

  await page.getByText("Aluno Parceiro", { exact: true }).click();
  await expect(page.getByText("ACESSO VIA GYMPASS", { exact: true })).toBeVisible();
  await expect(page.getByText("ACESSO VIA TOTALPASS", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/partner-admin-card.png" });

  await page.getByText("Desvincular TotalPass", { exact: true }).click();
  await expect(page.getByText(/1 aula agendada pelo parceiro será cancelada/)).toBeVisible();
  await page.getByPlaceholder(/Aluno não utiliza mais/).fill("Saiu da empresa");
  await page.getByText("Confirmar desvínculo", { exact: true }).click();

  await expect.poll(() => state.posts.length).toBe(1);
  expect(state.posts[0]).toEqual({
    path: `/api/membership/alunos/${ALUNO_ID}/partner-access/end`,
    body: { partner: "TotalPass", reason: "Saiu da empresa" },
  });
});

test("app do aluno mostra os dois parceiros como acesso atual e desvincula um deles", async ({ page }) => {
  const state: State = { posts: [], accesses: [gympass, totalPass] };
  await routeApi(page, "Aluno", state);

  await page.goto("/paymentPlans");
  await expect(page.getByText("SEU ACESSO ATUAL", { exact: true })).toBeVisible();
  await expect(page.getByText("Gympass · TotalPass", { exact: true })).toBeVisible();
  await expect(page.getByText("3 de 8 check-ins este mês", { exact: true })).toBeVisible();
  await expect(page.getByText("5 de 12 check-ins este mês", { exact: true })).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/partner-student-card.png", fullPage: true });

  await page.getByRole("button", { name: "Desvincular TotalPass" }).click();
  await expect(page.getByText(/1 aula agendada pelo TotalPass será cancelada/)).toBeVisible();
  await page.waitForTimeout(500); // fim da animação de entrada do modal
  await page.screenshot({ path: "e2e-screenshots/partner-student-end.png" });
  await page.getByRole("button", { name: "Desvincular", exact: true }).click();

  await expect.poll(() => state.posts).toEqual([{ path: "/api/membership/partner-requests/my/end", body: { partner: "TotalPass" } }]);
  await expect(page.getByText("Gympass · TotalPass", { exact: true })).toHaveCount(0);
  await expect(page.getByText("SEU ACESSO ATUAL", { exact: true })).toBeVisible();
});

test("com plano, o aluno escolhe o parceiro na reserva e o esgotado fica bloqueado", async ({ page }) => {
  const state: State = { posts: [], accesses: [gympass, totalPass] };
  await routeApi(page, "Aluno", state, scheduleRoutes({
    defaultOrigin: "Plan",
    options: [
      { origin: "Plan", kind: "Plan", label: "Mensal 3x", used: 2, limit: 3, period: "week", available: true, reason: null },
      { origin: "Gympass", kind: "Partner", label: "Gympass", used: 3, limit: 8, period: "month", available: true, reason: null },
      { origin: "TotalPass", kind: "Partner", label: "TotalPass", used: 12, limit: 12, period: "month", available: false,
        reason: "Você atingiu o limite mensal de check-ins para este parceiro neste mês." },
    ],
  }));

  await page.goto("/(user)/schedule");
  await page.getByRole("button", { name: /^Reservar aula/ }).first().click();
  const plan = page.getByRole("radio", { name: /^Plano Mensal 3x/ });
  await expect(plan).toBeChecked();
  await expect(page.getByText("2 de 3 nesta semana", { exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: /^TotalPass/ })).toBeDisabled();
  await page.getByRole("radio", { name: /^Gympass/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/booking-origin-plan.png" });
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();

  await expect.poll(() => state.posts.map((p) => p.body)).toEqual([
    { ocorrenciaId: OCORRENCIA_ID, source: "App", isTrial: false, origin: "Gympass" },
  ]);
});

test("sem plano e com dois parceiros, nada vem marcado até o aluno escolher", async ({ page }) => {
  const state: State = { posts: [], accesses: [gympass, totalPass] };
  await routeApi(page, "Aluno", state, scheduleRoutes({
    defaultOrigin: null,
    options: [
      { origin: "Gympass", kind: "Partner", label: "Gympass", used: 3, limit: 8, period: "month", available: true, reason: null },
      { origin: "TotalPass", kind: "Partner", label: "TotalPass", used: 5, limit: 12, period: "month", available: true, reason: null },
    ],
  }));

  await page.goto("/(user)/schedule");
  await page.getByRole("button", { name: /^Reservar aula/ }).first().click();
  await expect(page.getByText("Escolha por onde reservar esta aula.", { exact: true })).toBeVisible();
  const confirm = page.getByRole("button", { name: "Confirmar", exact: true });
  await expect(confirm).toBeDisabled();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/booking-origin-choose.png" });

  await page.getByRole("radio", { name: /^TotalPass/ }).click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => state.posts.map((p) => (p.body as { origin: string }).origin)).toEqual(["TotalPass"]);
});
