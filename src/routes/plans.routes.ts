import { CreateAdminPlanType, CurrentPlanType, MyPlanRequestType, PaginatedAdminPlans, PaginatedPlanType, PlanRequestItemType, UpdateAdminPlanType } from "@/types/plans.types";
import api from "./client";

export class PlansRoutes {
    constructor() {}

    async getPlans() {
        const result = await api.get("/membership/planos", {searchParams: { activeOnly: true }}).json<PaginatedPlanType>();
        return result.items.map((plan) => ({ ...plan, price: plan.price ?? 0 }));
    }

    async getCurrentPlan(): Promise<CurrentPlanType | null> {
        const response = await api.get("/plans/current");
        if (response.status === 204) return null;
        const text = await response.text();
        if (!text || text.trim() === "" || text.trim() === "null") return null;
        return JSON.parse(text) as CurrentPlanType;
    }

    async getMyPlanRequest(): Promise<MyPlanRequestType | null> {
        const response = await api.get("/membership/plan-requests/my");
        if (response.status === 204) return null;
        const text = await response.text();
        if (!text || text.trim() === "" || text.trim() === "null") return null;
        return JSON.parse(text) as MyPlanRequestType;
    }

    async createPlanRequest(planoId: string): Promise<string> {
        return await api.post("/membership/plan-requests", { json: { planoId } }).json<string>();
    }

    async cancelMyPlanRequest(id: string): Promise<void> {
        await api.delete(`/membership/plan-requests/my/${id}`);
    }

    async getPlanRequests(status?: string): Promise<PlanRequestItemType[]> {
        return await api.get("/membership/plan-requests", {
            searchParams: status ? { status } : undefined,
        }).json<PlanRequestItemType[]>();
    }

    async approvePlanRequest(id: string): Promise<void> {
        await api.patch(`/membership/plan-requests/${id}/approve`);
    }

    async rejectPlanRequest(id: string, rejectionReason?: string): Promise<void> {
        await api.patch(`/membership/plan-requests/${id}/reject`, {
            json: { rejectionReason },
        });
    }

    async getAdminPlans(page = 1, pageSize = 20, activeOnly = false) {
        return api.get("/membership/planos", { searchParams: { page, pageSize } }).json<PaginatedAdminPlans>();
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
