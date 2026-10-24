import { bookViaApi, createClassViaApi, login } from "../support/api";
import { classSlot } from "../support/clock";
import { seedCt } from "../support/seed";
import { expect, expectNotification, test } from "../support/test";

/**
 * Fila de espera: com a aula lotada o aluno entra na fila, e a falta marcada pelo professor o coloca na aula.
 * A criação da aula e as duas primeiras reservas são preparação (a jornada principal já cobre essas telas).
 */
test("aluno entra na fila da aula lotada e sobe quando o professor marca falta", async ({ openAs }) => {
  const slot = classSlot(30);
  test.skip(!slot, "Perto da meia-noite a aula não cabe mais no dia.");
  const ct = seedCt({ students: ["Eva", "Felipe", "Gabi"] });
  const [eva, felipe, gabi] = ct.students;
  const aulaName = `Fila E2E ${slot!.start}`;

  const ocorrenciaId = await createClassViaApi(await login(ct.owner), ct, slot!, aulaName, 2);
  await bookViaApi(await login(eva), ocorrenciaId);
  await bookViaApi(await login(felipe), ocorrenciaId);

  // 1. Aula lotada: Gabi entra na lista de espera pela agenda.
  const student = await openAs(await login(gabi), "/(user)/schedule");
  await expect(student.getByText("LOTADA · ESPERA")).toBeVisible();
  await student.getByRole("button", { name: `Entrar na lista de espera para ${aulaName}` }).click();
  await student.getByText("Confirmar", { exact: true }).click();
  await expect(student.getByText("Na Fila", { exact: true })).toBeVisible();

  // 2. Professor vê a fila e marca a falta do Felipe: a Gabi entra direto na chamada.
  const teacher = await openAs(await login(ct.professor), "/(teacher)/classes");
  await expect(teacher.getByText("Espera (1)", { exact: true })).toBeVisible();
  await expect(teacher.getByText("2/2 confirmados · 1 na espera")).toBeVisible();
  await teacher.getByRole("button", { name: `Marcar falta de ${felipe.name}` }).click();
  await expect(teacher.getByText(`${gabi.name} saiu da lista de espera e entrou na chamada.`)).toBeVisible();
  await expect(teacher.getByRole("button", { name: `Marcar presença de ${gabi.name}` })).toBeVisible();
  await expect(teacher.getByText("Espera (0)", { exact: true })).toBeVisible();

  // 3. Gabi é avisada e a reserva dela aparece confirmada.
  await expectNotification(student, "Vaga liberada", new RegExp(`promovido da lista de espera para a aula de ${aulaName}`));
  await student.reload();
  await expect(student.getByText("Agendado ✓", { exact: true })).toBeVisible();
});
