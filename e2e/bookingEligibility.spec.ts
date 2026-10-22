import { expect, Page, test } from "@playwright/test";
import { CurrentPlanType } from "../src/types/plans.types";

const activePlan: CurrentPlanType = {
  contratoId: "contract", planoName: "Mensal", startDate: "2026-01-01", endDate: "2099-01-01",
  status: "Ativo", maxClassesPerMonth: null, classesUsedThisMonth: 0,
  classesRemainingThisMonth: null, modalitiesPermitted: [], autoRenew: false,
};

async function setup(page: Page, plan: CurrentPlanType | null, full = false,
  levels = { studentLevel: "Iniciante", minLevel: "iniciante" }) {
  await page.addInitScript((studentLevel) => {
    localStorage.setItem("@krava:auth-state", JSON.stringify({
      accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "student", userName: "Aluno Teste", email: "aluno@example.com", tenantId: "ct",
      tenantName: "CT Teste", role: "Aluno", gender: "M", studentLevel,
    }));
  }, levels.studentLevel);
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
      date: "2099-01-01", startTime: "20:00:00", endTime: "21:00:00", minLevel: levels.minLevel,
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

type Screen = { name: string; path: string; disabledOpacity: string; levelBlocked: string };

const screens: Screen[] = [
  { name: "início", path: "/(user)", disabledOpacity: "0.6", levelBlocked: "nível avançado" },
  { name: "agenda", path: "/(user)/schedule", disabledOpacity: "0.5", levelBlocked: "Avançado" },
];

/** Botão de agendar da tela; na agenda, aula lotada mostra o botão da lista de espera. */
function bookButton(page: Page, screen: Screen, full = false) {
  if (screen.name === "início") return page.getByRole("button", { name: /^agendar/ });
  return page.getByRole("button", { name: full ? /^Entrar na lista de espera/ : /^Reservar aula/ });
}

for (const screen of screens) {
  for (const scenario of [
    { studentLevel: "Avançado", minLevel: "avancado", allowed: true },
    { studentLevel: "Avançado", minLevel: "Avançado", allowed: true },
    { studentLevel: "Intermediário", minLevel: "intermediario", allowed: true },
    { studentLevel: "Intermediário", minLevel: "Avançado", allowed: false },
  ]) {
    test(`${screen.name}: nível do login ${scenario.studentLevel} com aula ${scenario.minLevel}`, async ({ page }) => {
      await setup(page, activePlan, false, scenario);
      await page.goto(screen.path);
      await expect(page.getByText("Muay Thai", { exact: true }).first()).toBeVisible();
      if (screen.name === "início") {
        await expect(page.getByText(scenario.studentLevel, { exact: true })).toBeVisible();
      }
      const booking = bookButton(page, screen);
      if (scenario.allowed) {
        await expect(booking).toBeVisible();
        await booking.click();
        await expect(page.getByText("confirmar agendamento", { exact: true })).toBeVisible();
      } else {
        await expect(page.getByText(screen.levelBlocked, { exact: true })).toBeVisible();
        await expect(booking).toHaveCount(0);
      }
    });
  }

  for (const status of [null, "Cancelado", "Expirado", "Pendente"]) {
    test(`${screen.name}: bloqueia agendamento com plano ${status ?? "ausente"} e mostra toast`, async ({ page }) => {
      const state = await setup(page, status ? { ...activePlan, status } : null);
      await page.goto(screen.path);
      await page.waitForLoadState("networkidle");
      const button = bookButton(page, screen).first();
      await expect(button).toBeVisible();
      await expect(button).toHaveCSS("opacity", screen.disabledOpacity);
      // O toque continua disponível para explicar o bloqueio pelo toast padrão.
      await button.click();
      await expect(page.getByText("Você não possui um plano ativo para agendar aulas.", { exact: true })).toBeVisible();
      await expect(page.getByText("confirmar agendamento", { exact: true })).toHaveCount(0);
      expect(state.bookings).toEqual([]);
    });
  }

  for (const full of [false, true]) {
    test(`${screen.name}: plano ativo permite ${full ? "fila de espera" : "agendamento"}`, async ({ page }) => {
      const state = await setup(page, activePlan, full);
      await page.goto(screen.path);
      const button = bookButton(page, screen, full).first();
      await expect(button).toHaveCSS("opacity", "1");
      await button.click();
      await expect(page.getByText("confirmar agendamento", { exact: true })).toBeVisible();
      if (full) await expect(page.getByText(/Deseja realmente entrar na fila de espera/)).toBeVisible();
      await page.getByRole("button", { name: "Confirmar", exact: true }).click();
      await expect.poll(() => state.bookings.length).toBe(1);
      await expect(page.getByText("confirmar agendamento", { exact: true })).toHaveCount(0);
    });
  }

  test(`${screen.name}: toast visível permite clicar na navegação sob o aviso`, async ({ page }) => {
    await setup(page, null);
    await page.goto(screen.path);
    await page.waitForLoadState("networkidle");
    await bookButton(page, screen).first().click();
    const toast = page.getByTestId("toast");
    await expect(toast).toBeVisible();
    const target = page.getByTestId(screen.name === "início" ? "tab-schedule" : "tab-index");
    const box = (await target.boundingBox())!;

    // Sobrepõe o aviso ao alvo para testar o clique atravessando o toast.
    await toast.evaluate((node, top) => {
      node.style.top = `${top}px`;
      node.style.bottom = "auto";
      node.style.left = "0";
      node.style.right = "0";
    }, box.y - 5);
    const toastBox = (await toast.boundingBox())!;
    expect(toastBox.y).toBeLessThan(box.y + box.height / 2);
    expect(toastBox.y + toastBox.height).toBeGreaterThan(box.y + box.height / 2);
    await expect(toast).toHaveCSS("pointer-events", "none");
    await expect(toast.getByText("Você não possui um plano ativo para agendar aulas.", { exact: true })).toHaveCSS("pointer-events", "none");

    await target.click();
    await expect(page.getByText(screen.name === "início" ? "agendar aulas" : "olá, Aluno", { exact: true })).toBeVisible();
    await expect(toast).toBeVisible();
  });
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
  const button = page.getByRole("button", { name: /^Reservar aula/ });
  await expect(button).toHaveCSS("opacity", "0.5");
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
  const button = page.getByRole("button", { name: /^Reservar aula/ });
  await expect(button).toHaveCSS("opacity", "0.5");
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
  await expect(button).toHaveCSS("opacity", "0.5");
  await button.click();
  await expect(page.getByText("Você não possui um plano ativo para agendar aulas.", { exact: true })).toBeVisible();
  expect(state.bookings).toEqual([]);
});
