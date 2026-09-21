export type CreateContractType = {
  alunoId: string;
  planoId: string;
  startDate: string;
  endDate: string | null;
  autoRenew: boolean;
  priceOverride: number | null;
  discountPct: number | null;
  notes: string | null;
  isPaidLocally: boolean;
};
