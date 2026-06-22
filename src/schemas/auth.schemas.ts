import z from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const selectTenantSchema = z.object({
  preAuthToken: z.string(),
  tenantId: z.string(),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type SelectTenantRequest = z.infer<typeof selectTenantSchema>;
