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
}

export type AvailableTenant = {
  tenantId: string;
  tenantName: string;
  role: string;
  isActive: boolean;
}

export type LoginResponse = {
  requiresTenantSelection: boolean;
  token: Token;
  userId: string | null;
  preAuthToken: string | null;
  availableTenants: AvailableTenant[] | null;
}
