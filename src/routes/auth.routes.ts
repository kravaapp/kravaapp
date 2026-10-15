import {
  ChangePasswordRequest,
  ConfirmEmailRequest,
  CreateInvitationRequest,
  ForgotPasswordRequest,
  JoinCatalogRequest,
  LoginRequest,
  ResendConfirmationCodeRequest,
  ResetPasswordRequest,
  SelectTenantRequest,
  SelfRegisterRequest,
  SetInitialPasswordRequest,
  VerifyResetCodeRequest,
} from "@/schemas/auth.schemas";
import {
  CatalogTenantDetailsType,
  CatalogTenantType,
  LoginResponse,
  PendingInvitationType,
  Token,
} from "@/types/auth.types";
import api from "./client";

export class AuthRoutes {
  constructor() {}

  async login(request: LoginRequest) {
    return await api
      .post("/auth/login", { json: request })
      .json<LoginResponse>();
  }

  async selfRegister(request: SelfRegisterRequest) {
    await api.post("/auth/self-register", { json: request });
  }

  async forgotPassword(request: ForgotPasswordRequest) {
    await api.post("/auth/forgot-password", { json: request });
  }

  async verifyResetCode(request: VerifyResetCodeRequest) {
    await api.post("/auth/verify-reset-code", { json: request });
  }

  async resetPassword(request: ResetPasswordRequest) {
    await api.post("/auth/reset-password", { json: request });
  }

  async confirmEmail(request: ConfirmEmailRequest) {
    await api.post("/auth/confirm-email", { json: request });
  }

  async resendConfirmationCode(request: ResendConfirmationCodeRequest) {
    await api.post("/auth/resend-confirmation-code", { json: request });
  }

  async changePassword(request: ChangePasswordRequest) {
    await api.post("/auth/change-password", { json: request });
  }

  async setInitialPassword(request: SetInitialPasswordRequest) {
    return await api
      .post("/auth/set-initial-password", { json: request })
      .json<Token>();
  }

  async selectTenant(request: SelectTenantRequest) {
    return await api
      .post("/auth/select-tenant", { json: request })
      .json<Token>();
  }

  async createInvitation(request: CreateInvitationRequest) {
    await api.post("/auth/invitations", { json: request });
  }

  async getCatalog(searchTerm?: string) {
    const tenants = await api
      .get("/auth/catalog", {
        searchParams: searchTerm ? { searchTerm } : undefined,
      })
      .json<
        Array<
          Omit<CatalogTenantType, "id"> & {
            id?: string;
            ctId?: string;
          }
        >
      >();

    return tenants.map((tenant) => ({
      ...tenant,
      id: tenant.id ?? tenant.ctId ?? "",
    }));
  }

  async getCatalogTenant(ctId: string) {
    return api.get(`/auth/catalog/${ctId}`).json<CatalogTenantDetailsType>();
  }

  async requestToJoin(
    ctId: string,
    request: JoinCatalogRequest,
    accessToken: string,
  ) {
    await api.post(`/auth/catalog/${ctId}/join`, {
      json: request,
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }

  async getPendingInvitations(accessToken: string) {
    return api
      .get("/auth/invitations/pending", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .json<PendingInvitationType[]>();
  }

  async acceptInvitation(id: string, accessToken: string) {
    await api.post(`/auth/invitations/${id}/accept`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  }
}
