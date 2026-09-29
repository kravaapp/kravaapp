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
