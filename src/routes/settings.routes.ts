import { AvulsoConfigType, CatalogProfileType, CreateSchedulingRuleType, SchedulingRuleType, UpdateAvulsoConfigType, UpdateCatalogProfileType } from "@/types/settings.types";
import api from "./client";

export class SettingsRoutes {
  async getSchedulingRules() {
    return api.get("/tenant/scheduling-rules").json<SchedulingRuleType[]>();
  }
  async createSchedulingRule(rule: CreateSchedulingRuleType) {
    return api.post("/tenant/scheduling-rules", { json: rule }).json<SchedulingRuleType>();
  }
  async updateSchedulingRule(id: string, rule: CreateSchedulingRuleType) {
    return api.put(`/tenant/scheduling-rules/${id}`, { json: rule }).json<SchedulingRuleType>();
  }
  async deleteSchedulingRule(id: string) {
    await api.delete(`/tenant/scheduling-rules/${id}`);
  }
  async getAvulsoConfigs() {
    return api.get("/financial/avulso-config").json<AvulsoConfigType[]>();
  }
  async updateAvulsoConfig(modalidadeId: string, config: UpdateAvulsoConfigType) {
    await api.put(`/financial/avulso-config/${modalidadeId}`, { json: config });
  }
  async getCatalogProfile() {
    return api.get("/tenant/catalog-profile").json<CatalogProfileType>();
  }
  async updateCatalogProfile(profile: UpdateCatalogProfileType) {
    await api.put("/tenant/catalog-profile", { json: profile });
  }
}
