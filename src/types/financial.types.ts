import { PaginatedType } from "./schedules.types";

export type FinancialSummaryBlockType = { count: number; avgPrice: number; total: number };
export type FinancialSummaryType = {
  monthly: FinancialSummaryBlockType;
  gympass: FinancialSummaryBlockType;
  totalpass: FinancialSummaryBlockType;
  avulso: FinancialSummaryBlockType;
  partner: FinancialSummaryBlockType;
  grandTotal: number;
};
export type ContractType = {
  id: string; alunoId: string; alunoName: string | null; planoId: string;
  planoName: string | null; startDate: string; endDate: string; status: string | null;
  autoRenew: boolean; effectivePrice: number; priceOverride: number | null;
  discountPct: number | null; notes: string | null;
};
export type PaginatedContracts = PaginatedType & { items: ContractType[] | null };
export type PlanType = {
  id: string; name: string | null; description: string | null; price: number;
  durationDays: number; maxClassesPerWeek: number | null; maxClassesPerDay: number | null;
  allowsAllModalidades: boolean; isActive: boolean; modalidadeIds: string[] | null;
};
export type PaginatedPlans = PaginatedType & { items: PlanType[] | null };
export type TenantSettingsType = {
  name: string | null; slug: string | null; logoUrl: string | null;
  address: string | null; contact: string | null; gympassRepasse: number;
  totalpassRepasse: number; waitlistTimeoutMinutes: number;
  cancellationTimeoutMinutes: number; noShowPenaltyFee: number;
  partnerCheckInLimit: number;
  churnReengageMessage?: string | null;
  saasStatus: string | null; saasPlanName: string | null; nextBillingAt: string | null;
};
export type UpdateTenantSettingsType = Pick<TenantSettingsType,
  "name" | "slug" | "logoUrl" | "address" | "contact" | "gympassRepasse" |
  "totalpassRepasse" | "waitlistTimeoutMinutes" | "cancellationTimeoutMinutes" |
  "noShowPenaltyFee" | "partnerCheckInLimit"> & { churnReengageMessage?: string | null };
