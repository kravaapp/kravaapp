import { ScheduleRoutes } from "@/routes/schedule.routes";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useUserNextClass() {
    const query = useQuery({
        queryKey: ["user-next-class"],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getUserNextClass();
        },
    });

    useEffect(() => {
        if (query.error) {
            console.error(query.error);
        }
    }, [query.error]);

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