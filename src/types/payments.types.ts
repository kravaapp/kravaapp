export type PaymentGateway = "mercadopago" | "abacatepay";

export type Payment = {
  id: string;
  alunoName: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  type: string;
};

export type PaginatedPayments = {
  items: Payment[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

/** Somente metadados públicos; credenciais nunca fazem parte da listagem. */
export type PaymentGatewayConfiguration = {
  gateway: PaymentGateway;
  isActive: boolean;
  createdAtUtc: string | null;
};

export type UpdatePaymentGateway = {
  apiKey: string;
  publicKey?: string;
  webhookSecret?: string;
  isActive: boolean;
};
