import { randomUUID } from "node:crypto";
import { lit, sql } from "./db";

export const PASSWORD = "Krava@e2e1";

export type SeededUser = { id: string; name: string; email: string };

export type SeededCt = {
  ctId: string;
  ctName: string;
  modalidade: { id: string; name: string };
  owner: SeededUser;
  professor: SeededUser;
  students: SeededUser[];
};

type SeedOptions = {
  /** Nomes dos alunos com plano ativo; cada um vira um usuário Aluno do CT. */
  students: string[];
  /** Liga o check-in do aluno. Com ele, o StudentCheckInJob cancela quem não fizer check-in no prazo. */
  requireCheckIn?: boolean;
};

/**
 * Cria um CT novo com dono, professor, modalidade, um plano e alunos com contrato ativo.
 * Tudo com IDs e e-mails próprios: cenários e execuções não enxergam os dados uns dos outros.
 */
export function seedCt({ students, requireCheckIn = false }: SeedOptions): SeededCt {
  const run = randomUUID().slice(0, 8);
  const user = (name: string, role: string): SeededUser => ({
    id: randomUUID(),
    name,
    email: `${role}.${name.toLowerCase().replace(/\W+/g, "")}.${run}@e2e.krava.test`,
  });

  const ct: SeededCt = {
    ctId: randomUUID(),
    ctName: `CT E2E ${run}`,
    modalidade: { id: randomUUID(), name: "Futevôlei" },
    owner: user("Dona Ana", "dono"),
    professor: user("Bruno Lima", "prof"),
    students: students.map((name) => user(name, "aluno")),
  };
  const planoId = randomUUID();

  const insertUser = (u: SeededUser, role: string) => `
    INSERT INTO identity.users (id, name, email, password_hash, is_active, is_super_admin, is_email_confirmed, sex)
    VALUES (${lit(u.id)}, ${lit(u.name)}, ${lit(u.email)}, crypt(${lit(PASSWORD)}, gen_salt('bf', 4)), TRUE, FALSE, TRUE, 'M');
    INSERT INTO identity.user_cts (id, user_id, ct_id, role)
    VALUES (gen_random_uuid(), ${lit(u.id)}, ${lit(ct.ctId)}, ${lit(role)});`;

  const insertStudent = (u: SeededUser) => {
    const alunoId = randomUUID();
    return `${insertUser(u, "Aluno")}
    INSERT INTO membership.alunos (id, ct_id, user_id, status, level, sex)
    VALUES (${lit(alunoId)}, ${lit(ct.ctId)}, ${lit(u.id)}, 'Ativo', 'Iniciante', 'M');
    INSERT INTO membership.contratos (id, ct_id, aluno_id, plano_id, start_date, end_date, status)
    VALUES (gen_random_uuid(), ${lit(ct.ctId)}, ${lit(alunoId)}, ${lit(planoId)}, CURRENT_DATE - 1, CURRENT_DATE + 30, 'Ativo');`;
  };

  sql(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    BEGIN;
    INSERT INTO identity.centros_treinamento
      (id, name, timezone, is_active, require_student_checkin, checkin_opens_minutes, checkin_deadline_minutes)
    VALUES (${lit(ct.ctId)}, ${lit(ct.ctName)}, 'America/Sao_Paulo', TRUE, ${requireCheckIn}, 240, 5);
    ${insertUser(ct.owner, "Admin")}
    ${insertUser(ct.professor, "Professor")}
    INSERT INTO scheduling.modalidades (id, ct_id, name, is_active)
    VALUES (${lit(ct.modalidade.id)}, ${lit(ct.ctId)}, ${lit(ct.modalidade.name)}, TRUE);
    INSERT INTO membership.planos
      (id, ct_id, name, price, duration_days, max_classes_per_week, max_classes_per_day, allows_all_modalidades, is_active, is_recurring)
    VALUES (${lit(planoId)}, ${lit(ct.ctId)}, 'Mensal E2E', 150, 30, NULL, NULL, TRUE, TRUE, FALSE);
    ${ct.students.map(insertStudent).join("\n")}
    COMMIT;
  `);

  return ct;
}
