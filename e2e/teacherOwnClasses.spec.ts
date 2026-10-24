import { expect, test } from "@playwright/test";

// A API devolve só as aulas do professor; a home não compara mais nomes para decidir o que é dele.
test("home do professor mostra as aulas dele com a chamada liberada", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Guilherme", email: "g@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Professor",
  })));

  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    // Nome do cadastro diferente do nome de exibição: antes isso escondia o botão da chamada.
    if (path.endsWith("/scheduling/ocorrencias/today")) return route.fulfill({ json: [{
      id: "o1", aulaId: "a", aulaName: "Kids", modalidadeName: "Futevôlei", professorName: "Guilherme Souza",
      date: "2099-01-01", startTime: "17:00:00", endTime: "18:00:00", status: "Agendada", maxCapacity: 10,
      confirmedCount: 2, waitlistCount: 0, pendingPayments: 0, isSubscribed: false, subscriptionStatus: null,
    }] });
    if (path.endsWith("/dashboard/teacher")) return route.fulfill({ json: {
      todayClassesCount: 1, todayStudentsCount: 2, todayWaitlistCount: 0, nextClass: null,
    } });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [] } });
  });

  await page.goto("/(teacher)");
  await expect(page.getByText("2/10 confirmados", { exact: true })).toBeVisible();
  await expect(page.getByText("Prof. Guilherme Souza")).toBeHidden();
  await expect(page.getByText("Abrir chamada", { exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/teacher-own-classes.png" });
});
