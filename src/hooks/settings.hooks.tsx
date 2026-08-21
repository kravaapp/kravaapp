import { SettingsRoutes } from "@/routes/settings.routes";
import { FinancialRoutes } from "@/routes/financial.routes";
import { UpdateTenantSettingsType } from "@/types/financial.types";
import { CreateSchedulingRuleType, UpdateAvulsoConfigType } from "@/types/settings.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminSettings() {
  const routes = new SettingsRoutes();
  const rules = useQuery({ queryKey: ["scheduling-rules"], queryFn: () => routes.getSchedulingRules() });
  const avulso = useQuery({ queryKey: ["avulso-configs"], queryFn: () => routes.getAvulsoConfigs() });
  const tenant = useQuery({ queryKey: ["tenant-settings"], queryFn: () => new FinancialRoutes().getSettings() });
  return {
    rules: rules.data ?? [],
    avulsoConfigs: avulso.data ?? [],
    tenantSettings: tenant.data,
    loading: { rules: rules.isLoading, avulso: avulso.isLoading, tenant: tenant.isLoading },
    hasError: rules.isError || avulso.isError || tenant.isError,
  };
}

export function useSettingsActions() {
  const client = useQueryClient();
  const createRule = useMutation({
    mutationFn: (rule: CreateSchedulingRuleType) => new SettingsRoutes().createSchedulingRule(rule),
    onSuccess: () => client.invalidateQueries({ queryKey: ["scheduling-rules"] }),
  });
  const updateAvulso = useMutation({
    mutationFn: ({ modalidadeId, config }: { modalidadeId: string; config: UpdateAvulsoConfigType }) => new SettingsRoutes().updateAvulsoConfig(modalidadeId, config),
    onSuccess: () => client.invalidateQueries({ queryKey: ["avulso-configs"] }),
  });
  const updateTenant = useMutation({
    mutationFn: (settings: UpdateTenantSettingsType) => new FinancialRoutes().updateSettings(settings),
    onSuccess: () => client.invalidateQueries({ queryKey: ["tenant-settings"] }),
  });
  return {
    createRule: createRule.mutateAsync,
    updateAvulso: updateAvulso.mutateAsync,
    updateTenant: updateTenant.mutateAsync,
    isCreatingRule: createRule.isPending,
    isUpdatingAvulso: updateAvulso.isPending,
    isUpdatingTenant: updateTenant.isPending,
  };
}
