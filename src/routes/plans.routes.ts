import { CurrentPlanType, PaginatedPlanType } from "@/types/plans.types";
import api from "./client";

export class PlansRoutes {
    constructor() {}

    async getPlans() {
        return (await api.get("/membership/planos", {searchParams: { activeOnly: true }}).json<PaginatedPlanType>()).items;
    }

    async getCurrentPlan() {
        return await api.get("/plans/current").json<CurrentPlanType>();
    }
}