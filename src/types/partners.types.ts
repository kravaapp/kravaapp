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

/** A API responde corpo vazio ou "null" sem vínculo; qualquer outro formato também conta como sem vínculo. */
export const parsePartnerAccess = (text: string): PartnerAccessType | null => {
  const parsed = !text || text.trim() === "null" ? null : (JSON.parse(text) as PartnerAccessType);
  return parsed?.partner ? parsed : null;
};
