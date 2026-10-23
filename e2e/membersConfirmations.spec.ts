import { expect, Page, test } from "@playwright/test";

// No app web o Alert.alert com botões não aparece, então as confirmações da tela de membros usam o ConfirmModal.
async function setup(page: Page) {
  await page.addInitScript(() => localStorage.setItem("@krava:auth-state", JSON.stringify({
    accessToken: "test-token", refreshToken: "test-refresh", expiresAtUtc: "2099-01-01T00:00:00Z",
    userId: "admin", userName: "Admin Teste", email: "admin@example.com", tenantId: "ct", tenantName: "CT Teste", role: "Admin",
  })));
  const state = { deletes: [] as string[], invitationCancelled: false };
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "DELETE") {
      state.deletes.push(url.pathname);
      if (url.pathname.includes("/tenant/invitations/")) state.invitationCancelled = true;
      return route.fulfill({ status: 204, body: "" });
    }
    if (url.pathname.endsWith("/tenant/invitations")) {
      const role = url.searchParams.get("role");
      return route.fulfill({ json: role === "Aluno" && !state.invitationCancelled ? [{
        id: "invite", ctId: "ct", ctName: "CT Teste", email: "convidado@example.com", role: "Aluno",
        status: "Pendente", planId: null, isPaidLocally: false, createdAtUtc: "2026-10-18T12:00:00Z",
      }] : [] });
    }
    if (url.pathname.endsWith("/tenant/professors")) {
      return route.fulfill({ json: [{ userId: "professor", name: "Professor Teste", email: "professor@example.com", role: "Professor" }] });
    }
    if (url.pathname.endsWith("/membership/alunos")) return route.fulfill({ json: { items: [], totalPages: 1 } });
    if (/\/(tenant\/join-requests|membership\/partner-requests|membership\/plan-requests)$/.test(url.pathname)) {
      return route.fulfill({ json: [] });
    }
    if (url.pathname.endsWith("/notifications/unread-count")) return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: { items: [], count: 0 } });
  });
  await page.goto("/(admin)/students");
  return state;
}

test("cancelar convite pede confirmação e cancela", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Gerenciar convite de convidado@example.com" }).click();
  await page.getByRole("button", { name: "Cancelar convite" }).click();

  await expect(page.getByText('Deseja realmente cancelar o convite enviado para "convidado@example.com"?')).toBeVisible();
  await page.waitForTimeout(600); // fim da animação de entrada do modal
  await page.screenshot({ path: "test-results/members-cancel-invite.png" });
  await page.getByText("Sim, cancelar", { exact: true }).click();

  await expect.poll(() => state.deletes).toEqual(["/api/tenant/invitations/invite"]);
  await expect(page.getByText("Convite cancelado com sucesso.")).toBeVisible();
  await expect(page.getByText("Gerenciar Convite")).toBeHidden();
});

test("desistir na confirmação não cancela o convite", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("button", { name: "Gerenciar convite de convidado@example.com" }).click();
  await page.getByRole("button", { name: "Cancelar convite" }).click();
  await page.getByText("Não", { exact: true }).click();

  await expect(page.getByText("Deseja realmente cancelar o convite", { exact: false })).toBeHidden();
  expect(state.deletes).toEqual([]);
});

test("desvincular professor pede confirmação e desvincula", async ({ page }) => {
  const state = await setup(page);
  await page.getByRole("tab", { name: "Professores", exact: true }).click();
  await page.getByRole("button", { name: "Desvincular professor" }).click();

  await expect(page.getByText('Deseja desvincular o professor "Professor Teste" deste Centro de Treinamento?')).toBeVisible();
  await page.getByText("Sim, desvincular", { exact: true }).click();

  await expect.poll(() => state.deletes).toEqual(["/api/tenant/professors/professor"]);
  await expect(page.getByText("Professor desvinculado com sucesso!")).toBeVisible();
});
