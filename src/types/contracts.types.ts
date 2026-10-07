export type SubscribeContractType = {
  planoId: string;
  cancelExistingActive?: boolean;
};

/** Cobrança pendente retornada pelo subscribe; ainda não existe um novo contrato. */
export type SubscriptionInvoice = {
  cobrancaId: string;
  alunoId: string;
  planoId: string;
  planoName: string;
  amount: number;
  dueDate: string;
  status: "Pendente";
  description: string;
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
