import { PlansRoutes } from "@/routes/plans.routes";
import { useQuery } from "@tanstack/react-query";

export function usePlans() {
    const query = useQuery({
        queryKey: ["plans"],
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
    const query = useQuery({
        queryKey: ["plans", "current"],
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