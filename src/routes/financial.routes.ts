import { FinancialSummaryType, PaginatedContracts, PaginatedPlans, TenantSettingsType, UpdateTenantSettingsType } from "@/types/financial.types";
import api from "./client";
import { PaginatedModalidades } from "@/types/schedules.types";

export class FinancialRoutes {
  async getSummary(month: string) {
    return api.get("/analytics/financial/summary", { searchParams: { month } }).json<FinancialSummaryType>();
  }
  async getContracts() {
    return api.get("/membership/contratos", { searchParams: { page: 1, pageSize: 100 } }).json<PaginatedContracts>();
  }
  async getPlans() {
    return api.get("/membership/planos", { searchParams: { page: 1, pageSize: 100 } }).json<PaginatedPlans>();
  }
  async getModalidades() {
    return api.get("/scheduling/modalidades", { searchParams: { page: 1, pageSize: 100 } }).json<PaginatedModalidades>();
  }
  async getSettings() {
    return api.get("/tenant/settings").json<TenantSettingsType>();
  }
  async updateSettings(settings: UpdateTenantSettingsType) {
    await api.put("/tenant/settings", { json: settings });
  }
}
