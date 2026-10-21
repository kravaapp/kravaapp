import {
  ActivePaymentGateway,
  PayInvoiceRequest,
  PayInvoiceResponse,
  PaginatedPayments,
  PaginatedStudentInvoices,
  Payment,
  PaymentGateway,
  PaymentGatewayConfiguration,
  RefundInvoiceRequest,
  RefundInvoiceResult,
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

  async getStudentInvoices(alunoId: string, page = 1, pageSize = 50): Promise<PaginatedStudentInvoices> {
    const studentId = z.uuid().parse(alunoId);
    return api.get(`/payments/aluno/${studentId}`, { searchParams: { page, pageSize } })
      .json<PaginatedStudentInvoices>();
  }

  async confirmManualPayment(id: string, request: { paidAmount: number; paymentMethod: string }): Promise<void> {
    const invoiceId = z.uuid().parse(id);
    await api.post(`/payments/${invoiceId}/confirm`, { json: request, retry: 0 });
  }

  async cancelInvoice(id: string, notes?: string): Promise<void> {
    const invoiceId = z.uuid().parse(id);
    await api.post(`/payments/${invoiceId}/cancel`, { json: { notes: notes?.trim() || null }, retry: 0 });
  }

  async refundInvoice(id: string, request: RefundInvoiceRequest): Promise<RefundInvoiceResult> {
    const invoiceId = z.uuid().parse(id);
    return api.post(`/payments/${invoiceId}/refund`, {
      json: { ...request, notes: request.notes?.trim() || null },
      retry: 0,
    }).json<RefundInvoiceResult>();
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
    const payload: Record<string, unknown> = {
      ...(configuration.apiKey?.trim() ? { apiKey: configuration.apiKey.trim() } : {}),
      ...(configuration.publicKey?.trim() ? { publicKey: configuration.publicKey.trim() } : {}),
      ...(configuration.webhookSecret?.trim() ? { webhookSecret: configuration.webhookSecret.trim() } : {}),
      isActive: configuration.isActive,
    };
    // Desabilita retries de PUT para não repetir uma troca de gateway automaticamente.
    await api.put(`/payments/gateways/${gateway}`, { json: payload, retry: 0 });
  }
}
