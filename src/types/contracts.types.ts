export type SubscribeContractType = {
  planoId: string;
  cancelExistingActive: boolean;
  immediate: boolean;
};

export type CreateContractType = {
  alunoId: string;
  planoId: string;
  startDate: string;
  cancelExistingActive?: boolean;
  immediate?: boolean;
  endDate?: string | null;
  autoRenew?: boolean;
  priceOverride?: number | null;
  discountPct?: number | null;
  notes?: string | null;
  isPaidLocally?: boolean;
};
