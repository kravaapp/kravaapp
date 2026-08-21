import { AvulsoConfigType, CreateSchedulingRuleType, SchedulingRuleType, UpdateAvulsoConfigType } from "@/types/settings.types";
import api from "./client";

export class SettingsRoutes {
  async getSchedulingRules() {
    return api.get("/tenant/scheduling-rules").json<SchedulingRuleType[]>();
  }
  async createSchedulingRule(rule: CreateSchedulingRuleType) {
    return api.post("/tenant/scheduling-rules", { json: rule }).json<SchedulingRuleType>();
  }
  async getAvulsoConfigs() {
    return api.get("/financial/avulso-config").json<AvulsoConfigType[]>();
  }
  async updateAvulsoConfig(modalidadeId: string, config: UpdateAvulsoConfigType) {
    await api.put(`/financial/avulso-config/${modalidadeId}`, { json: config });
  }
}
