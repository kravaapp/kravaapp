import z from "zod";

export const paymentCustomerSchema = z.object({
  customerName: z.string().trim().min(2, "Informe seu nome completo."),
  customerEmail: z.string().trim().pipe(z.email("Informe um e-mail válido.")),
  customerDocument: z.string().transform((value) => value.replace(/\D/g, ""))
    .refine((value) => value.length === 11 || value.length === 14, "Informe um CPF ou CNPJ válido."),
});

export const cardPaymentFieldsSchema = z.object({
  cardToken: z.string().min(1),
  installments: z.number().int().positive(),
  cardPaymentMethodId: z.enum(["master", "visa", "elo", "amex", "hipercard"]),
});

// O parse seleciona somente os campos permitidos, inclusive em runtime.
export const payInvoiceSchema = z.discriminatedUnion("method", [
  paymentCustomerSchema.extend({ method: z.literal("Pix") }),
  paymentCustomerSchema.extend({ method: z.literal("CreditCard"), ...cardPaymentFieldsSchema.shape }),
]);

export const gatewayConfigurationSchema = z.object({
  apiKey: z.string().trim().min(1, "Informe a credencial do gateway."),
  publicKey: z.string().trim().optional(),
  webhookSecret: z.string().trim().optional(),
  isActive: z.boolean(),
});

export const mercadoPagoConfigurationSchema = gatewayConfigurationSchema.extend({
  publicKey: z.string().trim().min(1, "Informe a Public Key do Mercado Pago."),
});

const optionalSecret = z.string().trim().transform((v) => (v ? v : undefined)).optional();

export const gatewayUpdateConfigurationSchema = z.object({
  apiKey: optionalSecret,
  publicKey: optionalSecret,
  webhookSecret: optionalSecret,
  isActive: z.boolean(),
});
