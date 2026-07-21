import { TeacherDashboardType } from "@/types/dashboard.types";
import api from "./client";

export class DashboardRoutes {
    constructor() {}

    async getTeacherDashboard() {
        return await api.get("/dashboard/teacher").json<TeacherDashboardType>();
    }
}
