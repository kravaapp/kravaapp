import { BadgeStatus } from "@/components/StatusBadge";

export type Modalidade = "Futevôlei" | "Funcional";

export type AulaHoje = {
  id: string;
  horario: string;
  modalidade: Modalidade;
  professor: string;
  confirmados: number;
  capacidade: number;
  espera: number;
  status: Extract<BadgeStatus, "agendada" | "em andamento" | "encerrada">;
};

export type Nivel = "Iniciante" | "Intermediário" | "Avançado" | "Elite";

export const NIVEIS: Nivel[] = ["Iniciante", "Intermediário", "Avançado", "Elite"];

export type TipoAluno = "Mensalista" | "Gympass" | "Totalpass" | "Avulso";

export type Aluno = {
  id: string;
  nome: string;
  modalidades: Modalidade[];
  nivel: Nivel;
  tipo: TipoAluno;
  presencasMes: number;
};

export type PresencaStatus = "Presente" | "Ausente" | "Falta não cancelada";

export type HistoricoPresenca = {
  id: string;
  data: string;
  horario: string;
  modalidade: Modalidade;
  status: PresencaStatus;
};

// Mock enquanto a API do professor não existe: identifica quais aulas são do professor logado.
export const PROFESSOR_ATUAL = "Ricardo";

export const alunos: Aluno[] = [
  { id: "a1", nome: "Carlos Mendes", modalidades: ["Futevôlei"], nivel: "Intermediário", tipo: "Mensalista", presencasMes: 9 },
  { id: "a2", nome: "Ana Beatriz Lima", modalidades: ["Futevôlei"], nivel: "Iniciante", tipo: "Gympass", presencasMes: 6 },
  { id: "a3", nome: "Rafael Santos", modalidades: ["Futevôlei"], nivel: "Avançado", tipo: "Mensalista", presencasMes: 12 },
  { id: "a4", nome: "Gabriel Rocha", modalidades: ["Futevôlei", "Funcional"], nivel: "Iniciante", tipo: "Totalpass", presencasMes: 4 },
  { id: "a5", nome: "Isabela Dias", modalidades: ["Futevôlei"], nivel: "Intermediário", tipo: "Mensalista", presencasMes: 8 },
  { id: "a6", nome: "Rodrigo Nunes", modalidades: ["Funcional"], nivel: "Avançado", tipo: "Avulso", presencasMes: 3 },
  { id: "a7", nome: "Mariana Castro", modalidades: ["Futevôlei"], nivel: "Elite", tipo: "Mensalista", presencasMes: 14 },
  { id: "a8", nome: "Vinicius Barros", modalidades: ["Futevôlei"], nivel: "Iniciante", tipo: "Gympass", presencasMes: 5 },
];

export const historicoPresencas: HistoricoPresenca[] = [
  { id: "h1", data: "12/07", horario: "19h", modalidade: "Futevôlei", status: "Presente" },
  { id: "h2", data: "10/07", horario: "19h", modalidade: "Futevôlei", status: "Presente" },
  { id: "h3", data: "08/07", horario: "07h", modalidade: "Futevôlei", status: "Falta não cancelada" },
  { id: "h4", data: "05/07", horario: "19h", modalidade: "Futevôlei", status: "Presente" },
  { id: "h5", data: "03/07", horario: "19h", modalidade: "Funcional", status: "Ausente" },
  { id: "h6", data: "01/07", horario: "07h", modalidade: "Futevôlei", status: "Presente" },
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
