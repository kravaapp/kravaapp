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

// Mock enquanto a API do professor não existe: identifica quais aulas são do professor logado.
export const PROFESSOR_ATUAL = "Ricardo";

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
