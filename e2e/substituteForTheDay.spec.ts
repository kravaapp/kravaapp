import { expect, Page, test } from "@playwright/test";

const OCORRENCIA_ID = "77777777-7777-4777-8777-777777777777";

/** Admin com uma aula hoje do Lucaum; devolve os corpos enviados ao trocar o professor do dia. */
async function openTodaysClass(page: Page, substitute: { id: string; name: string } | null) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "admin",
    userName: "Admin Teste", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Admin",
  })));

  const sent: { professorId: string | null }[] = [];
  let current = substitute;
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const teacher = () => ({
      professorId: "lucaum", professorName: "Lucaum",
      substituteId: current?.id ?? null, substituteName: current?.name ?? null,
    });
    if (request.method() === "PUT" && path.endsWith(`/ocorrencias/${OCORRENCIA_ID}/substitute`)) {
      const body = request.postDataJSON() as { professorId: string | null };
      sent.push(body);
      current = body.professorId ? { id: body.professorId, name: "Guilherme" } : null;
      return route.fulfill({ json: teacher() });
    }
    if (path.endsWith(`/ocorrencias/${OCORRENCIA_ID}/teacher`)) return route.fulfill({ json: teacher() });
    if (path.endsWith("/scheduling/ocorrencias/today")) return route.fulfill({ json: [{
      id: OCORRENCIA_ID, aulaId: "a", aulaName: "Kids", modalidadeName: "Futevôlei",
      professorName: substitute?.name ?? "Lucaum", date: "2099-01-01", startTime: "17:00:00", endTime: "18:00:00",
      status: "Agendada", maxCapacity: 10, confirmedCount: 2, waitlistCount: 0, pendingPayments: 0,
      isSubscribed: false, subscriptionStatus: null,
    }] });
    if (path.endsWith("/tenant/professors")) return route.fulfill({ json: [
      { userId: "lucaum", name: "Lucaum", email: "l@example.com", role: "Professor" },
      { userId: "guilherme", name: "Guilherme", email: "g@example.com", role: "Professor" },
    ] });
    if (path.endsWith("/attendance")) return route.fulfill({ json: { presentCount: 0, absentCount: 0, pendingCount: 0, lista: [] } });
    if (/\/(membership\/partner-requests|membership\/plan-requests|tenant\/join-requests)$/.test(path)) {
      return route.fulfill({ json: [] });
    }
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], totalPages: 1, count: 0 } });
  });

  await page.goto("/(admin)/classes");
  await page.getByText("17:00", { exact: true }).first().click();
  await expect(page.getByText("Professor do dia", { exact: true })).toBeVisible();
  return sent;
}

test("admin escolhe quem cobre a aula de hoje", async ({ page }) => {
  const sent = await openTodaysClass(page, null);

  await page.getByRole("button", { name: "Guilherme", exact: true }).click();

  await expect.poll(() => sent).toEqual([{ professorId: "guilherme" }]);
  await expect(page.getByText("Guilherme vai cobrir esta aula.")).toBeVisible();
  await expect(page.getByText(/^Guilherme · 17:00/)).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "test-results/substitute-for-the-day.png" });
});

test("escolher o titular devolve a aula para ele", async ({ page }) => {
  const sent = await openTodaysClass(page, { id: "guilherme", name: "Guilherme" });

  await page.getByRole("button", { name: "Lucaum (titular)", exact: true }).click();

  await expect.poll(() => sent).toEqual([{ professorId: null }]);
  await expect(page.getByText("A aula voltou para Lucaum.")).toBeVisible();
  await expect(page.getByText(/^Lucaum · 17:00/)).toBeVisible();
});
