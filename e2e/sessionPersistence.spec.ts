import { expect, Page, test } from "@playwright/test";

const authKey = "@krava:auth-state";
const selectionKey = "@krava:tenant-selection";
const token = {
  accessToken: "session-token", refreshToken: "session-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
  userId: "student", userName: "Aluno Teste", email: "aluno@example.com", tenantId: "ct",
  tenantName: "CT Teste", role: "Aluno", gender: "M", studentLevel: "Avançado",
};
const tenant = { tenantId: "ct", tenantName: "CT Teste", role: "Aluno", isActive: true };
const selection = { preAuthToken: null, currentToken: token, availableTenants: [tenant] };

async function setup(page: Page, preAuth = false) {
  const state = { logins: 0, unauthorized: false, protectedHeaders: [] as string[] };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    if (path === "/auth/login") {
      state.logins++;
      return route.fulfill({ json: {
        requiresTenantSelection: preAuth, token: preAuth ? null : token,
        preAuthToken: preAuth ? "temporary-token" : null, availableTenants: [tenant],
      } });
    }
    if (path === "/auth/select-tenant") return route.fulfill({ json: token });
    if (["/scheduling/ocorrencias", "/membership/alunos", "/dashboard/teacher"].includes(path)) {
      state.protectedHeaders.push(request.headers().authorization ?? "");
      if (state.unauthorized) return route.fulfill({ status: 401, json: { detail: "Sessão inválida" } });
    }
    if (["/auth/catalog", "/auth/invitations/pending", "/scheduling/my-week-classes",
      "/scheduling/ocorrencias/today", "/analytics/churn", "/analytics/operational/daily-attendance",
      "/membership/partner-requests", "/tenant/join-requests"].includes(path)) return route.fulfill({ json: [] });
    if (path === "/auth/my-cts") return route.fulfill({ json: [tenant] });
    if (path === "/plans/current" || path === "/scheduling/my-next-class") return route.fulfill({ json: null });
    if (path === "/dashboard/teacher") return route.fulfill({ json: { todayClassesCount: 0, todayStudentsCount: 0, todayWaitlistCount: 0, nextClass: null } });
    return route.fulfill({ json: { items: [], totalPages: 1, count: 0 } });
  });
  await page.goto("/signIn");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  return state;
}

async function seed(page: Page, auth: string | null, storedSelection: string | null) {
  // Uma única gravação: os reloads seguintes devem usar o que o próprio app persistiu.
  await page.evaluate(({ auth, storedSelection, authKey, selectionKey }) => {
    if (auth === null) localStorage.removeItem(authKey);
    else localStorage.setItem(authKey, auth);
    if (storedSelection === null) localStorage.removeItem(selectionKey);
    else localStorage.setItem(selectionKey, storedSelection);
  }, { auth, storedSelection, authKey, selectionKey });
}

for (const preAuth of [false, true]) {
  test(`persiste login ${preAuth ? "com token temporário" : "com JWT direto"} e mantém agenda após reload`, async ({ page }) => {
    const state = await setup(page, preAuth);
    await page.getByLabel("E-mail", { exact: true }).fill("aluno@example.com");
    await page.getByPlaceholder("••••••••", { exact: true }).fill("Password123");
    await page.getByRole("button", { name: "entrar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Entrar em CT Teste como Aluno" })).toBeVisible();
    if (!preAuth) {
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).accessToken, authKey)).toBe(token.accessToken);
    }
    await page.reload();
    await page.getByRole("button", { name: "Entrar em CT Teste como Aluno" }).click();
    await expect(page.getByTestId("tab-schedule")).toBeVisible();
    await page.getByTestId("tab-schedule").click();
    await expect(page.getByText("agendar aulas", { exact: true })).toBeVisible();
    const url = page.url();
    const readCount = state.protectedHeaders.length;
    await page.reload();
    await expect(page.getByText("agendar aulas", { exact: true })).toBeVisible();
    await expect.poll(() => state.protectedHeaders.length).toBeGreaterThan(readCount);
    expect(page.url()).toBe(url);
    expect(state.protectedHeaders.at(-1)).toBe(`Bearer ${token.accessToken}`);
    expect(state.logins).toBe(1);
  });
}

for (const entry of [
  { role: "Aluno", path: "/(user)/schedule" },
  { role: "Admin", path: "/(admin)/students" },
  { role: "Professor", path: "/(teacher)" },
]) {
  test(`${entry.role}: aguarda leitura lenta do storage antes de abrir rota protegida`, async ({ page }) => {
    const state = await setup(page);
    await seed(page, JSON.stringify({ ...token, role: entry.role }), null);
    await page.addInitScript(() => {
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        const value = getItem.call(this, key);
        return key.startsWith("@krava:")
          ? new Promise((resolve) => setTimeout(() => resolve(value), 300)) as unknown as string
          : value;
      };
    });
    await page.goto(entry.path);
    await expect(page.getByTestId("auth-loading")).toHaveCount(0);
    await expect.poll(() => state.protectedHeaders.length).toBeGreaterThan(0);
    expect(page.url()).not.toContain("signIn");
    const url = page.url();
    const count = state.protectedHeaders.length;
    await page.reload();
    await expect.poll(() => state.protectedHeaders.length).toBeGreaterThan(count);
    expect(page.url()).toBe(url);
    expect(state.protectedHeaders.at(-1)).toBe(`Bearer ${token.accessToken}`);
  });
}

test("sessão válida funciona mesmo se a seleção de CT salva estiver corrompida", async ({ page }) => {
  await setup(page);
  await seed(page, JSON.stringify(token), "invalid-json");
  await page.goto("/(user)/schedule");
  await expect(page.getByText("agendar aulas", { exact: true })).toBeVisible();
});

test("migra JWT válido de login antigo salvo apenas na seleção de CT", async ({ page }) => {
  await setup(page);
  await seed(page, null, JSON.stringify(selection));
  await page.goto("/(user)/schedule");
  await expect(page.getByText("agendar aulas", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).accessToken, authKey)).toBe(token.accessToken);
});

for (const auth of [JSON.stringify({ ...token, expiresAtUtc: "2020-01-01T00:00:00Z" }), "invalid-json"]) {
  test(`descarta sessão ${auth === "invalid-json" ? "corrompida" : "expirada"} sem recuperar token antigo da seleção`, async ({ page }) => {
    await setup(page);
    await seed(page, auth, JSON.stringify(selection));
    await page.goto("/(user)/schedule");
    await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), authKey)).toBeNull();
    expect(await page.evaluate((key) => localStorage.getItem(key), selectionKey)).toBeNull();
  });
}

test("logout remove a sessão persistida e o reload exige novo login", async ({ page }) => {
  await setup(page);
  await seed(page, JSON.stringify(token), JSON.stringify(selection));
  await page.goto("/(user)/schedule");
  await page.getByLabel("Abrir menu do perfil").click();
  await page.getByText("Sair", { exact: true }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), authKey)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), selectionKey)).toBeNull();
});

test("401 limpa ambos os registros e não ressuscita o token ao atualizar", async ({ page }) => {
  const state = await setup(page);
  await seed(page, JSON.stringify(token), JSON.stringify(selection));
  state.unauthorized = true;
  await page.goto("/(user)/schedule");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), authKey)).toBeNull();
  expect(await page.evaluate((key) => localStorage.getItem(key), selectionKey)).toBeNull();
  await page.reload();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeVisible();
});
