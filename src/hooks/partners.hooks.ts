import { TenantRoutes } from "@/routes/tenant.routes";
import {
  CreateTenantPartnerType,
  TenantPartnerType,
  UpdateTenantPartnerType,
} from "@/types/partners.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const partnersKey = ["tenant-partners"];

export function useTenantPartners(onlyActive = false) {
  const query = useQuery({
    queryKey: [...partnersKey, onlyActive],
    queryFn: () => new TenantRoutes().getPartners(onlyActive),
  });

  return {
    partners: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}

export function usePartnerActions() {
  const client = useQueryClient();
  const invalidate = () => {
    client.invalidateQueries({ queryKey: partnersKey });
    client.invalidateQueries({ queryKey: ["tenant-settings"] });
  };

  const create = useMutation({
    mutationFn: (partner: CreateTenantPartnerType) =>
      new TenantRoutes().createPartner(partner),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ id, partner }: { id: string; partner: UpdateTenantPartnerType }) =>
      new TenantRoutes().updatePartner(id, partner),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (id: string) => new TenantRoutes().deletePartner(id),
    onSuccess: invalidate,
  });

  return {
    createPartner: create.mutateAsync,
    updatePartner: update.mutateAsync,
    deletePartner: remove.mutateAsync,
    isCreating: create.isPending,
    isUpdating: update.isPending,
    isDeleting: remove.isPending,
    isSaving: create.isPending || update.isPending || remove.isPending,
  };
}
