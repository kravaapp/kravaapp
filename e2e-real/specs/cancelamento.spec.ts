import { api, bookViaApi, createClassViaApi, login } from "../support/api";
import { classSlot } from "../support/clock";
import { lit, sql } from "../support/db";
import { seedCt } from "../support/seed";
import { expect, expectNotification, test } from "../support/test";

type CurrentPlan = { classesUsedThisWeek?: number };

/**
 * Cancelamento da aula pelo dono com uma reserva já em Faltou: foi o erro 500 de 23/10/2026
 * ("Booking já cancelado ou marcado como falta"). Os alunos são avisados e o saldo do plano volta.
 */
test("dono cancela a aula com uma falta já marcada e os alunos são avisados", async ({ openAs }) => {
  const slot = classSlot(40);
  test.skip(!slot, "Perto da meia-noite a aula não cabe mais no dia.");
  const ct = seedCt({ students: ["Hugo", "Iris"] });
  const [hugo, iris] = ct.students;
  const aulaName = `Cancelada E2E ${slot!.start}`;

  const ownerToken = await login(ct.owner);
  const ocorrenciaId = await createClassViaApi(ownerToken, ct, slot!, aulaName, 10);
  const hugoToken = await login(hugo);
  await bookViaApi(hugoToken, ocorrenciaId);
  const irisBooking = await bookViaApi(await login(iris), ocorrenciaId);
  // A falta da Iris já está marcada (pela chamada ou pelo AntiGhostJob) quando o dono cancela.
  sql(`UPDATE scheduling.bookings SET status = 'Faltou' WHERE id = ${lit(irisBooking.bookingId)};`);
  expect((await api<CurrentPlan>(hugoToken, "GET", "/plans/current")).classesUsedThisWeek).toBe(1);

  // 1. Dono abre a aula na grade (o card mostra a modalidade e o horário) e cancela com motivo.
  const owner = await openAs(ownerToken, "/(admin)/classes");
  await owner.getByText(slot!.start, { exact: true }).first().click();
  await owner.getByText("Cancelar aula", { exact: true }).click();
  await owner.getByPlaceholder("Ex: Chuva, professor indisposto...").fill("Chuva forte");
  await owner.getByText("Confirmar cancelamento", { exact: true }).click();
  await expect(owner.getByText("Aula cancelada com sucesso!", { exact: true })).toBeVisible();
  await expect(owner.getByText("Cancelada", { exact: true })).toBeVisible();
  await expect(owner.getByText("0 / 10")).toBeVisible();

  // 2. Hugo é avisado, vê a aula cancelada na agenda e a reserva não conta mais no plano.
  const student = await openAs(hugoToken, "/(user)/schedule");
  await expectNotification(student, "Aula cancelada", new RegExp(`${aulaName} .* Motivo: Chuva forte`));
  await expect(student.getByText("Cancelada", { exact: true })).toBeVisible();
  expect((await api<CurrentPlan>(hugoToken, "GET", "/plans/current")).classesUsedThisWeek).toBe(0);
});
