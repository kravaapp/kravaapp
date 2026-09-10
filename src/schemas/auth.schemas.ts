import z from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const selectTenantSchema = z.object({
  preAuthToken: z.string(),
  tenantId: z.string(),
});

export const selfRegisterSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const createInvitationSchema = z.object({
  email: z.string().trim().email(),
  role: z.literal("Aluno"),
});

export const joinCatalogSchema = z.object({
  planId: z.string().uuid().nullable().optional(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type SelfRegisterRequest = z.infer<typeof selfRegisterSchema>;
export type SelectTenantRequest = z.infer<typeof selectTenantSchema>;
export type CreateInvitationRequest = z.infer<typeof createInvitationSchema>;
export type JoinCatalogRequest = z.infer<typeof joinCatalogSchema>;
