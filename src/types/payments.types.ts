export type PaymentGateway = "mercadopago" | "abacatepay";

/** Somente metadados públicos; credenciais nunca fazem parte da listagem. */
export type PaymentGatewayConfiguration = {
  gateway: PaymentGateway;
  isActive: boolean;
  createdAtUtc: string | null;
};

export type UpdatePaymentGateway = {
  apiKey: string;
  webhookSecret?: string;
  isActive: boolean;
};
