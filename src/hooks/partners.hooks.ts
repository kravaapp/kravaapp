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
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 403 || error?.response?.status === 401) return false;
      return failureCount < 2;
    },
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

const myPartnerRequestKey = ["my-partner-request"];

export function useMyPartnerRequest() {
  const query = useQuery({
    queryKey: myPartnerRequestKey,
    queryFn: () => new TenantRoutes().getMyPartnerRequest(),
  });

  return {
    partnerRequest: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
    isError: query.isError,
    error: query.error,
  };
}

export function useCreatePartnerRequest() {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (partner: string) => new TenantRoutes().createPartnerRequest(partner),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: myPartnerRequestKey });
      client.invalidateQueries({ queryKey: ["plans", "current"] });
    },
  });

  return {
    createPartnerRequest: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}
