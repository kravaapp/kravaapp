import { CreateAdminPlanType, CurrentPlanType, PaginatedAdminPlans, PaginatedPlanType, UpdateAdminPlanType } from "@/types/plans.types";
import api from "./client";

export class PlansRoutes {
    constructor() {}

    async getPlans() {
        const result = await api.get("/membership/planos", {searchParams: { activeOnly: true }}).json<PaginatedPlanType>();
        return result.items.map((plan) => ({ ...plan, price: plan.price ?? plan.basePrice ?? 0 }));
    }

    async getCurrentPlan() {
        return await api.get("/plans/current").json<CurrentPlanType>();
    }

    async getAdminPlans(page = 1, pageSize = 20, activeOnly = false) {
        return api.get("/membership/planos", { searchParams: { page, pageSize, activeOnly } }).json<PaginatedAdminPlans>();
    }

    async createPlan(plan: CreateAdminPlanType) {
        return api.post("/membership/planos", { json: plan }).json<string>();
    }

    async updatePlan(id: string, plan: UpdateAdminPlanType) {
        await api.put(`/membership/planos/${id}`, { json: plan });
    }

    async updateModalities(id: string, modalidadeIds: string[]) {
        await api.post(`/membership/planos/${id}/modalities`, { json: { modalidadeIds } });
    }
}
