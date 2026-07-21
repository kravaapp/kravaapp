import { DashboardRoutes } from "@/routes/dashboard.routes";
import { useQuery } from "@tanstack/react-query";

type ApiError = Error & { data?: { detail?: string } };

export function useTeacherDashboard() {
    const query = useQuery({
        queryKey: ["teacher-dashboard"],
        queryFn: async () => {
            const dashboardRoutes = new DashboardRoutes();
            return await dashboardRoutes.getTeacherDashboard();
        },
    });

    return {
        teacherDashboard: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as ApiError).data?.detail ||
            query.error.message ||
            "Erro ao buscar o dashboard do professor"
            : null,
        refetch: query.refetch,
    };
}
