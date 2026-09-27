import {
  PaymentGateway,
  PaymentGatewayConfiguration,
  UpdatePaymentGateway,
} from "@/types/payments.types";
import { PAYMENT_GATEWAYS } from "@/utils/paymentGateways";
import api from "./client";

export class PaymentsRoutes {
  async getGateways(): Promise<PaymentGatewayConfiguration[]> {
    const result = await api.get("/payments/gateways").json<PaymentGatewayConfiguration[]>();
    // Seleciona apenas os metadados, mesmo se a API passar a enviar outros campos.
    return result
      .filter((item) => PAYMENT_GATEWAYS.some(({ gateway }) => gateway === item.gateway))
      .map(({ gateway, isActive, createdAtUtc }) => ({
        gateway,
        isActive,
        createdAtUtc: createdAtUtc ?? null,
      }));
  }

  async updateGateway(gateway: PaymentGateway, configuration: UpdatePaymentGateway) {
    // Desabilita retries de PUT para não repetir uma troca de gateway automaticamente.
    await api.put(`/payments/gateways/${gateway}`, { json: configuration, retry: 0 });
  }
}
