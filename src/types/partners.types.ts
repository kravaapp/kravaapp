export type TenantPartnerType = {
  id: string;
  ctId: string;
  name: string;
  monthlyCheckInLimit: number;
  repasse: number;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string | null;
};

export type CreateTenantPartnerType = {
  name: string;
  monthlyCheckInLimit?: number;
  repasse?: number;
  isActive?: boolean;
};

export type UpdateTenantPartnerType = {
  name: string;
  monthlyCheckInLimit: number;
  repasse: number;
  isActive: boolean;
};

export type MyPartnerRequestType = {
  id: string | null;
  partner: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string | null;
  createdAtUtc?: string | null;
};

/** Acesso ativo via parceiro: limite do mês e check-ins feitos só pelo parceiro. */
export type PartnerAccessType = {
  partner: string;
  since: string | null;
  monthlyLimit: number | null;
  usedThisMonth: number;
  futureBookings: number;
};

/** Lista de acessos via parceiro; qualquer formato diferente (API antiga, resposta vazia) conta como sem vínculo. */
export const parsePartnerAccesses = (data: unknown): PartnerAccessType[] =>
  Array.isArray(data) ? data.filter((item): item is PartnerAccessType => !!item?.partner) : [];
