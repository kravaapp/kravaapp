import { FinancialRoutes } from "@/routes/financial.routes";
import { SettingsRoutes } from "@/routes/settings.routes";
import { UpdateTenantSettingsType } from "@/types/financial.types";
import {
  CreateSchedulingRuleType,
  UpdateAvulsoConfigType,
  UpdateCatalogProfileType,
} from "@/types/settings.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAdminSettings() {
  const routes = new SettingsRoutes();
  const rules = useQuery({
    queryKey: ["scheduling-rules"],
    queryFn: () => routes.getSchedulingRules(),
  });
  const avulso = useQuery({
    queryKey: ["avulso-configs"],
    queryFn: () => routes.getAvulsoConfigs(),
  });
  const tenant = useQuery({
    queryKey: ["tenant-settings"],
    queryFn: () => new FinancialRoutes().getSettings(),
  });
  const catalogProfile = useQuery({
    queryKey: ["catalog-profile"],
    queryFn: () => routes.getCatalogProfile(),
  });
  return {
    rules: rules.data ?? [],
    avulsoConfigs: avulso.data ?? [],
    tenantSettings: tenant.data,
    catalogProfile: catalogProfile.data,
    loading: {
      rules: rules.isLoading,
      avulso: avulso.isLoading,
      tenant: tenant.isLoading,
      catalogProfile: catalogProfile.isLoading,
    },
    hasError:
      rules.isError ||
      avulso.isError ||
      tenant.isError ||
      catalogProfile.isError,
  };
}

export function useSettingsActions() {
  const client = useQueryClient();
  const createRule = useMutation({
    mutationFn: (rule: CreateSchedulingRuleType) =>
      new SettingsRoutes().createSchedulingRule(rule),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["scheduling-rules"] }),
  });
  const updateRule = useMutation({
    mutationFn: ({ id, rule }: { id: string; rule: CreateSchedulingRuleType }) =>
      new SettingsRoutes().updateSchedulingRule(id, rule),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["scheduling-rules"] }),
  });
  const deleteRule = useMutation({
    mutationFn: (id: string) => new SettingsRoutes().deleteSchedulingRule(id),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["scheduling-rules"] }),
  });
  const updateAvulso = useMutation({
    mutationFn: ({
      modalidadeId,
      config,
    }: {
      modalidadeId: string;
      config: UpdateAvulsoConfigType;
    }) => new SettingsRoutes().updateAvulsoConfig(modalidadeId, config),
    onSuccess: () => client.invalidateQueries({ queryKey: ["avulso-configs"] }),
  });
  const updateTenant = useMutation({
    mutationFn: (settings: UpdateTenantSettingsType) =>
      new FinancialRoutes().updateSettings(settings),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tenant-settings"] });
      client.invalidateQueries({ queryKey: ["my-cts"] });
      client.invalidateQueries({ queryKey: ["auth-catalog"] });
    },
  });
  const updateCatalogProfile = useMutation({
    mutationFn: (profile: UpdateCatalogProfileType) =>
      new SettingsRoutes().updateCatalogProfile(profile),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["catalog-profile"] });
      client.invalidateQueries({ queryKey: ["auth-catalog"] });
    },
  });
  return {
    createRule: createRule.mutateAsync,
    updateRule: updateRule.mutateAsync,
    deleteRule: deleteRule.mutateAsync,
    updateAvulso: updateAvulso.mutateAsync,
    updateTenant: updateTenant.mutateAsync,
    updateCatalogProfile: updateCatalogProfile.mutateAsync,
    isCreatingRule: createRule.isPending,
    isUpdatingRule: updateRule.isPending,
    isDeletingRule: deleteRule.isPending,
    isUpdatingAvulso: updateAvulso.isPending,
    isUpdatingTenant: updateTenant.isPending,
    isUpdatingCatalogProfile: updateCatalogProfile.isPending,
  };
}
