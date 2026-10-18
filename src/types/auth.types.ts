export const USER_ROLES = {
  admin: "Admin",
  student: "Aluno",
  professor: "Professor",
  instructor: "Instrutor",
} as const;

export type Token = {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  userId: string;
  userName: string;
  email: string;
  tenantId: string;
  tenantName: string;
  role: string;
  gender: string;
  studentLevel: string;
  logoUrl?: string | null;
}

export type AvailableTenant = {
  tenantId: string;
  tenantName: string;
  role: string;
  isActive: boolean;
  logoUrl?: string | null;
}

export type LoginResponse = {
  requiresTenantSelection: boolean;
  token: Token | null;
  userId: string | null;
  preAuthToken: string | null;
  availableTenants: AvailableTenant[] | null;
}

export type CatalogTenantType = {
  id: string;
  name: string;
  logoUrl: string | null;
  modalities: string[] | null;
}

export type CatalogPlanType = {
  id: string;
  name: string;
  description: string | null;
  basePrice: number;
  durationDays: number;
  allowsAllModalidades: boolean;
  modalidades: string[] | null;
}

export type CatalogAvulsoType = {
  modalidadeId: string;
  modalidadeName: string | null;
  price: number;
}

export type CatalogTenantDetailsType = {
  ctId: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  bannerUrl: string | null;
  modalities: string[] | null;
  plans: CatalogPlanType[] | null;
  avulsos: CatalogAvulsoType[] | null;
}

export type PendingInvitationType = {
  id: string;
  ctId: string;
  ctName: string;
  email: string;
  role: string;
  status: number;
  createdAtUtc: string;
}

export type InvitationDetailsType = {
  id: string;
  ctId: string;
  ctName: string;
  email: string;
  role: string;
  status: string;
  userExists: boolean;
  planId?: string | null;
};
