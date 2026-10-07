import { expect, Page, test } from "@playwright/test";

async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
    userId: "admin", userName: "Admin Teste", email: "admin@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Admin",
  })));
  const state = { students: 0, professors: 0, requests: 0, updated: false, fail: false,
    queries: [] as string[], pending: null as Promise<void> | null };
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/membership/alunos")) {
      state.students++;
      state.queries.push(url.search);
      if (state.pending) await state.pending;
      if (state.fail) return route.fulfill({ status: 400, json: { code: "Membership.AlunoNotFound", detail: "Bad Request" } });
      return route.fulfill({ json: { items: Array.from({ length: 12 }, (_, index) => ({
        id: `student-${index}`, userId: `user-${index}`, userName: index === 0 ? (state.updated ? "Aluno Atualizado" : "Aluno Original") : `Aluno ${index + 1}`,
        userEmail: "aluno@example.com", phone: null, status: "Ativo", level: "Iniciante", planoAtivo: "Mensal",
        paymentMethods: ["Pix"], modalities: [], checkinsThisMonth: 1, enrolledAtUtc: "2026-10-01",
      })), totalPages: 1 } });
    }
    if (url.pathname.endsWith("/tenant/professors")) {
      state.professors++;
      if (state.pending) await state.pending;
      return route.fulfill({ json: [{ userId: "professor", name: state.updated ? "Professor Atualizado" : "Professor Original", email: "professor@example.com", role: "Professor" }] });
    }
    if (url.pathname.endsWith("/tenant/join-requests")) {
      state.requests++;
      if (state.pending) await state.pending;
      return route.fulfill({ json: state.updated ? [{ id: "request", userId: "request-user", userName: "Solicitação Nova", userEmail: "novo@example.com", createdAtUtc: "2026-10-01T12:00:00Z", planId: null }] : [] });
    }
    if (url.pathname.endsWith("/notifications/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
  await page.goto("/(admin)/students");
  await expect(page.getByText("Aluno Original", { exact: true })).toBeVisible();
  await expect.poll(() => state.professors).toBe(1);
  await expect.poll(() => state.requests).toBe(1);
  return state;
}

async function drag(page: Page, dx: number, dy: number, cancel = false) {
  const box = await page.getByTestId("members-list").boundingBox();
  const x = box!.x + box!.width - 12;
  const y = box!.y + 40;
  const session = await page.context().newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * i / 4, y: y + dy * i / 4 }] });
  }
  await session.send("Input.dispatchTouchEvent", { type: cancel ? "touchCancel" : "touchEnd", touchPoints: [] });
  await session.detach();
}

test("puxar atualiza alunos, professores e solicitações e mantém a busca", async ({ page }) => {
  const state = await setup(page);
  await page.getByPlaceholder("Buscar aluno...").fill("Aluno");
  await expect.poll(() => state.queries.at(-1)).toContain("search=Aluno");
  const previous = { students: state.students, professors: state.professors, requests: state.requests };
  state.updated = true;
  await drag(page, 0, 120);
  await expect(page.getByText("Aluno Atualizado", { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder("Buscar aluno...")).toHaveValue("Aluno");
  expect(state.students).toBe(previous.students + 1);
  expect(state.professors).toBe(previous.professors + 1);
  expect(state.requests).toBe(previous.requests + 1);
  expect(state.queries.at(-1)).toContain("search=Aluno");
  await page.getByRole("tab", { name: "Professores", exact: true }).click();
  await expect(page.getByText("Professor Atualizado", { exact: true })).toBeVisible();
  await drag(page, 0, 120);
  await expect.poll(() => state.professors).toBe(previous.professors + 2);
  await page.getByRole("tab", { name: /Solicitações/ }).click();
  await expect(page.getByText("Solicitação Nova", { exact: true })).toBeVisible();
  await drag(page, 0, 120);
  await expect.poll(() => state.requests).toBe(previous.requests + 3);
});

test("gestos curtos, horizontais, cancelados e longe do topo não atualizam", async ({ page }) => {
  const state = await setup(page);
  await drag(page, 0, 30);
  await drag(page, -100, 30);
  await drag(page, 0, 120, true);
  await page.getByTestId("members-list").evaluate((node) => { node.scrollTop = 50; });
  await drag(page, 0, 120);
  expect(state.students).toBe(1);
  expect(state.professors).toBe(1);
  expect(state.requests).toBe(1);
});

test("indicador permanece até concluir e gestos repetidos não duplicam as requisições", async ({ page }) => {
  const state = await setup(page);
  let finish!: () => void;
  state.pending = new Promise<void>((resolve) => { finish = resolve; });
  await drag(page, 0, 120);
  await expect(page.getByText("Atualizando...", { exact: true })).toBeVisible();
  await drag(page, 0, 120);
  expect(state.students).toBe(2);
  expect(state.professors).toBe(2);
  expect(state.requests).toBe(2);
  finish();
  state.pending = null;
  await expect(page.getByText("Atualizando...", { exact: true })).toHaveCount(0);
});

test("falha encerra o indicador e permite uma nova tentativa", async ({ page }) => {
  const state = await setup(page);
  state.fail = true;
  await drag(page, 0, 120);
  await expect(page.getByText("Perfil de aluno não localizado.", { exact: true })).toBeVisible();
  await expect(page.getByText("Atualizando...", { exact: true })).toHaveCount(0);
  state.fail = false;
  state.updated = true;
  await drag(page, 0, 120);
  await expect(page.getByText("Aluno Atualizado", { exact: true })).toBeVisible();
});
