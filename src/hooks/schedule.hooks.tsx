import { ScheduleRoutes } from "@/routes/schedule.routes";
import { CreateScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

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

export function useSchedule(params: ScheduleRequestSchema) {
    const query = useQuery({
        queryKey: ["schedule", params],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getSchedule(params);
        },
    });

    return {
        schedule: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar agendamento"
            : null,
        refetch: query.refetch,
    };
}

export function useCreateSchedule() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (params: CreateScheduleRequestSchema) => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.createSchedule(params);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
        },
    });

    useEffect(() => {
        if (mutation.error) {
            console.error('Erro ao criar agendamento: ', (mutation.error as any).data?.detail || mutation.error.message || "Erro ao criar agendamento");
        }
    }, [mutation.error]);

    return {
        createSchedule: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error
            ? (mutation.error as any).data?.detail || mutation.error.message || "Erro ao criar agendamento"
            : null
    };
}