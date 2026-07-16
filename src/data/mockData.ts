import { BadgeStatus } from "@/components/StatusBadge";

export type AulaHoje = {
  id: string;
  horario: string;
  modalidade: "Futevôlei" | "Funcional";
  professor: string;
  confirmados: number;
  capacidade: number;
  espera: number;
  status: Extract<BadgeStatus, "agendada" | "em andamento" | "encerrada">;
};

export type Nivel = "Iniciante" | "Intermediário" | "Avançado" | "Elite";

export type Aluno = {
  id: string;
  nome: string;
  modalidades: string[];
  nivel: Nivel;
};

// Mock enquanto a API do professor não existe: identifica quais aulas são do professor logado.
export const PROFESSOR_ATUAL = "Ricardo";

export const alunos: Aluno[] = [
  { id: "a1", nome: "Carlos Mendes", modalidades: ["Futevôlei"], nivel: "Intermediário" },
  { id: "a2", nome: "Ana Beatriz Lima", modalidades: ["Futevôlei"], nivel: "Iniciante" },
  { id: "a3", nome: "Rafael Santos", modalidades: ["Futevôlei"], nivel: "Avançado" },
  { id: "a4", nome: "Gabriel Rocha", modalidades: ["Futevôlei", "Funcional"], nivel: "Iniciante" },
  { id: "a5", nome: "Isabela Dias", modalidades: ["Futevôlei"], nivel: "Intermediário" },
  { id: "a6", nome: "Rodrigo Nunes", modalidades: ["Funcional"], nivel: "Avançado" },
  { id: "a7", nome: "Mariana Castro", modalidades: ["Futevôlei"], nivel: "Elite" },
  { id: "a8", nome: "Vinicius Barros", modalidades: ["Futevôlei"], nivel: "Iniciante" },
];

export const aulasHoje: AulaHoje[] = [
  {
    id: "1",
    horario: "07:00",
    modalidade: "Futevôlei",
    professor: "Ricardo",
    confirmados: 8,
    capacidade: 12,
    espera: 0,
    status: "encerrada",
  },
  {
    id: "2",
    horario: "09:00",
    modalidade: "Funcional",
    professor: "Marina",
    confirmados: 6,
    capacidade: 10,
    espera: 0,
    status: "encerrada",
  },
  {
    id: "3",
    horario: "17:00",
    modalidade: "Futevôlei",
    professor: "Ricardo",
    confirmados: 10,
    capacidade: 14,
    espera: 1,
    status: "em andamento",
  },
  {
    id: "4",
    horario: "19:00",
    modalidade: "Futevôlei",
    professor: "Ricardo",
    confirmados: 11,
    capacidade: 14,
    espera: 3,
    status: "agendada",
  },
  {
    id: "5",
    horario: "20:30",
    modalidade: "Funcional",
    professor: "Marina",
    confirmados: 5,
    capacidade: 10,
    espera: 0,
    status: "agendada",
  },
];
