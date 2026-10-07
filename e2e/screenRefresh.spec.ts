import { expect, Page, test } from "@playwright/test";

const invoiceId = "019318bc-8910-74e2-89b1-5916ba58bc32";
const ctId = "019318b8-4720-7216-953a-0e6205791c10";
const categoryId = "019318b8-4720-7216-953a-0e6205791c11";
const secondCategoryId = "019318b8-4720-7216-953a-0e6205791c12";
const categories = [categoryId, secondCategoryId].map((id, index) => ({ id, name: index ? "Musculação" : "Muay Thai", description: "", isActive: true, defaultCapacity: 20 }));

async function setup(page: Page, role: string) {
  await page.addInitScript(({ role }) => {
    const user = { accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
      userId: "user", userName: "Usuário Teste", email: "user@example.com", tenantId: "ct", tenantName: "CT Teste", role, gender: "M", studentLevel: "Iniciante" };
    localStorage.setItem("@krava:auth-state", JSON.stringify(user));
    localStorage.setItem("@krava:tenant-selection", JSON.stringify({ preAuthToken: null, currentToken: user,
      availableTenants: [{ tenantId: "ct", tenantName: "CT Teste", role, isActive: true }] }));
  }, { role });
  const counts = new Map<string, number>();
  const writes: string[] = [];
  const urls: string[] = [];
  const state = { changed: false, failSchedule: false };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    if (request.method() !== "GET") writes.push(path);
    counts.set(path, (counts.get(path) ?? 0) + 1);
    urls.push(url.pathname + url.search);
    let body: unknown = { items: [], totalPages: 1 };
    if (path === "/analytics/financial") body = { mrr: 0, delinquencyPercentage: 0 };
    else if (path === "/analytics/active-students") body = { activeStudentsCount: 0 };
    else if (path === "/analytics/operational") body = { noShowRate: 0 };
    else if (path === "/analytics/financial/summary" || path === "/plans/current" || path === "/scheduling/my-next-class") body = null;
    else if (["/analytics/churn", "/analytics/operational/daily-attendance", "/membership/partner-requests", "/tenant/professors", "/tenant/join-requests", "/scheduling/my-week-classes", "/scheduling/ocorrencias/today", "/tenant/scheduling-rules", "/financial/avulso-config", "/auth/invitations/pending"].includes(path)) body = [];
    else if (path === "/scheduling/modalidades") body = { items: state.changed ? categories.map((category) => ({ ...category, description: "Atualizada" })) : categories };
    else if (path === "/dashboard/teacher") body = { todayClassesCount: 0, todayStudentsCount: 0, todayWaitlistCount: 0, nextClass: null };
    else if (path === "/tenant/settings") body = { name: "CT Teste", slug: "ct", logoUrl: null, address: null, contact: null,
      gympassRepasse: 10, totalpassRepasse: 20, cancellationTimeoutMinutes: 60, noShowPenaltyFee: 0, partnerCheckInLimit: 1, waitlistTimeoutMinutes: 10 };
    else if (path === "/tenant/catalog-profile") body = { showInCatalog: true, description: state.changed ? "Descrição atualizada" : "Descrição original", bannerUrl: null, modalities: [] };
    else if (path === "/membership/alunos/me") body = { id: "aluno", userName: state.changed ? "Nome Atualizado" : "Usuário Teste", cpf: "12345678901", birthDate: "1990-01-01", sex: "M",
      phone: state.changed ? "11888888888" : "11999999999", emergencyContact: null, emergencyPhone: null, medicalNotes: null, photoUrl: null };
    else if (path === "/payments/my") body = { items: [{ id: invoiceId, amount: 180, dueDate: "2026-10-10", status: "Pendente", type: "Mensalidade", description: "Assinatura" }],
      page: Number(url.searchParams.get("page") ?? 1), pageSize: 20, totalPages: 1, totalCount: 1, hasNextPage: false, hasPreviousPage: false };
    else if (path === "/payments/gateways/active") body = { gateway: "abacatepay", publicKey: null };
    else if (path === "/payments/gateways") body = [{ gateway: "abacatepay", isActive: true, createdAtUtc: null }];
    else if (path === "/notifications/unread-count") body = { count: 0 };
    else if (path === "/checkin/my-status") body = { totalPresencas: 0, totalFaltas: 0, availableForSchedulingThisMonth: 0, totalUsedThisMonth: 0 };
    else if (path === "/auth/catalog") body = [{ id: ctId, name: "CT Catálogo", modalities: [], logoUrl: null }];
    else if (path === `/auth/catalog/${ctId}`) body = { ctId, name: "CT Catálogo", description: "CT para testes", logoUrl: null, bannerUrl: null, modalities: [], plans: [], avulsos: [] };
    if (path === "/scheduling/ocorrencias" && state.failSchedule) return route.fulfill({ status: 400, json: { detail: "Não foi possível consultar a agenda." } });
    return route.fulfill({ json: body });
  });
  return { counts, writes, urls, state };
}

async function pull(page: Page) {
  const target = page.locator('[data-testid="refreshable-scroll"]:visible, [data-testid="members-list"]:visible').last();
  await expect(target).toBeVisible();
  await target.evaluate((node) => { node.scrollTop = 0; });
  const box = (await target.boundingBox())!;
  expect(box.height).toBeGreaterThan(60);
  const session = await page.context().newCDPSession(page);
  const x = box.x + box.width - 8;
  const y = box.y + 15;
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  for (let i = 1; i <= 4; i++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y + i * 25 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await session.detach();
}

const cases: Array<{ path: string; role: string; endpoints: string[] }> = [
  { path: "/(admin)", role: "Admin", endpoints: ["/analytics/active-students", "/analytics/financial", "/analytics/operational", "/analytics/operational/daily-attendance", "/analytics/churn", "/membership/partner-requests", "/scheduling/ocorrencias/today"] },
  { path: "/(admin)/classes", role: "Admin", endpoints: ["/scheduling/ocorrencias/today", "/scheduling/aulas"] },
  { path: "/(admin)/modalities", role: "Admin", endpoints: ["/scheduling/modalidades"] },
  { path: "/(admin)/churn", role: "Admin", endpoints: ["/analytics/churn"] },
  { path: "/(admin)/settings", role: "Admin", endpoints: ["/tenant/scheduling-rules", "/tenant/settings"] },
  { path: "/(admin)/profile", role: "Admin", endpoints: ["/tenant/catalog-profile", "/scheduling/modalidades"] },
  { path: "/(admin)/financial", role: "Admin", endpoints: ["/analytics/financial/summary", "/membership/contratos", "/membership/planos", "/scheduling/modalidades", "/tenant/settings"] },
  { path: "/(admin)/financial/plans", role: "Admin", endpoints: ["/membership/planos", "/financial/avulso-config"] },
  { path: "/(admin)/financial/gateways", role: "Admin", endpoints: ["/payments/gateways"] },
  { path: "/(user)", role: "Aluno", endpoints: ["/scheduling/my-next-class", "/scheduling/my-week-classes", "/scheduling/ocorrencias"] },
  { path: "/(user)/schedule", role: "Aluno", endpoints: ["/scheduling/modalidades", "/scheduling/ocorrencias"] },
  { path: "/(user)/history", role: "Aluno", endpoints: ["/scheduling/modalidades", "/scheduling/my-history", "/checkin/my-status"] },
  { path: "/(user)/paymentPlans", role: "Aluno", endpoints: ["/membership/planos", "/plans/current", "/payments/my"] },
  { path: "/(user)/pendingPayments", role: "Aluno", endpoints: ["/payments/my"] },
  { path: `/(user)/payment?id=${invoiceId}`, role: "Aluno", endpoints: ["/payments/my", "/payments/gateways/active"] },
  { path: "/profile", role: "Aluno", endpoints: ["/membership/alunos/me"] },
  { path: "/(teacher)", role: "Professor", endpoints: ["/dashboard/teacher", "/scheduling/ocorrencias/today"] },
  { path: "/(teacher)/classes", role: "Professor", endpoints: ["/scheduling/ocorrencias/today"] },
  { path: "/(teacher)/students", role: "Professor", endpoints: ["/scheduling/modalidades", "/membership/alunos"] },
  { path: "/selectTenant", role: "Aluno", endpoints: ["/auth/catalog", "/auth/invitations/pending"] },
];

for (const entry of cases) test(`puxar atualiza ${entry.path}`, async ({ page }) => {
  const { counts, writes } = await setup(page, entry.role);
  if (entry.path === "/(admin)/financial") {
    await page.goto("/(admin)/financial/plans");
    await page.getByRole("tab", { name: "Financeiro", exact: true }).click();
  } else await page.goto(entry.path);
  for (const endpoint of entry.endpoints) await expect.poll(() => counts.get(endpoint) ?? 0).toBeGreaterThan(0);
  await page.waitForLoadState("networkidle");
  const previous = entry.endpoints.map((endpoint) => counts.get(endpoint)!);
  await pull(page);
  for (let i = 0; i < entry.endpoints.length; i++) await expect.poll(() => counts.get(entry.endpoints[i]) ?? 0).toBeGreaterThan(previous[i]);
  await expect(page.getByText("Atualizando...", { exact: true })).toHaveCount(0);
  expect(writes).toEqual([]);
});

test("agenda preserva modalidade e dia após atualização e permite recuperar uma falha", async ({ page }) => {
  const { state, urls } = await setup(page, "Aluno");
  await page.goto("/(user)/schedule");
  await page.getByText("Musculação", { exact: true }).click();
  await expect.poll(() => urls.filter((url) => url.includes("/scheduling/ocorrencias?")).at(-1)).toContain(`modalityId=${secondCategoryId}`);
  const before = urls.filter((url) => url.includes("/scheduling/ocorrencias?")).at(-1);
  state.changed = true;
  await pull(page);
  await page.waitForLoadState("networkidle");
  expect(urls.filter((url) => url.includes("/scheduling/ocorrencias?")).at(-1)).toBe(before);
  state.failSchedule = true;
  await pull(page);
  await expect(page.getByText("não foi possível carregar a agenda", { exact: true })).toBeVisible({ timeout: 15000 });
  state.failSchedule = false;
  await pull(page);
  await expect(page.getByText("nenhuma aula encontrada para este dia", { exact: true })).toBeVisible();
});

test("atualização do perfil preserva campos ainda não salvos", async ({ page }) => {
  const { state, counts, writes } = await setup(page, "Aluno");
  await page.goto("/profile");
  const phone = page.getByPlaceholder("(00) 00000-0000", { exact: true });
  await expect(phone).toBeVisible();
  await phone.fill("11777777777");
  state.changed = true;
  await pull(page);
  await expect.poll(() => counts.get("/membership/alunos/me")).toBe(2);
  await expect(phone).toHaveValue("(11) 77777-7777");
  await expect(page.locator('input[value="Nome Atualizado"]')).toBeVisible();
  expect(writes).toEqual([]);
});

test("notificações vazias também podem ser atualizadas", async ({ page }) => {
  const { counts } = await setup(page, "Admin");
  await page.goto("/(admin)/modalities");
  await page.getByLabel("Abrir notificações", { exact: true }).click();
  await expect(page.getByText("Nenhuma notificação", { exact: true })).toBeVisible();
  const previous = counts.get("/notifications") ?? 0;
  await pull(page);
  await expect.poll(() => counts.get("/notifications") ?? 0).toBe(previous + 1);
});

test("perfil do CT preserva a descrição em edição durante a atualização", async ({ page }) => {
  const { state, counts, writes } = await setup(page, "Admin");
  await page.goto("/(admin)/profile");
  const description = page.getByPlaceholder("Conte sobre seu CT, metodologia, estrutura, professores...");
  await expect(description).toHaveValue("Descrição original");
  await description.fill("Minha edição ainda não salva");
  state.changed = true;
  await pull(page);
  await expect.poll(() => counts.get("/tenant/catalog-profile")).toBe(2);
  await expect(description).toHaveValue("Minha edição ainda não salva");
  expect(writes).toEqual([]);
});

test("detalhes de um CT podem ser atualizados sem alterar a navegação", async ({ page }) => {
  const { counts, writes } = await setup(page, "Aluno");
  await page.goto("/selectTenant");
  await page.getByRole("tab", { name: /explorar/i }).click();
  await page.getByText("CT Catálogo", { exact: true }).click();
  await expect.poll(() => counts.get(`/auth/catalog/${ctId}`) ?? 0).toBe(1);
  await pull(page);
  await expect.poll(() => counts.get(`/auth/catalog/${ctId}`)).toBe(2);
  await expect(page.getByText("CT para testes", { exact: true })).toBeVisible();
  expect(writes).toEqual([]);
});

test("formulário de nova aula atualiza as opções e preserva o nome digitado", async ({ page }) => {
  const { counts, writes } = await setup(page, "Admin");
  await page.goto("/(admin)/classes");
  await page.getByRole("button", { name: "Nova aula", exact: true }).click();
  const name = page.getByPlaceholder("Ex.: Treino avançado");
  await expect(name).toBeVisible();
  await name.fill("Minha nova aula");
  const before = counts.get("/scheduling/modalidades") ?? 0;
  await pull(page);
  await expect.poll(() => counts.get("/scheduling/modalidades") ?? 0).toBe(before + 1);
  await expect(name).toHaveValue("Minha nova aula");
  expect(writes).toEqual([]);
});

test("formulário de plano atualiza modalidades sem criar uma assinatura", async ({ page }) => {
  const { counts, writes } = await setup(page, "Admin");
  await page.goto("/(admin)/financial/plans");
  await page.getByRole("button", { name: "Novo", exact: true }).click();
  await expect(page.getByText("Novo plano", { exact: true })).toBeVisible();
  const before = counts.get("/scheduling/modalidades") ?? 0;
  await pull(page);
  await expect.poll(() => counts.get("/scheduling/modalidades") ?? 0).toBe(before + 1);
  expect(writes).toEqual([]);
});

test("chamada e lista de espera atualizam a ocorrência e a lista selecionada", async ({ page }) => {
  const { counts, writes } = await setup(page, "Professor");
  const occurrenceId = "019318b8-4720-7216-953a-0e6205791c15";
  const attendancePath = `/scheduling/ocorrencias/${occurrenceId}/attendance`;
  let attendanceReads = 0;
  await page.route("**/api/scheduling/ocorrencias/today", (route) => {
    const path = "/scheduling/ocorrencias/today";
    counts.set(path, (counts.get(path) ?? 0) + 1);
    return route.fulfill({ json: [{ id: occurrenceId, aulaId: "aula", aulaName: "Aula Teste", modalidadeName: "Muay Thai", professorName: "Usuário Teste",
      date: "2026-10-06", startTime: "20:00:00", endTime: "21:00:00", status: "Agendada", maxCapacity: 20, confirmedCount: 0, waitlistCount: 0, pendingPayments: 0 }] });
  });
  await page.route(`**/api${attendancePath}*`, (route) => {
    attendanceReads++;
    return route.fulfill({ json: { lista: [], presentCount: 0, absentCount: 0, pendingCount: 0 } });
  });
  await page.goto("/(teacher)/classes");
  await expect.poll(() => attendanceReads).toBe(1);
  await pull(page);
  await expect.poll(() => attendanceReads).toBe(2);
  await page.getByText("Espera (0)", { exact: true }).click();
  await expect.poll(() => attendanceReads).toBe(3);
  await pull(page);
  await expect.poll(() => attendanceReads).toBe(4);
  expect(counts.get("/scheduling/ocorrencias/today")).toBe(3);
  expect(writes).toEqual([]);
});
