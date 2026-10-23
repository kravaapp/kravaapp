import { expect, test } from "@playwright/test";

const OCORRENCIA_ID = "99999999-9999-4999-8999-999999999999";

const student = (bookingId: string, studentName: string, status: string) => ({
  bookingId, studentId: bookingId, studentName, photoUrl: null, isExperimental: false, status,
  level: "Iniciante", paymentMethod: "Pix", avulsoPending: false,
});

// Aula com 2 vagas lotada e 1 na fila: a falta de um aluno coloca o próximo da fila direto na chamada.
test("falta na chamada põe o próximo da fila na aula", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Lucaum", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Professor",
  })));

  let absentMarked = false;
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() === "PATCH" && path.endsWith("/bookings/lance/mark-absent")) {
      absentMarked = true;
      return route.fulfill({ json: { promotedStudentName: "Maria da Fila" } });
    }
    if (path.endsWith("/scheduling/ocorrencias/today")) return route.fulfill({ json: [{
      id: OCORRENCIA_ID, aulaId: "a", aulaName: "Aula de Teste", modalidadeName: "Futevôlei", professorName: "Lucaum",
      date: "2099-01-01", startTime: "16:00:00", endTime: "17:00:00", status: "Agendada", maxCapacity: 2,
      confirmedCount: 2, waitlistCount: absentMarked ? 0 : 1, pendingPayments: 0,
      isSubscribed: false, subscriptionStatus: null,
    }] });
    if (path.endsWith("/attendance")) {
      const everyone = absentMarked
        ? [student("gabriel", "Gabriel Freitas", "Present"), student("lance", "LanceCam", "Absent"), student("maria", "Maria da Fila", "Pending")]
        : [student("gabriel", "Gabriel Freitas", "Present"), student("lance", "LanceCam", "Pending"), student("maria", "Maria da Fila", "Waitlist")];
      const onlyWaitlist = url.searchParams.get("status") === "FilaEspera";
      const lista = everyone.filter((s) => (s.status === "Waitlist") === onlyWaitlist);
      return route.fulfill({ json: {
        presentCount: 1, absentCount: absentMarked ? 1 : 0, pendingCount: 1, lista,
      } });
    }
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [] } });
  });

  await page.goto("/(teacher)/classes");
  await expect(page.getByText("Espera (1)", { exact: true })).toBeVisible();
  await expect(page.getByText("Maria da Fila", { exact: true })).toBeHidden();

  await page.getByRole("button", { name: "Marcar falta de LanceCam" }).click();

  await expect(page.getByText("Maria da Fila saiu da lista de espera e entrou na chamada.")).toBeVisible();
  await expect(page.getByText("Maria da Fila", { exact: true })).toBeVisible();
  await expect(page.getByText("Espera (0)", { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/attendance-waitlist-absent.png" });
});

// Aula já concluída: a chamada só mostra o resultado, sem encerrar, cancelar ou marcar presença de novo.
test("aula concluída aberta pela próxima aula fica só para consulta", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "t", refreshToken: "r", expiresAtUtc: "2099-01-01T00:00:00Z", userId: "u",
    userName: "Lucaum", email: "a@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Professor",
  })));
  const patches: string[] = [];
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") {
      patches.push(path);
      return route.fulfill({ status: 204, body: "" });
    }
    if (path.endsWith("/dashboard/teacher")) {
      // API antiga: ainda manda a aula concluída como "próxima" (o back-end novo deixa de mandar).
      return route.fulfill({ json: { nextClass: {
        ocorrenciaId: OCORRENCIA_ID, aulaId: "a", name: "Aula de Teste", date: "2099-01-01", startTime: "16:00:00",
        endTime: "17:00:00", confirmedCount: 1, waitlistCount: 0, maxCapacity: 2, status: "Concluida",
      }, todayClassesCount: 1, todayStudentsCount: 2, todayWaitlistCount: 0 } });
    }
    if (path.endsWith("/scheduling/ocorrencias/today")) return route.fulfill({ json: [{
      id: OCORRENCIA_ID, aulaId: "a", aulaName: "Aula de Teste", modalidadeName: "Futevôlei", professorName: "Lucaum",
      date: "2099-01-01", startTime: "16:00:00", endTime: "17:00:00", status: "Concluida", maxCapacity: 2,
      confirmedCount: 1, waitlistCount: 0, pendingPayments: 0, isSubscribed: false, subscriptionStatus: null,
    }] });
    if (path.endsWith("/attendance")) return route.fulfill({ json: {
      presentCount: 1, absentCount: 1, pendingCount: 0,
      lista: [student("gabriel", "Gabriel Freitas", "Present"), student("lance", "LanceCam", "Absent")],
    } });
    if (path.endsWith("/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [] } });
  });

  await page.goto("/(teacher)");
  await page.getByText("Abrir chamada", { exact: true }).click();

  await expect(page.getByText("Chamada encerrada", { exact: true })).toBeVisible();
  await expect(page.getByText("Encerrar chamada", { exact: true })).toBeHidden();
  await expect(page.getByText("Cancelar aula", { exact: true })).toBeHidden();
  await page.getByRole("button", { name: "Marcar presença de LanceCam" }).click({ force: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: "test-results/attendance-closed-class.png" });
  expect(patches).toEqual([]);
});
