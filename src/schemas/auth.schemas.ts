import z from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const selectTenantSchema = z.object({
  // Só existe no primeiro acesso, antes de a API emitir a sessão permanente.
  // Nas trocas seguintes, a autorização vem do Bearer access token.
  preAuthToken: z.string().nullable(),
  tenantId: z.string().uuid(),
});

export const selfRegisterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(1),
  cpf: z.string().regex(/^\d{11}$/),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sex: z.enum(["M", "F"]).nullable(),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.literal("Aluno"),
});

export const joinCatalogSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export const verifyResetCodeSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  code: z.string().trim().regex(/^\d{6}$/, "Informe os 6 dígitos do código."),
});

/** Forma enviada à API — nunca inclui confirmPassword. */
export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  code: z.string().trim().regex(/^\d{6}$/, "Informe os 6 dígitos do código."),
  newPassword: z
    .string()
    .min(8, "Mínimo de 8 caracteres.")
    .regex(/[A-Z]/, "Inclua ao menos 1 letra maiúscula.")
    .regex(/[a-z]/, "Inclua ao menos 1 letra minúscula.")
    .regex(/[0-9]/, "Inclua ao menos 1 número."),
});

/** Forma usada só pelo formulário da tela (valida a confirmação sem enviá-la). */
export const resetPasswordFormSchema = resetPasswordSchema
  .extend({ confirmPassword: z.string().min(1, "Confirme a nova senha.") })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem.",
  });

/** Valida o código de 6 dígitos enviado ao e-mail cadastrado. */
export const confirmEmailSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  code: z.string().trim().regex(/^\d{6}$/, "Informe os 6 dígitos do código."),
});

/** Reenvio do código de confirmação — mesmo contrato de `forgotPasswordSchema`. */
export const resendConfirmationCodeSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type SelfRegisterRequest = z.infer<typeof selfRegisterSchema>;
export type SelectTenantRequest = z.infer<typeof selectTenantSchema>;
export type CreateInvitationRequest = z.infer<typeof createInvitationSchema>;
export type JoinCatalogRequest = z.infer<typeof joinCatalogSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type VerifyResetCodeRequest = z.infer<typeof verifyResetCodeSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type ResetPasswordFormValues = z.infer<
  typeof resetPasswordFormSchema
>;
export type ConfirmEmailRequest = z.infer<typeof confirmEmailSchema>;
export type ResendConfirmationCodeRequest = z.infer<
  typeof resendConfirmationCodeSchema
>;
