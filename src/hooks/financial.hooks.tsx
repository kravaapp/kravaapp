import { FinancialRoutes } from "@/routes/financial.routes";
import { useAuth } from "@/hooks/auth.hooks";
import { UpdateTenantSettingsType } from "@/types/financial.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useFinancialScreen(month: string) {
  const { user } = useAuth();
  const routes = new FinancialRoutes();
  const summary = useQuery({ queryKey: ["financial-summary", month], queryFn: () => routes.getSummary(month) });
  const contracts = useQuery({ queryKey: ["contracts"], queryFn: () => routes.getContracts() });
  const plans = useQuery({ queryKey: ["plans", "financial", user?.tenantId], queryFn: () => routes.getPlans() });
  const modalidades = useQuery({ queryKey: ["modalidades", "active"], queryFn: () => routes.getModalidades() });
  const settings = useQuery({ queryKey: ["tenant-settings"], queryFn: () => routes.getSettings() });
  return {
    summary: summary.data,
    contracts: contracts.data?.items ?? [],
    plans: plans.data?.items ?? [],
    modalidades: modalidades.data?.items ?? [],
    settings: settings.data,
    loading: { summary: summary.isLoading, contracts: contracts.isLoading || plans.isLoading || modalidades.isLoading, settings: settings.isLoading },
    hasError: summary.isError || contracts.isError || plans.isError || modalidades.isError || settings.isError,
  };
}

export function useUpdateFinancialSettings() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (settings: UpdateTenantSettingsType) => new FinancialRoutes().updateSettings(settings),
    onSuccess: () => client.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });
  return { updateSettings: mutation.mutateAsync, isLoading: mutation.isPending };
}
