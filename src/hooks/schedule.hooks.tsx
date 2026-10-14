import { ScheduleRoutes } from "@/routes/schedule.routes";
import { CreateScheduleRequestSchema, GetAttendanceRequestSchema, GetBookingUserHistoryRequestSchema, GetMyMonthlyScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { CreateAulaType, UpdateAulaType } from "@/types/schedules.types";

type ApiError = Error & { data?: { detail?: string } };

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

export function useTodayOccurrences() {
    const query = useQuery({
        queryKey: ["today-occurrences"],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getTodayOccurrences();
        },
    });

    return {
        todayOccurrences: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as ApiError).data?.detail ||
            query.error.message ||
            "Erro ao buscar aulas de hoje"
            : null,
        refetch: query.refetch,
    };
}

export function useAulas() {
    const query = useQuery({
        queryKey: ["aulas", "active"],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getAulas();
        },
    });

    return {
        aulas: query.data?.items ?? [],
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as ApiError).data?.detail ||
            query.error.message ||
            "Erro ao buscar a grade de aulas"
            : null,
        refetch: query.refetch,
    };
}

export function useClassFormOptions() {
    const routes = new ScheduleRoutes();
    const modalidades = useQuery({
        queryKey: ["modalidades", "active"],
        queryFn: () => routes.getModalidades(),
    });
    const professors = useQuery({
        queryKey: ["professors", "active"],
        queryFn: () => routes.getProfessors(),
    });

    return {
        modalidades: (modalidades.data?.items ?? []).filter((item) => item.isActive),
        professors: professors.data ?? [],
        isLoading: modalidades.isLoading || professors.isLoading,
        error: modalidades.error || professors.error,
    };
}

export function useProfessors() {
    const routes = new ScheduleRoutes();
    const query = useQuery({
        queryKey: ["professors", "active"],
        queryFn: () => routes.getProfessors(),
    });

    return {
        professors: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error ? "Não foi possível carregar os professores." : null,
        refetch: query.refetch,
    };
}

export function useRemoveProfessor() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (userId: string) => new ScheduleRoutes().deleteProfessor(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["professors"] });
        },
    });

    return {
        removeProfessor: mutation.mutateAsync,
        isRemoving: mutation.isPending,
        error: mutation.error,
    };
}

export function useCreateAula() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (params: CreateAulaType) => new ScheduleRoutes().createAula(params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aulas"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
        },
    });

    return {
        createAula: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error,
    };
}

export function useUpdateAula() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: ({ id, params }: { id: string; params: UpdateAulaType }) =>
            new ScheduleRoutes().updateAula(id, params),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aulas"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
        },
    });

    return { updateAula: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useDeleteAula() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (id: string) => new ScheduleRoutes().deleteAula(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["aulas"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
        },
    });

    return { deleteAula: mutation.mutateAsync, isLoading: mutation.isPending };
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

export function useDeleteSchedule() {
    const queryClient = useQueryClient();
    const mutation = useMutation({
        mutationFn: (bookingId: string) => new ScheduleRoutes().deleteSchedule(bookingId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
            queryClient.invalidateQueries({ queryKey: ["user-next-class"] });
            queryClient.invalidateQueries({ queryKey: ["user-week-classes"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
        },
    });

    return { deleteSchedule: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useBookingUserHistory(params: GetBookingUserHistoryRequestSchema) {
    const query = useQuery({
        queryKey: ["booking-user-history", params],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getBookingUserHistory(params);
        },
    });

    return {
        bookingUserHistory: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar histórico de agendamentos"
            : null,
        refetch: query.refetch,
    };
}

export function useMyMonthlySchedule(params: GetMyMonthlyScheduleRequestSchema) {
    const query = useQuery({
        queryKey: ["my-monthly-schedule", params],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getMyMonthlySchedule(params);
        },
    });

    return {
        myMonthlySchedule: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar status mensal de presença"
            : null,
        refetch: query.refetch,
    };
}

/**
 * Marca presença/falta de um aluno. `present` decide qual endpoint é chamado,
 * já que a tela usa um único botão de toggle por aluno.
 */
export function useMarkAttendance() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ bookingId, present }: { bookingId: string; present: boolean }) => {
            const scheduleRoutes = new ScheduleRoutes();
            return present
                ? await scheduleRoutes.markPresent(bookingId)
                : await scheduleRoutes.markAbsent(bookingId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
        },
    });

    return {
        markAttendance: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error
            ? (mutation.error as ApiError).data?.detail ||
            mutation.error.message ||
            "Erro ao registrar a presença"
            : null,
    };
}

/** Encerra a aula (marca faltas dos pendentes no servidor). */
export function useCloseOcorrencia() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async (ocorrenciaId: string) => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.closeOcorrencia(ocorrenciaId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
        },
    });

    return {
        closeOcorrencia: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error
            ? (mutation.error as ApiError).data?.detail ||
            mutation.error.message ||
            "Erro ao encerrar a chamada"
            : null,
    };
}

/** Cancela a aula pontualmente sem debitar check-ins e notificando os alunos. */
export function useCancelOcorrencia() {
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: async ({ ocorrenciaId, reason }: { ocorrenciaId: string; reason?: string }) => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.cancelOcorrencia(ocorrenciaId, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["attendance"] });
            queryClient.invalidateQueries({ queryKey: ["today-occurrences"] });
            queryClient.invalidateQueries({ queryKey: ["schedule"] });
            queryClient.invalidateQueries({ queryKey: ["classes", "next"] });
            queryClient.invalidateQueries({ queryKey: ["classes", "week"] });
            queryClient.invalidateQueries({ queryKey: ["checkin", "my-status"] });
        },
    });

    return {
        cancelOcorrencia: mutation.mutateAsync,
        isLoading: mutation.isPending,
        error: mutation.error
            ? (mutation.error as ApiError).data?.detail ||
            mutation.error.message ||
            "Erro ao cancelar a aula"
            : null,
    };
}

export function useAttendance({ ocorrenciaId, status }: GetAttendanceRequestSchema) {
    const query = useQuery({
        queryKey: ["attendance", ocorrenciaId, status],
        queryFn: async () => {
            const scheduleRoutes = new ScheduleRoutes();
            return await scheduleRoutes.getAttendance({ ocorrenciaId, status });
        },
        enabled: !!ocorrenciaId,
    });

    return {
        attendance: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as ApiError).data?.detail ||
            query.error.message ||
            "Erro ao buscar a chamada da aula"
            : null,
        refetch: query.refetch,
    };
}
