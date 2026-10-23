export type ScheduleType = {
  bookingId: string;
  bookingStatus?: string;
  status?: string;
  ocorrenciaId: string;
  ocorrenciaDate: string;
  aulaId: string;
  aulaName: string;
  startTime: string;
  endTime: string;
  modalityId: string;
  modalityName: string;
  professorId: string;
  professorName: string;
  ctId: string;
  ctName: string;
  waitlistPosition: number | null;
  /** Origem da reserva (App, Gympass, TotalPass...). */
  bookingSource?: string | null;
  /** Quando o CT exige check-in: abertura e prazo (sem check-in até o prazo, a vaga vai para a fila). */
  checkInOpensAt?: string | null;
  checkInDeadlineAt?: string | null;
  minLevel?: string;
  publicGender?: string;
  maxCapacity?: number;
  releaseAt?: string;
  confirmedCount?: number;
}

export type PaginatedType = {
  page: number;
  pageSize: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export type SubscriptionStatusType = 'Confirmado' | 'ListaEspera' | 'WaitlistPending' | 'CheckedIn' | 'Faltou';

export type OccurrenceStatusType = 'Agendada' | 'Em andamento' | 'Encerrada' | 'Concluida' | 'Cancelada';

export type ScheduleOccurrenceType = {
  id: string;
  aulaId: string;
  aulaName: string;
  modalityName: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  maxCapacity: number,
  confirmedCount: number,
  waitlistCount: number,
  allowTrial: boolean,
  releaseAt: string;
  minLevel: string;
  publicGender: string;
  waitlistTimeoutMinutes: number;
  subscriptionStatus: SubscriptionStatusType | null;
  /** Quando a primeira forma de reserva do aluno abre; null quando já há uma aberta. */
  bookingOpensAt?: string | null;
  /** Reserva do aluno nesta aula e, quando o CT exige check-in, abertura e prazo. */
  myBookingId?: string | null;
  checkInOpensAt?: string | null;
  checkInDeadlineAt?: string | null;
}

export type TodayOccurrenceType = {
  id: string;
  aulaId: string;
  aulaName: string;
  modalidadeName: string;
  professorName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: OccurrenceStatusType;
  maxCapacity: number;
  confirmedCount: number;
  waitlistCount: number;
  pendingPayments: number;
  isSubscribed: boolean;
  subscriptionStatus: SubscriptionStatusType | null;
}

export type PaginatedSchedule = PaginatedType & {
  items: ScheduleOccurrenceType[];
}

export type AttendanceFilterStatusType = 'Confirmado' | 'FilaEspera';

/**
 * Status da chamada de cada aluno: `Present` = presença marcada;
 * `Absent` = falta marcada; `Pending` = ainda sem presença nem falta.
 */
export type AttendanceStudentStatusType = 'Pending' | 'Present' | 'Absent' | 'Waitlist';

export type AttendanceStudentType = {
  bookingId: string;
  studentId: string;
  studentName: string;
  photoUrl: string | null;
  isExperimental: boolean;
  status: AttendanceStudentStatusType;
  level: string;
  paymentMethod: string;
  avulsoPending: boolean;
}

export type AttendanceType = {
  presentCount: number;
  absentCount: number;
  pendingCount: number;
  lista: AttendanceStudentType[];
}

export type BookingUserHistoryType = {
  bookingId: string;
  bookingStatus: string;
  ocorrenciaId: string;
  ocorrenciaDate: string;
  startTime: string;
  endTime: string;
  aulaName: string;
  modalityName: string;
  professorName: string;
  checkedInAtUtc: string | null;
  /** "SemCheckIn" quando a vaga foi para a fila por falta de check-in. */
  cancelReason?: string | null;
}

export type PaginatedBookingUserHistory = PaginatedType & {
  items: BookingUserHistoryType[];
}

export type MyMonthlyScheduleType = {
  totalPresencas: number;
  totalFaltas: number;
  checkInsRemainingThisMonth: number | null;
  totalUsedThisMonth: number;
  availableForSchedulingThisMonth: number | null;
  modalityId: string | null;
}

export type AulaType = {
  id: string;
  modalidadeId: string;
  modalidadeName: string | null;
  professorId: string;
  professorName: string | null;
  name: string | null;
  dayOfWeek: number;
  startTime: string | null;
  endTime: string | null;
  maxCapacity: number;
  isActive: boolean;
  allowTrial: boolean;
  minLevel: string | null;
  publicGender: string | null;
  waitlistTimeoutMinutes: number | null;
}

export type PaginatedAulas = PaginatedType & {
  items: AulaType[] | null;
}

export type ModalidadeType = {
  id: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  createdAtUtc: string;
}

export type PaginatedModalidades = PaginatedType & {
  items: ModalidadeType[] | null;
}

export type ProfessorType = {
  userId: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

type AulaFields = {
  modalidadeId: string;
  professorId: string;
  name: string | null;
  startTime: string;
  endTime: string;
  maxCapacity: number;
  allowTrial: boolean;
  minLevel: string | null;
  publicGender: string | null;
  waitlistTimeoutMinutes: number | null;
}

/** Criação em lote ou formato legado, sempre com pelo menos um dia. */
export type CreateAulaType = AulaFields & (
  | { daysOfWeek: number[]; dayOfWeek?: never }
  | { dayOfWeek: number; daysOfWeek?: never }
);

/** A edição permanece individual por registro da grade. */
export type UpdateAulaType = AulaFields & { dayOfWeek: number };

/** Uma forma de reservar a aula: o plano do CT ou um parceiro, com o saldo do período. */
export type BookingOptionType = {
  /** Valor enviado na reserva: "Plan" ou o nome do parceiro. */
  origin: string;
  kind: "Plan" | "Partner";
  label: string;
  used: number;
  limit: number | null;
  period: "week" | "month";
  available: boolean;
  /** Por que a opção está indisponível (esgotada, modalidade fora do plano). */
  reason: string | null;
  /** Quando a reserva por esta origem abre (janela do CT); null quando já está aberta. */
  opensAt?: string | null;
};

export type BookingOptionsType = {
  options: BookingOptionType[];
  /** Origem já marcada; null quando o aluno precisa escolher entre os parceiros. */
  defaultOrigin: string | null;
  /** Hora do servidor, para corrigir o relógio do aparelho na contagem. */
  serverNowUtc?: string | null;
};
