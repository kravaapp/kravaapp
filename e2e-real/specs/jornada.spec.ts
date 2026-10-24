import { api, bookViaApi, createClassViaApi, findTodayOccurrence, login } from "../support/api";
import { classSlot } from "../support/clock";
import { seedCt } from "../support/seed";
import { expect, expectNotification, test } from "../support/test";

/**
 * Jornada principal da aula, do dono criando a aula até o professor encerrar a chamada.
 * O CT exige check-in do aluno: o aviso de check-in vem do StudentCheckInJob (roda a cada minuto).
 */
test("dono cria a aula, aluno reserva e faz check-in, professor faz a chamada e encerra", async ({ openAs }) => {
  const slot = classSlot(20);
  test.skip(!slot, "Perto da meia-noite a aula não cabe mais no dia.");
  const ct = seedCt({ students: ["Carla", "Diego"], requireCheckIn: true });
  const [carla, diego] = ct.students;
  const aulaName = `Treino E2E ${slot!.start}`;

  // 1. Dono cria a aula de hoje, com aviso aos alunos ligado (padrão do formulário).
  const ownerToken = await login(ct.owner);
  const owner = await openAs(ownerToken, "/(admin)/classes");
  await owner.getByRole("button", { name: "Nova aula" }).click();
  await owner.getByRole("button", { name: ct.modalidade.name, exact: true }).click();
  await owner.getByRole("button", { name: ct.professor.name, exact: true }).click();
  await owner.getByPlaceholder("Ex.: Treino avançado").fill(aulaName);
  await owner.getByRole("checkbox", { name: slot!.dayLabel, exact: true }).click();
  await owner.getByPlaceholder("18:00").fill(slot!.start.replace(":", ""));
  await owner.getByPlaceholder("19:00").fill(slot!.end.replace(":", ""));
  await owner.getByPlaceholder("14").fill("10");
  await owner.getByRole("button", { name: "Mista", exact: true }).click();
  await owner.getByText("Criar aula", { exact: true }).click();
  await expect(owner.getByText("Aula criada com sucesso!", { exact: true })).toBeVisible();
  // O card da grade mostra a modalidade, o horário e o professor.
  await expect(owner.getByText(slot!.start, { exact: true }).first()).toBeVisible();
  await expect(owner.getByText(ct.professor.name, { exact: true }).first()).toBeVisible();

  // 2. Aluno recebe o aviso da aula nova e reserva pela agenda.
  const student = await openAs(await login(carla), "/(user)/schedule");
  await expectNotification(student, "Aula nova no CT", new RegExp(aulaName));
  await student.getByRole("button", { name: `Reservar aula ${aulaName}` }).click();
  await student.getByText("Confirmar", { exact: true }).click();

  // 3. O check-in já está aberto (abre 4h antes): o job avisa o aluno, que faz o check-in pela agenda.
  await expectNotification(student, "Check-in liberado", new RegExp(`check-in de ${aulaName}`), 120_000);
  await student.getByRole("button", { name: "Fazer check-in" }).click();
  await expect(student.getByText("Check-in feito!", { exact: true })).toBeVisible();

  // Diego também reservou, mas chega sem ter feito o check-in pelo app.
  const ocorrenciaId = await findTodayOccurrence(ownerToken, aulaName);
  await bookViaApi(await login(diego), ocorrenciaId);

  // 4. Professor abre a chamada: o check-in da Carla já conta como presença, o Diego está pendente.
  const teacher = await openAs(await login(ct.professor), "/(teacher)/classes");
  await expect(teacher.getByText(`${aulaName} — `, { exact: false }).first()).toBeVisible();
  await expect(teacher.getByText("2/10 confirmados · 0 na espera")).toBeVisible();
  await expect(teacher.getByText("✓ 1 presentes")).toBeVisible();
  await expect(teacher.getByText("⏳ 1 pendente")).toBeVisible();

  // 5. Diego está na aula: o professor marca a presença dele.
  await teacher.getByRole("button", { name: `Marcar presença de ${diego.name}` }).click();
  await expect(teacher.getByText("✓ 2 presentes")).toBeVisible();

  // 6. Encerra a chamada e confere que ela ficou salva com os dois presentes.
  await teacher.getByText("Encerrar chamada", { exact: true }).click();
  await teacher.getByText("Encerrar e salvar", { exact: true }).click();
  await expect(teacher.getByText("Chamada encerrada", { exact: true }).first()).toBeVisible();
  // Sem aula aberta, o início do professor mostra a aula concluída; a chamada salva tem os dois presentes.
  await teacher.goto("/(teacher)");
  await expect(teacher.getByText("Concluída", { exact: true })).toBeVisible();
  await expect(teacher.getByText("2/10 confirmados")).toBeVisible();
  const attendance = await api<{ presentCount: number }>(
    await login(ct.professor), "GET", `/scheduling/ocorrencias/${ocorrenciaId}/attendance`);
  expect(attendance.presentCount).toBe(2);
});

/** O professor adiciona à aula um aluno do CT que chegou sem reserva, marca a presença e ela fica salva. */
test("professor adiciona à aula um aluno do CT que chegou sem reserva", async ({ openAs }) => {
  const slot = classSlot(25);
  test.skip(!slot, "Perto da meia-noite a aula não cabe mais no dia.");
  const ct = seedCt({ students: ["Joana", "Kleber"] });
  const [joana, kleber] = ct.students;
  const aulaName = `Avulso E2E ${slot!.start}`;
  const ocorrenciaId = await createClassViaApi(await login(ct.owner), ct, slot!, aulaName, 10);
  await bookViaApi(await login(joana), ocorrenciaId);

  const teacher = await openAs(await login(ct.professor), "/(teacher)/classes");
  await expect(teacher.getByText(`${aulaName} — `, { exact: false }).first()).toBeVisible();
  await teacher.getByText("Adicionar", { exact: true }).click();
  await teacher.getByPlaceholder("Buscar aluno do local...").fill(kleber.name);
  await expect(teacher.getByText(kleber.name, { exact: true }), "a busca deve listar os alunos do CT").toBeVisible();
  await teacher.getByRole("button", { name: `Adicionar ${kleber.name} à aula` }).click();
  await expect(teacher.getByText(`${kleber.name} adicionado à aula ✓`)).toBeVisible();
  await teacher.getByText("Chamada", { exact: true }).click();
  await teacher.getByRole("button", { name: `Marcar presença de ${kleber.name}` }).click();

  await expect(teacher.getByText("✓ 1 presentes")).toBeVisible();

  // A presença tem que sobreviver a recarregar a tela: o aluno adicionado precisa existir no servidor.
  // Recarregado, o app abre o início do professor; a chamada é aberta de lá.
  await teacher.reload();
  await expect(teacher.getByText("2/10 confirmados")).toBeVisible();
  await teacher.getByText("Abrir chamada", { exact: true }).first().click();
  await expect(teacher.getByRole("button", { name: `Marcar presença de ${kleber.name}` })).toBeVisible();
  await expect(teacher.getByText("✓ 1 presentes")).toBeVisible();
  await expect(teacher.getByText("⏳ 1 pendente")).toBeVisible();
});
