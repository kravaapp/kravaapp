import {
  PaymentGateway,
  PaymentGatewayConfiguration,
} from "@/types/payments.types";

export const PAYMENT_GATEWAYS = [
  { gateway: "mercadopago", name: "Mercado Pago", credentialLabel: "Access Token / API Key" },
  { gateway: "abacatepay", name: "AbacatePay", credentialLabel: "API Key" },
] as const;

export function updateGatewayStatuses(
  configurations: PaymentGatewayConfiguration[],
  gateway: PaymentGateway,
  isActive: boolean,
): PaymentGatewayConfiguration[] {
  const existing = configurations.find((item) => item.gateway === gateway);
  return [
    ...configurations
      .filter((item) => item.gateway !== gateway)
      .map((item) => ({ ...item, isActive: isActive ? false : item.isActive })),
    { gateway, isActive, createdAtUtc: existing?.createdAtUtc ?? null },
  ];
}

export function gatewayConfigurationDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("pt-BR");
}
