import { ScheduleRoutes } from "@/routes/schedule.routes";
import { useQuery } from "@tanstack/react-query";

export function useUserNextClass() {
    const query = useQuery({
        queryKey: ["user-next-class"],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getUserNextClass();
        },
    });

    return {
        userNextClass: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar próxima aula"
            : null,
        refetch: query.refetch,
    };
}

export function useUserWeekClasses() {
    const query = useQuery({
        queryKey: ["user-week-classes"],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getUserWeekClasses();
        },
    });

    return {
        userWeekClasses: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar aulas da semana"
            : null,
        refetch: query.refetch,
    };
}