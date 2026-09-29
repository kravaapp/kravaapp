import {
  ActivePaymentGateway,
  PayInvoiceRequest,
  PayInvoiceResponse,
  PaginatedPayments,
  PaymentGateway,
  PaymentGatewayConfiguration,
  UpdatePaymentGateway,
} from "@/types/payments.types";
import { PAYMENT_GATEWAYS } from "@/utils/paymentGateways";
import { payInvoiceSchema } from "@/schemas/payments.schemas";
import z from "zod";
import api from "./client";

export class PaymentsRoutes {
  async getActiveGateway(): Promise<ActivePaymentGateway> {
    const { gateway, publicKey } = await api.get("/payments/gateways/active").json<ActivePaymentGateway>();
    return { gateway, publicKey };
  }

  async payInvoice(id: string, request: PayInvoiceRequest): Promise<PayInvoiceResponse> {
    const invoiceId = z.uuid().parse(id);
    const body = payInvoiceSchema.parse(request);
    return api.post(`/payments/${invoiceId}/pay`, { json: body, retry: 0 }).json<PayInvoiceResponse>();
  }

  async getMyPayments(page?: number): Promise<PaginatedPayments> {
    return api.get("/payments/my", page === undefined ? {} : { searchParams: { page } })
      .json<PaginatedPayments>();
  }

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
