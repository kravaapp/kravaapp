import { LoginRequest, SelectTenantRequest } from "@/schemas/auth.schemas";
import { LoginResponse, Token } from "@/types/auth.types";
import api from "./client";

export class AuthRoutes {
  constructor() {}

  async login(request: LoginRequest) {
    return await api.post("/auth/login", { json: request }).json<LoginResponse>();
  }

  async selectTenant(request: SelectTenantRequest) {
    return await api.post("/auth/select-tenant", { json: request }).json<Token>();
  }
}