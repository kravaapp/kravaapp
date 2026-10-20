import { PlansRoutes } from "@/routes/plans.routes";
import { useAuth } from "@/hooks/auth.hooks";
import { CreateAdminPlanType, UpdateAdminPlanType } from "@/types/plans.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePlans() {
    const { user } = useAuth();
    const query = useQuery({
        queryKey: ["plans", "list", user?.tenantId],
        queryFn: async () => {
            const plansRoutes = new PlansRoutes();
            return await plansRoutes.getPlans();
        },
    });

    return {
        plans: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar planos"
            : null,
        refetch: query.refetch,
    };
}

export function useCurrentPlan() {
    const { user } = useAuth();
    const query = useQuery({
        queryKey: ["plans", "current", user?.tenantId, user?.userId],
        queryFn: async () => {
            const plansRoutes = new PlansRoutes();
            return await plansRoutes.getCurrentPlan();
        },
    });

    return {
        currentPlan: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar plano atual"
            : null,
        refetch: query.refetch,
    };
}

export function useAdminPlans(page: number) {
    const query = useQuery({ queryKey: ["admin-plans", page], queryFn: () => new PlansRoutes().getAdminPlans(page) });
    return { data: query.data, plans: query.data?.items ?? [], isLoading: query.isLoading, error: query.error ? (query.error as any).data?.detail || query.error.message || "Erro ao buscar planos" : null };
}

export function useAdminPlanActions() {
    const client = useQueryClient();
    const invalidate = () => {
        client.invalidateQueries({ queryKey: ["admin-plans"] });
        client.invalidateQueries({ queryKey: ["plans"] });
    };
    const create = useMutation({ mutationFn: (plan: CreateAdminPlanType) => new PlansRoutes().createPlan(plan), onSuccess: invalidate });
    const update = useMutation({ mutationFn: ({ id, plan }: { id: string; plan: UpdateAdminPlanType }) => new PlansRoutes().updatePlan(id, plan), onSuccess: invalidate });
    const modalities = useMutation({ mutationFn: ({ id, modalidadeIds }: { id: string; modalidadeIds: string[] }) => new PlansRoutes().updateModalities(id, modalidadeIds), onSuccess: invalidate });
    return { createPlan: create.mutateAsync, updatePlan: update.mutateAsync, updateModalities: modalities.mutateAsync, isSaving: create.isPending || update.isPending || modalities.isPending };
}

const myPlanRequestKey = ["my-plan-request"];

export function useMyPlanRequest() {
    const { user } = useAuth();
    const query = useQuery({
        queryKey: [...myPlanRequestKey, user?.tenantId, user?.userId],
        queryFn: async () => {
            const plansRoutes = new PlansRoutes();
            return await plansRoutes.getMyPlanRequest();
        },
    });

    return {
        planRequest: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
              query.error.message ||
              "Erro ao buscar solicitação de plano"
            : null,
        refetch: query.refetch,
    };
}

export function useCreatePlanRequest() {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: (planoId: string) => new PlansRoutes().createPlanRequest(planoId),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: myPlanRequestKey });
            client.invalidateQueries({ queryKey: ["admin-plan-requests"] });
        },
    });

    return {
        createPlanRequest: mutation.mutateAsync,
        isLoading: mutation.isPending,
    };
}

export function useCancelMyPlanRequest() {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: (id: string) => new PlansRoutes().cancelMyPlanRequest(id),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: myPlanRequestKey });
            client.invalidateQueries({ queryKey: ["admin-plan-requests"] });
        },
    });

    return {
        cancelMyPlanRequest: mutation.mutateAsync,
        isLoading: mutation.isPending,
    };
}

export function usePendingPlanRequests() {
    const query = useQuery({
        queryKey: ["admin-plan-requests"],
        queryFn: () => new PlansRoutes().getPlanRequests("Pending"),
    });

    return {
        planRequests: query.data ?? [],
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
              query.error.message ||
              "Erro ao buscar solicitações de plano"
            : null,
        refetch: query.refetch,
    };
}

export function usePlanRequestActions() {
    const queryClient = useQueryClient();
    const routes = new PlansRoutes();
    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ["admin-plan-requests"] });
        queryClient.invalidateQueries({ queryKey: ["admin-active-students"] });
        queryClient.invalidateQueries({ queryKey: ["alunos"] });
        queryClient.invalidateQueries({ queryKey: myPlanRequestKey });
        queryClient.invalidateQueries({ queryKey: ["plans", "current"] });
    };

    const approve = useMutation({
        mutationFn: (id: string) => routes.approvePlanRequest(id),
        onSuccess: invalidate,
    });

    const reject = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
            routes.rejectPlanRequest(id, reason),
        onSuccess: invalidate,
    });

    return {
        approvePlanRequest: approve.mutateAsync,
        rejectPlanRequest: reject.mutateAsync,
        isLoading: approve.isPending || reject.isPending,
    };
}
