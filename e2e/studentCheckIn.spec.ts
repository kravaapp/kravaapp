import { expect, Page, test } from "@playwright/test";

const BOOKING_ID = "77777777-7777-4777-8777-777777777777";
const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const plan = {
  contratoId: "c", planoName: "Mensal 3x", startDate: "2026-01-01", endDate: "2099-01-01", status: "Ativo",
  maxClassesPerMonth: null, classesUsedThisMonth: 0, classesRemainingThisMonth: null, modalitiesPermitted: [],
  autoRenew: false,
};

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

/** Aula de hoje daqui a 1h; o check-in abre em `opensIn` minutos (negativo = já abriu). */
function nextClass(opensIn: number, status = "Confirmado") {
  const start = new Date(Date.now() + 60 * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    bookingId: BOOKING_ID, bookingStatus: status, ocorrenciaId: OCORRENCIA_ID,
    ocorrenciaDate: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
    aulaId: "a", aulaName: "treinão dos crias", startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}:00`,
    endTime: "23:59:00", modalityId: "m", modalityName: "Futevôlei", professorId: "p", professorName: "Lucaum",
    ctId: "ct", ctName: "CT Teste", waitlistPosition: null, bookingSource: "App",
    checkInOpensAt: minutesFromNow(opensIn), checkInDeadlineAt: minutesFromNow(45),
  };
}

async function login(page: Page, role: "Aluno" | "Admin" | "Professor") {
  await page.addInitScript((r) => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Lucaum", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste",
    role: r, gender: "M", studentLevel: "Iniciante",
  })), role);
}

async function routeStudent(page: Page, next: unknown, posts: string[], occurrence: Record<string, unknown> = {}) {
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST") {
      posts.push(path);
      return route.fulfill({ status: 204, body: "" });
    }
    if (path.endsWith("/scheduling/my-next-class")) return route.fulfill({ json: next });
    if (path.endsWith("/plans/current")) return route.fulfill({ json: plan });
    if (path.endsWith("/scheduling/ocorrencias")) return route.fulfill({ json: { items: [{
      id: OCORRENCIA_ID, aulaName: "treinão dos crias", modalityName: "Futevôlei", professorName: "Lucaum",
      date: "2099-01-01", startTime: "13:00:00", endTime: "14:00:00", minLevel: null,
      publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: "Confirmado",
      confirmedCount: 1, maxCapacity: 5, myBookingId: BOOKING_ID, ...occurrence,
    }] } });
    if (path.endsWith("/scheduling/modalidades")) return route.fulfill({ json: { items: [{ id: "category", name: "Futevôlei" }] } });
    if (/accesses$|partner-requests$|plan-requests$|my-week-classes$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/my")) return route.fulfill({ json: null });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
}

test("próxima aula mostra quando o check-in abre", async ({ page }) => {
  await login(page, "Aluno");
  await routeStudent(page, nextClass(30), []);

  await page.goto("/(user)");
  await expect(page.getByText(/^Check-in abre às \d{2}:\d{2} · em (29|30)min$/)).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/checkin-home-waiting.png" });
});

test("aluno faz o check-in pelo card da próxima aula", async ({ page }) => {
  await login(page, "Aluno");
  const posts: string[] = [];
  await routeStudent(page, nextClass(-10), posts);

  await page.goto("/(user)");
  await expect(page.getByText(/^Até \d{2}:\d{2}\. Sem o check-in, a vaga vai para a fila\.$/)).toBeVisible();
  await page.screenshot({ path: "e2e-screenshots/checkin-home-open.png" });
  await page.getByRole("button", { name: "Fazer check-in" }).click();

  await expect.poll(() => posts).toEqual([`/api/scheduling/bookings/${BOOKING_ID}/check-in`]);
  await expect(page.getByText("Check-in feito!", { exact: true })).toBeVisible();
});

test("check-in feito aparece traduzido no card", async ({ page }) => {
  await login(page, "Aluno");
  await routeStudent(page, nextClass(-10, "CheckedIn"), []);

  await page.goto("/(user)");
  await expect(page.getByText("Check-in feito ✓", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("CheckedIn", { exact: true })).toHaveCount(0);
});

test("agenda mostra o botão de check-in na aula reservada", async ({ page }) => {
  await login(page, "Aluno");
  const posts: string[] = [];
  await routeStudent(page, null, posts, { checkInOpensAt: minutesFromNow(-5), checkInDeadlineAt: minutesFromNow(40) });

  await page.goto("/(user)/schedule");
  await page.getByRole("button", { name: "Fazer check-in" }).click();
  await expect.poll(() => posts).toEqual([`/api/scheduling/bookings/${BOOKING_ID}/check-in`]);
  await page.screenshot({ path: "e2e-screenshots/checkin-agenda.png" });
});

test("CT liga o check-in do aluno nas políticas", async ({ page }) => {
  await login(page, "Admin");
  const puts: unknown[] = [];
  let required = false;
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "PUT" && path.endsWith("/tenant/settings")) {
      const body = request.postDataJSON();
      puts.push(body);
      required = body.requireStudentCheckIn;
      return route.fulfill({ status: 204, body: "" });
    }
    if (path.endsWith("/tenant/settings")) return route.fulfill({ json: {
      name: "CT Teste", slug: null, logoUrl: null, address: null, contact: null, gympassRepasse: 0, totalpassRepasse: 0,
      waitlistTimeoutMinutes: 60, cancellationTimeoutMinutes: 60, noShowPenaltyFee: 0, partnerCheckInLimit: 0,
      saasStatus: "Ativo", saasPlanName: "Pro", nextBillingAt: null, memberBookingWindowMinutes: null,
      partnerBookingWindowMinutes: null, requireStudentCheckIn: required, checkInOpensMinutes: 120, checkInDeadlineMinutes: 15,
    } });
    if (/scheduling-rules$|partners$|avulso-config$|join-requests$|professors$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [] } });
  });

  await page.goto("/(admin)/settings");
  await page.getByText("Check-in do aluno", { exact: true }).scrollIntoViewIfNeeded();
  await page.getByLabel("Exigir check-in do aluno").click();
  await expect.poll(() => puts.length).toBe(1);
  expect(puts[0]).toMatchObject({ requireStudentCheckIn: true, checkInOpensMinutes: 120, checkInDeadlineMinutes: 15 });
  await expect(page.getByText("120 min antes da aula", { exact: true })).toBeVisible();
  await page.getByText("Prazo do check-in", { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByText("Políticas do CT atualizadas!", { exact: true })).toHaveCount(0, { timeout: 10_000 });
  await page.screenshot({ path: "e2e-screenshots/checkin-settings.png" });
});

test("chamada do professor se atualiza sozinha", async ({ page }) => {
  await login(page, "Professor");
  let attendanceCalls = 0;
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/scheduling/ocorrencias/today")) return route.fulfill({ json: [{
      id: OCORRENCIA_ID, aulaId: "a", aulaName: "treinão dos crias", modalidadeName: "Futevôlei", professorName: "Lucaum",
      date: "2099-01-01", startTime: "13:00:00", endTime: "14:00:00", status: "Agendada", maxCapacity: 5,
      confirmedCount: 1, waitlistCount: 0, pendingPayments: 0, isSubscribed: false, subscriptionStatus: null,
    }] });
    if (path.endsWith("/attendance")) {
      attendanceCalls++;
      return route.fulfill({ json: { presentCount: 0, absentCount: 0, pendingCount: 1, lista: [] } });
    }
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [] } });
  });

  await page.goto("/(teacher)/classes");
  await expect.poll(() => attendanceCalls).toBeGreaterThan(0);
  const first = attendanceCalls;
  await expect.poll(() => attendanceCalls, { timeout: 15_000 }).toBeGreaterThan(first);
});
