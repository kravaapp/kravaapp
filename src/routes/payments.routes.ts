import {
  ActivePaymentGateway,
  PayInvoiceRequest,
  PayInvoiceResponse,
  PaginatedPayments,
  Payment,
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
    const payload = {
      ...body,
      paymentMethod: body.method,
      PaymentMethod: body.method,
    };
    return api.post(`/payments/${invoiceId}/pay`, { json: payload, retry: 0 }).json<PayInvoiceResponse>();
  }

  async getMyPayments(page?: number): Promise<PaginatedPayments> {
    return api.get("/payments/my", page === undefined ? {} : { searchParams: { page } })
      .json<PaginatedPayments>();
  }

  async getMyInvoice(id: string, preferredPage?: number): Promise<Payment | null> {
    const invoiceId = z.uuid().parse(id);
    // A cobrança recém-criada pode estar em qualquer página da listagem do aluno.
    if (preferredPage !== undefined && preferredPage !== 1) {
      const preferred = await this.getMyPayments(preferredPage);
      const invoice = preferred.items.find((item) => item.id === invoiceId);
      if (invoice) return invoice;
    }
    let page = 1;
    while (true) {
      const result = await this.getMyPayments(page);
      const invoice = result.items.find((item) => item.id === invoiceId);
      if (invoice) return invoice;
      if (!result.hasNextPage) return null;
      page++;
    }
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
