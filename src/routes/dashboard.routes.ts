import {
    ActiveStudentsType,
    DailyAttendanceType,
    FinancialDashboardType,
    OperationalDashboardType,
    PartnerRequestType,
    StudentAtRiskType,
    TeacherDashboardType,
} from "@/types/dashboard.types";
import api from "./client";

export class DashboardRoutes {
    constructor() { }

    async getTeacherDashboard() {
        return await api.get("/dashboard/teacher").json<TeacherDashboardType>();
    }

    async getActiveStudents() {
        return await api.get("/analytics/active-students").json<ActiveStudentsType>();
    }

    async getFinancialDashboard() {
        return await api.get("/analytics/financial").json<FinancialDashboardType>();
    }

    async getOperationalDashboard(startDate: string, endDate: string) {
        return await api.get("/analytics/operational", {
            searchParams: { startDate, endDate },
        }).json<OperationalDashboardType>();
    }

    async getDailyAttendance(startDate: string, endDate: string) {
        return await api.get("/analytics/operational/daily-attendance", {
            searchParams: { startDate, endDate },
        }).json<DailyAttendanceType[]>();
    }

    async getStudentsAtRisk() {
        return await api.get("/analytics/churn").json<StudentAtRiskType[]>();
    }

    async markStudentContacted(alunoId: string, result: string) {
        return await api.post(`/analytics/churn/${alunoId}/contact`, {
            json: { result },
        });
    }

    async getPartnerRequests(status?: string) {
        return await api.get("/membership/partner-requests", {
            searchParams: status ? { status } : undefined,
        }).json<PartnerRequestType[]>();
    }

    async approvePartnerRequest(id: string) {
        await api.patch(`/membership/partner-requests/${id}/approve`);
    }

    async rejectPartnerRequest(id: string, rejectionReason?: string) {
        await api.patch(`/membership/partner-requests/${id}/reject`, {
            json: { rejectionReason },
        });
    }
}
