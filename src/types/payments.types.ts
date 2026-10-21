export type PaymentGateway = "mercadopago" | "abacatepay";

export type ActivePaymentGateway = {
  gateway: PaymentGateway;
  publicKey: string | null;
};

export type PaymentCustomer = {
  customerName: string;
  customerEmail: string;
  customerDocument: string;
};

export type CardPaymentFields = {
  cardToken: string;
  installments: number;
  cardPaymentMethodId: "master" | "visa" | "elo" | "amex" | "hipercard";
};

export type PayInvoiceRequest = PaymentCustomer & (
  | { method: "Pix" }
  | ({ method: "CreditCard" } & CardPaymentFields)
);

export type PayInvoiceResponse = {
  cobrancaId: string;
  status: string;
  paymentUrl?: string | null;
  pixCopyPaste?: string | null;
  pixQrCodeBase64?: string | null;
  gatewayPaymentId?: string | null;
};

export type Payment = {
  id: string;
  alunoName?: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  type: string;
  paidAtUtc?: string | null;
  paymentMethod?: string | null;
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
  apiKey?: string;
  publicKey?: string;
  webhookSecret?: string;
  isActive: boolean;
};
