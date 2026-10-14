import { expect, Page, test } from "@playwright/test";
import { CurrentPlanType } from "../src/types/plans.types";

const activePlan: CurrentPlanType = {
  contratoId: "contract", planoName: "Mensal", startDate: "2026-01-01", endDate: "2099-01-01",
  status: "Ativo", maxClassesPerMonth: null, classesUsedThisMonth: 0,
  classesRemainingThisMonth: null, modalitiesPermitted: [], autoRenew: false,
};

async function setup(page: Page, plan: CurrentPlanType | null, full = false) {
  await page.addInitScript(() => {
    localStorage.setItem("@krava:auth-state", JSON.stringify({
      accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "student", userName: "Aluno Teste", email: "aluno@example.com", tenantId: "ct",
      tenantName: "CT Teste", role: "Aluno", gender: "M", studentLevel: "Iniciante",
    }));
  });
  const state = { plan, planReads: 0, bookings: [] as unknown[] };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/plans/current")) {
      state.planReads++;
      return route.fulfill({ json: state.plan });
    }
    if (path.endsWith("/scheduling/bookings") && request.method() === "POST") {
      state.bookings.push(request.postDataJSON());
      return route.fulfill({ json: { bookingId: "booking" } });
    }
    if (path.endsWith("/scheduling/ocorrencias")) return route.fulfill({ json: { items: [{
      id: "occurrence", aulaName: "Muay Thai", modalityName: "Muay Thai", professorName: "Professor",
      date: "2099-01-01", startTime: "20:00:00", endTime: "21:00:00", minLevel: "iniciante",
      publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: null,
      confirmedCount: full ? 20 : 5, maxCapacity: 20,
    }] } });
    if (path.endsWith("/scheduling/modalidades")) return route.fulfill({ json: { items: [{ id: "category", name: "Muay Thai" }] } });
    if (path.endsWith("/scheduling/my-next-class")) return route.fulfill({ json: null });
    if (path.endsWith("/scheduling/my-week-classes")) return route.fulfill({ json: [] });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
  return state;
}

const screens = [{ name: "início", path: "/(user)" }, { name: "agenda", path: "/(user)/schedule" }];

for (const screen of screens) {
  for (const status of [null, "Cancelado", "Expirado", "Pendente"]) {
    test(`${screen.name}: bloqueia agendamento com plano ${status ?? "ausente"} e mostra toast`, async ({ page }) => {
      const state = await setup(page, status ? { ...activePlan, status } : null);
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      const button = page.getByRole("button", { name: /^agendar/ }).first();
      await expect(button).toBeVisible();
      await expect(button).toHaveCSS("opacity", "0.6");
      // O toque continua disponível para explicar o bloqueio pelo toast padrão.
      await button.click();
      await expect(page.getByText("Você não possui um plano ativo.", { exact: true })).toBeVisible();
      await expect(page.getByText("confirmar agendamento", { exact: true })).toHaveCount(0);
      expect(state.bookings).toEqual([]);
    });
  }

  for (const full of [false, true]) {
    test(`${screen.name}: plano ativo permite ${full ? "fila de espera" : "agendamento"}`, async ({ page }) => {
      const state = await setup(page, activePlan, full);
      await page.goto(screen.path);
      const button = page.getByRole("button", { name: /^agendar/ }).first();
      await expect(button).toHaveCSS("opacity", "1");
      await button.click();
      await expect(page.getByText("confirmar agendamento", { exact: true })).toBeVisible();
      if (full) await expect(page.getByText(/Deseja realmente entrar na fila de espera/)).toBeVisible();
      await page.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect.poll(() => state.bookings.length).toBe(1);
      await expect(page.getByText("confirmar agendamento", { exact: true })).toHaveCount(0);
    });
  }
}

test("bloqueia enquanto verifica o plano e após falha de consulta", async ({ page }) => {
  const state = await setup(page, activePlan);
  let releasePlan!: () => void;
  const planReady = new Promise<void>((resolve) => { releasePlan = resolve; });
  await page.route("**/api/plans/current", async (route) => {
    await planReady;
    await route.fulfill({ status: 400, json: { detail: "Falha ao consultar plano" } });
  });
  await page.goto("/(user)/schedule");
  const button = page.getByRole("button", { name: "agendar", exact: true });
  await expect(button).toHaveCSS("opacity", "0.6");
  await button.click();
  await expect(page.getByText("Aguarde a verificação do seu plano.", { exact: true })).toBeVisible();
  releasePlan();
  await expect(page.getByText("Aguarde a verificação do seu plano.", { exact: true })).toHaveCount(0);
  await button.click();
  await expect(page.getByText("Não foi possível verificar seu plano. Tente novamente.", { exact: true })).toBeVisible();
  expect(state.bookings).toEqual([]);
});

test("atualizar a agenda libera ou bloqueia o botão conforme o plano atual", async ({ page }) => {
  const state = await setup(page, null);
  await page.goto("/(user)/schedule");
  const button = page.getByRole("button", { name: "agendar", exact: true });
  await expect(button).toHaveCSS("opacity", "0.6");
  await page.waitForLoadState("networkidle");

  async function refresh() {
    const previousReads = state.planReads;
    const target = page.getByTestId("refreshable-scroll").last();
    await target.evaluate((node) => { node.scrollTop = 0; });
    const box = (await target.boundingBox())!;
    const session = await page.context().newCDPSession(page);
    const x = box.x + box.width - 8;
    const y = box.y + 15;
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let i = 1; i <= 4; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + i * 25 }] });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await session.detach();
    await expect.poll(() => state.planReads).toBeGreaterThan(previousReads);
    await expect(page.getByText("Atualizando...", { exact: true })).toHaveCount(0);
  }

  state.plan = activePlan;
  await refresh();
  await expect(button).toHaveCSS("opacity", "1");
  state.plan = null;
  await refresh();
  await expect(button).toHaveCSS("opacity", "0.6");
  await button.click();
  await expect(page.getByText("Você não possui um plano ativo.", { exact: true })).toBeVisible();
  expect(state.bookings).toEqual([]);
});
