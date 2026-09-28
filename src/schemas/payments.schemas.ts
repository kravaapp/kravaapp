import z from "zod";

export const gatewayConfigurationSchema = z.object({
  apiKey: z.string().trim().min(1, "Informe a credencial do gateway."),
  publicKey: z.string().trim().optional(),
  webhookSecret: z.string().trim().optional(),
  isActive: z.boolean(),
});

export const mercadoPagoConfigurationSchema = gatewayConfigurationSchema.extend({
  publicKey: z.string().trim().min(1, "Informe a Public Key do Mercado Pago."),
});
