import { expect, Page, test } from "@playwright/test";

async function loginAs(page: Page, role: "Admin" | "Aluno") {
  await page.addInitScript((r) => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Admin Teste", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste", role: r,
  })), role);
}

/** Admin cria uma aula; devolve os corpos enviados para POST /scheduling/aulas. */
async function routeAdminClasses(page: Page) {
  const created: Record<string, unknown>[] = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && path.endsWith("/scheduling/aulas")) {
      created.push(request.postDataJSON());
      return route.fulfill({ status: 201, json: { id: "aula" } });
    }
    if (path.endsWith("/scheduling/modalidades")) {
      return route.fulfill({ json: { items: [{ id: "mod", name: "Futevôlei", isActive: true }], totalPages: 1 } });
    }
    if (path.endsWith("/tenant/professors")) {
      return route.fulfill({ json: [{ userId: "prof", name: "Lucaum", email: "lucaum@example.com", role: "Professor" }] });
    }
    if (/\/(ocorrencias\/today|membership\/partner-requests|membership\/plan-requests|tenant\/join-requests)$/.test(path)) {
      return route.fulfill({ json: [] });
    }
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], totalPages: 1, count: 0 } });
  });
  return created;
}

async function fillNewClass(page: Page) {
  await page.goto("/(admin)/classes");
  await page.getByRole("button", { name: "Nova aula" }).click();
  await page.getByText("Futevôlei", { exact: true }).click();
  await page.getByText("Lucaum", { exact: true }).click();
  await page.getByText("Seg", { exact: true }).click();
  await page.getByText("Qua", { exact: true }).click();
  await page.getByPlaceholder("18:00").fill("18:00");
  await page.getByPlaceholder("19:00").fill("19:00");
  await page.getByPlaceholder("14").fill("10");
}

test("nova aula avisa os alunos por padrão", async ({ page }) => {
  await loginAs(page, "Admin");
  const created = await routeAdminClasses(page);
  await fillNewClass(page);

  const toggle = page.getByRole("switch", { name: "Avisar alunos sobre a aula nova" });
  await toggle.scrollIntoViewIfNeeded();
  await expect(toggle).toBeChecked();
  await page.screenshot({ path: "test-results/class-notify-toggle.png" });

  await page.getByText("Criar 2 aulas", { exact: true }).click();
  await expect.poll(() => created.length).toBe(1);
  expect(created[0]).toMatchObject({ notifyStudents: true, daysOfWeek: [1, 3], professorId: "prof" });
});

test("admin pode criar a aula sem avisar os alunos", async ({ page }) => {
  await loginAs(page, "Admin");
  const created = await routeAdminClasses(page);
  await fillNewClass(page);

  await page.getByRole("switch", { name: "Avisar alunos sobre a aula nova" }).click();
  await page.getByText("Criar 2 aulas", { exact: true }).click();

  await expect.poll(() => created.length).toBe(1);
  expect(created[0]).toMatchObject({ notifyStudents: false });
});

test("aviso de aula nova leva o aluno para a agenda", async ({ page }) => {
  await loginAs(page, "Aluno");
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/notifications")) return route.fulfill({ json: { items: [{
      id: "n", type: "General", title: "Aula nova no CT",
      message: "Aula de Teste (Futevôlei) — seg e qua às 18h. Reserve pelo app.",
      payload: JSON.stringify({ type: "class_created", aulaId: "aula" }), isRead: false,
      createdAtUtc: new Date().toISOString(),
    }], totalCount: 1, page: 1, pageSize: 20 } });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 1 } });
    if (/accesses$|partner-requests$|plan-requests$|my-week-classes$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/my-next-class") || path.endsWith("/plans/current") || path.endsWith("/my")) {
      return route.fulfill({ json: null });
    }
    return route.fulfill({ json: { items: [], count: 0 } });
  });

  await page.goto("/(user)");
  await page.getByLabel("Abrir notificações").click();
  await page.getByText("Aula nova no CT", { exact: true }).click();
  await expect(page).toHaveURL(/schedule/);
});
