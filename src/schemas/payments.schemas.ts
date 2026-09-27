import z from "zod";

export const gatewayConfigurationSchema = z.object({
  apiKey: z.string().trim().min(1, "Informe a credencial do gateway."),
  webhookSecret: z.string().trim().optional(),
  isActive: z.boolean(),
});
