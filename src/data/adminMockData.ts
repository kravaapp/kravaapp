export type AdminAudience = "Mista" | "Masculina" | "Feminina";
export type AdminModality = "Futevôlei" | "Funcional";

export const adminClasses = [
  { id: "1", time: "08:00", modality: "Funcional" as const, teacher: "Marina Costa", confirmed: 9, capacity: 14, waitlist: 0, status: "Encerrada", audience: "Mista" as const },
  { id: "2", time: "18:00", modality: "Futevôlei" as const, teacher: "Ricardo Andrade", confirmed: 12, capacity: 14, waitlist: 0, status: "Agendada", audience: "Masculina" as const },
  { id: "3", time: "19:00", modality: "Futevôlei" as const, teacher: "Ricardo Andrade", confirmed: 14, capacity: 14, waitlist: 3, status: "Em andamento", audience: "Mista" as const },
  { id: "4", time: "20:00", modality: "Funcional" as const, teacher: "Marina Costa", confirmed: 10, capacity: 14, waitlist: 1, status: "Agendada", audience: "Feminina" as const },
];

export const attendanceByDay = [
  { day: "Seg", value: 32 }, { day: "Ter", value: 39 }, { day: "Qua", value: 35 },
  { day: "Qui", value: 44 }, { day: "Sex", value: 37 }, { day: "Sáb", value: 28 },
];

export const adminRequests = [
  { id: "1", student: "Ana Beatriz Lima", partner: "Gympass", date: "Hoje, 10:42" },
  { id: "2", student: "Gabriel Rocha", partner: "Totalpass", date: "Ontem, 18:15" },
];

export const atRiskStudents = [
  { id: "1", name: "Carlos Mendes", absences: 3 },
  { id: "2", name: "Vinicius Barros", absences: 2 },
];

export const confirmedStudents = ["Carlos Mendes", "Ana Beatriz Lima", "Rafael Santos", "Julia Pereira", "Marcos Tavares", "Fernanda Costa", "Pedro Alves", "Beatriz Rocha", "Lucas Ferreira", "Camila Souza", "Diego Martins", "Mariana Castro", "Isabela Dias", "Rodrigo Nunes"];
export const waitlistStudents = ["Larissa Nunes", "Thiago Lima", "Paula Mendes"];

export const adminContracts = [
  { id: "1", student: "Carlos Mendes", type: "Mensalista", modalities: ["Futevôlei"], plan: "Plano mensal", value: "R$ 140", due: "10/09", status: "Pago" },
  { id: "2", student: "Ana Beatriz Lima", type: "Gympass", modalities: ["Futevôlei"], plan: "Gympass", value: "R$ 35", due: "—", status: "Ativo" },
  { id: "3", student: "Gabriel Rocha", type: "Totalpass", modalities: ["Futevôlei", "Funcional"], plan: "Totalpass", value: "R$ 40", due: "—", status: "Ativo" },
  { id: "4", student: "Isabela Dias", type: "Mensalista", modalities: ["Futevôlei"], plan: "Plano mensal", value: "R$ 140", due: "05/09", status: "Vencido" },
  { id: "5", student: "Rodrigo Nunes", type: "Mensalista", modalities: ["Funcional"], plan: "Plano mensal", value: "R$ 110", due: "12/09", status: "Pendente" },
];

export const bookingRules = [
  { id: "1", description: "Liberar agendamentos 7 dias antes da aula" },
  { id: "2", description: "Encerrar agendamentos 30 minutos antes" },
];
