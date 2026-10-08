// @ts-nocheck
import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

const RAW_DIR = "./e2e-screenshots/raw-store";

test.describe("App Store & Google Play Screenshot Capture", () => {
  test.beforeAll(() => {
    if (!fs.existsSync(RAW_DIR)) {
      fs.mkdirSync(RAW_DIR, { recursive: true });
    }
  });

  test("Capturar as 4 Telas Oficiais do Krava App com Alta Fidelidade", async ({ page }) => {
    // Configura viewport padrão iPhone 16 / mobile moderno (393 x 852)
    await page.setViewportSize({ width: 393, height: 852 });

    // Injeta sessão de aluno ativa
    await page.addInitScript(() => {
      const mockUser = {
        accessToken: "store-token-123",
        refreshToken: "store-refresh-123",
        expiresAtUtc: "2099-01-01T00:00:00Z",
        userId: "user-store-demo",
        userName: "Lucas Fernandes",
        email: "lucas@krava.app",
        tenantId: "ct-krava-arena",
        tenantName: "KRAVA · Arena Jardins",
        role: "Aluno",
        gender: "M",
        studentLevel: "avancado",
      };
      localStorage.setItem("@krava:auth-state", JSON.stringify(mockUser));
    });

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Mock completo e realista das rotas da API
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const p = url.pathname.replace(/^\/api/, "");
      const fulfill = (body: unknown, status = 200) =>
        route.fulfill({ status, json: body });

      if (p.includes("/notifications/unread-count")) {
        return fulfill({ count: 1 });
      }

      if (p.includes("/scheduling/my-next-class")) {
        return fulfill({
          bookingId: "b-next-1",
          aulaId: "a-1",
          aulaName: "CrossFit WOD",
          room: "Arena Principal",
          modalityName: "CrossFit",
          professorName: "Camila Nunes",
          ocorrenciaDate: todayStr,
          startTime: "19:00:00",
          endTime: "20:00:00",
          bookingStatus: "Confirmado",
        });
      }

      if (p.includes("/scheduling/my-week-classes")) {
        return fulfill([
          {
            ocorrenciaDate: todayStr,
            modalityName: "CrossFit",
            aulaName: "CrossFit WOD",
            startTime: "19:00:00",
            bookingStatus: "Confirmado",
          },
        ]);
      }

      if (p.includes("/scheduling/ocorrencias/today")) {
        return fulfill([
          {
            id: "oc-1",
            aulaId: "a-1",
            aulaName: "CrossFit WOD",
            modalidadeNome: "CrossFit",
            professorName: "Prof. Camila Nunes",
            date: todayStr,
            startTime: "19:00:00",
            endTime: "20:00:00",
            status: "Agendada",
            maxCapacity: 16,
            confirmedCount: 12,
            waitlistCount: 0,
            pendingPayments: 0,
            isSubscribed: true,
            subscriptionStatus: "Confirmado",
          },
        ]);
      }

      if (p.includes("/scheduling/ocorrencias")) {
        return fulfill({
          items: [
            {
              id: "sc-1",
              aulaId: "a-1",
              aulaName: "Futevôlei Pro - Treino Tático",
              modalityName: "Futevôlei",
              professorName: "Rodrigo Faro",
              date: todayStr,
              startTime: "17:00:00",
              endTime: "18:00:00",
              status: "Aberta",
              maxCapacity: 12,
              confirmedCount: 8,
              waitlistCount: 0,
              allowTrial: true,
              releaseAt: "2026-01-01T00:00:00Z",
              minLevel: "iniciante",
              publicGender: "Mixed",
              waitlistTimeoutMinutes: 10,
              subscriptionStatus: null,
            },
            {
              id: "sc-2",
              aulaId: "a-2",
              aulaName: "Muay Thai - Sparring & Combate",
              modalityName: "Muay Thai",
              professorName: "Anderson Silva",
              date: todayStr,
              startTime: "18:30:00",
              endTime: "19:30:00",
              status: "Aberta",
              maxCapacity: 16,
              confirmedCount: 14,
              waitlistCount: 0,
              allowTrial: true,
              releaseAt: "2026-01-01T00:00:00Z",
              minLevel: "intermediario",
              publicGender: "Mixed",
              waitlistTimeoutMinutes: 10,
              subscriptionStatus: null,
            },
            {
              id: "sc-3",
              aulaId: "a-3",
              aulaName: "Jiu-Jitsu - No-Gi & Finalizações",
              modalityName: "Jiu-Jitsu",
              professorName: "Renzo Gracie",
              date: todayStr,
              startTime: "20:00:00",
              endTime: "21:00:00",
              status: "Aberta",
              maxCapacity: 20,
              confirmedCount: 11,
              waitlistCount: 0,
              allowTrial: true,
              releaseAt: "2026-01-01T00:00:00Z",
              minLevel: "avancado",
              publicGender: "Mixed",
              waitlistTimeoutMinutes: 10,
              subscriptionStatus: null,
            },
          ],
          page: 1,
          pageSize: 20,
          totalCount: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      }

      if (p.includes("/scheduling/modalidades") || p.includes("/categories")) {
        return fulfill({
          items: [
            { id: "m-1", name: "Futevôlei", isActive: true },
            { id: "m-2", name: "Muay Thai", isActive: true },
            { id: "m-3", name: "Jiu-Jitsu", isActive: true },
            { id: "m-4", name: "CrossFit", isActive: true },
          ],
        });
      }

      if (p.includes("/plans/current")) {
        return fulfill({
          contratoId: "ct-100",
          planoName: "Combat Ilimitado",
          startDate: "2026-10-01",
          endDate: "2027-10-01",
          status: "Ativo",
          maxClassesPerMonth: 480,
          classesUsedThisMonth: 18,
          classesRemainingThisMonth: 462,
          modalitiesPermitted: ["Futevôlei", "Muay Thai", "Jiu-Jitsu", "CrossFit"],
          autoRenew: true,
        });
      }

      if (p.includes("/payments/my")) {
        return fulfill({
          items: [
            {
              id: "p-01",
              alunoName: "Lucas Fernandes",
              description: "Mensalidade · Outubro",
              amount: 249.9,
              dueDate: "2026-10-06",
              status: "Pendente",
              type: "Mensalidade",
            },
            {
              id: "p-02",
              alunoName: "Lucas Fernandes",
              description: "Mensalidade · Setembro",
              amount: 249.9,
              dueDate: "2026-09-06",
              status: "Pago",
              type: "Mensalidade",
            },
            {
              id: "p-03",
              alunoName: "Lucas Fernandes",
              description: "Mensalidade · Agosto",
              amount: 249.9,
              dueDate: "2026-08-06",
              status: "Pago",
              type: "Mensalidade",
            },
            {
              id: "p-04",
              alunoName: "Lucas Fernandes",
              description: "Taxa de Matrícula e Adesão",
              amount: 80.0,
              dueDate: "2026-07-15",
              status: "Pago",
              type: "Matrícula",
            },
          ],
          page: 1,
          pageSize: 10,
          totalCount: 4,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      }

      if (p.includes("/membership/planos")) {
        return fulfill({
          items: [
            {
              id: "plano-1",
              name: "Combat Ilimitado",
              description: "Acesso total a todas as modalidades e horários.",
              price: 249.9,
              durationDays: 30,
              maxClassesPerWeek: null,
              isActive: true,
            },
            {
              id: "plano-2",
              name: "Plano Trimestral",
              description: "3 meses de treino com 15% de desconto.",
              price: 219.9,
              durationDays: 90,
              maxClassesPerWeek: null,
              isActive: true,
            },
          ],
        });
      }

      if (p.includes("/scheduling/my-history") || p.includes("/history")) {
        return fulfill({
          items: [
            {
              bookingId: "h-1",
              bookingStatus: "CheckedIn",
              ocorrenciaId: "oc-1",
              ocorrenciaDate: "2026-10-06T18:30:00Z",
              startTime: "18:30:00",
              endTime: "19:30:00",
              aulaName: "Futevôlei - Treino Tático",
              modalityName: "Futevôlei",
              professorName: "Camila Nunes",
              checkedInAtUtc: "2026-10-06T18:25:00Z",
            },
            {
              bookingId: "h-2",
              bookingStatus: "CheckedIn",
              ocorrenciaId: "oc-2",
              ocorrenciaDate: "2026-10-05T19:00:00Z",
              startTime: "19:00:00",
              endTime: "20:00:00",
              aulaName: "Muay Thai - Sparring & Combate",
              modalityName: "Muay Thai",
              professorName: "Anderson Silva",
              checkedInAtUtc: "2026-10-05T18:55:00Z",
            },
            {
              bookingId: "h-3",
              bookingStatus: "Confirmado",
              ocorrenciaId: "oc-3",
              ocorrenciaDate: "2026-10-07T20:00:00Z",
              startTime: "20:00:00",
              endTime: "21:00:00",
              aulaName: "Jiu-Jitsu - No-Gi & Passagem",
              modalityName: "Jiu-Jitsu",
              professorName: "Renzo Gracie",
              checkedInAtUtc: null,
            },
          ],
          total: 3,
          page: 1,
          pageSize: 20,
          totalCount: 3,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      }

      if (p.includes("/checkin/my-status") || p.includes("/monthly-schedule")) {
        return fulfill({
          totalPresencas: 24,
          totalFaltas: 1,
          checkInsRemainingThisMonth: null,
          totalUsedThisMonth: 24,
          availableForSchedulingThisMonth: null,
          modalityId: null,
        });
      }

      return fulfill({ items: [], data: [] });
    });

    // 1. Abre a tela inicial e aguarda carregar a interface do Aluno
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const tabInicio = page.getByTestId("tab-index");
    await expect(tabInicio).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1000);

    // Captura 1: Home
    await page.screenshot({
      path: path.join(RAW_DIR, "screen_home.png"),
      fullPage: false,
    });

    // Captura 2: Agendar
    const tabSchedule = page.getByTestId("tab-schedule");
    await tabSchedule.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(RAW_DIR, "screen_schedule.png"),
      fullPage: false,
    });

    // Captura 3: Planos e Carteira
    const tabPlans = page.getByTestId("tab-paymentPlans");
    await tabPlans.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(RAW_DIR, "screen_plans.png"),
      fullPage: false,
    });

    // Captura 4: Histórico
    const tabHistory = page.getByTestId("tab-history");
    await tabHistory.click();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(RAW_DIR, "screen_history.png"),
      fullPage: false,
    });
  });
});
