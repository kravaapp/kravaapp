import { expect, Page, test } from "@playwright/test";

const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const plan = {
  contratoId: "c", planoName: "Mensal 3x", startDate: "2026-01-01", endDate: "2099-01-01", status: "Ativo",
  maxClassesPerMonth: null, classesUsedThisMonth: 0, classesRemainingThisMonth: null, modalitiesPermitted: [],
  autoRenew: false,
};

async function setup(page: Page, occurrence: Record<string, unknown>, bookingOptions: () => unknown) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Aluno Teste", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste",
    role: "Aluno", gender: "M", studentLevel: "Iniciante",
  })));
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/plans/current")) return route.fulfill({ json: plan });
    if (path.endsWith(`/ocorrencias/${OCORRENCIA_ID}/booking-options`)) return route.fulfill({ json: bookingOptions() });
    if (path.endsWith("/scheduling/ocorrencias")) return route.fulfill({ json: { items: [{
      id: OCORRENCIA_ID, aulaName: "treinão dos crias", modalityName: "Futevôlei", professorName: "Professor",
      date: "2099-01-01", startTime: "13:00:00", endTime: "14:00:00", minLevel: null,
      publicGender: "Mixed", status: "Aberta", releaseAt: null, subscriptionStatus: null,
      confirmedCount: 0, maxCapacity: 5, ...occurrence,
    }] } });
    if (path.endsWith("/scheduling/modalidades")) return route.fulfill({ json: { items: [{ id: "category", name: "Futevôlei" }] } });
    if (/accesses$|partner-requests$|plan-requests$|my-week-classes$/.test(path)) return route.fulfill({ json: [] });
    if (path.endsWith("/my") || path.endsWith("/my-next-class")) return route.fulfill({ json: null });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
}

test("agenda mostra quanto falta para a reserva abrir no lugar do botão", async ({ page }) => {
  const opensAt = new Date(Date.now() + (2 * 60 + 10) * 60_000).toISOString();
  await setup(page, { bookingOpensAt: opensAt }, () => ({ options: [], defaultOrigin: null }));

  await page.goto("/(user)/schedule");
  await expect(page.getByLabel(/^Reserva abre em 2h1\dmin$/)).toBeVisible();
  await expect(page.getByRole("button", { name: /^Reservar aula/ })).toHaveCount(0);
  await page.screenshot({ path: "e2e-screenshots/booking-window-agenda.png" });
});

test("modal conta até a abertura e libera o plano sozinho", async ({ page }) => {
  let opensAt = "";
  await setup(page, {}, () => ({
    defaultOrigin: "Plan",
    serverNowUtc: new Date().toISOString(),
    options: [
      { origin: "Plan", kind: "Plan", label: "Mensal 3x", used: 0, limit: 3, period: "week", available: true, reason: null, opensAt },
    ],
  }));

  await page.goto("/(user)/schedule");
  opensAt = new Date(Date.now() + 6_000).toISOString();
  await page.getByRole("button", { name: /^Reservar aula/ }).first().click();

  const confirm = page.getByRole("button", { name: "Confirmar", exact: true });
  await expect(page.getByText(/^Abre às \d{2}:\d{2} · em \ds$/)).toBeVisible();
  await expect(page.getByText("A reserva libera sozinha quando abrir. Pode deixar esta tela aberta.", { exact: true })).toBeVisible();
  await expect(confirm).toBeDisabled();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "e2e-screenshots/booking-window-modal.png" });

  await expect(page.getByRole("radio", { name: /^Plano Mensal 3x/ })).toBeChecked({ timeout: 10_000 });
  await expect(page.getByText("0 de 3 nesta semana", { exact: true })).toBeVisible();
  await expect(confirm).toBeEnabled();
});
