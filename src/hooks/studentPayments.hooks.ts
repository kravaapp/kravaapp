import { useAuth } from "@/hooks/auth.hooks";
import { PaymentsRoutes } from "@/routes/payments.routes";
import { USER_ROLES } from "@/types/auth.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PayInvoiceRequest } from "@/types/payments.types";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

export function useInvoicePayment(id: string, page?: number) {
  const { user } = useAuth();
  const client = useQueryClient();
  const enabled = !!id && !!user?.tenantId && user.role === USER_ROLES.student;
  const invoice = useQuery({
    queryKey: ["payments", user?.tenantId, user?.userId, "invoice", id, page ?? "default"],
    queryFn: () => new PaymentsRoutes().getMyInvoice(id, page),
    enabled,
    staleTime: 0,
  });
  const gateway = useQuery({
    queryKey: ["active-payment-gateway", user?.tenantId],
    queryFn: () => new PaymentsRoutes().getActiveGateway(),
    enabled,
    staleTime: 0,
  });
  const { refetch: refetchInvoices } = invoice;
  const { refetch: refetchGateway } = gateway;
  useFocusEffect(useCallback(() => {
    if (enabled) {
      void refetchInvoices();
      void refetchGateway();
    }
  }, [enabled, id, page, refetchInvoices, refetchGateway]));
  const mutation = useMutation({
    mutationFn: (request: PayInvoiceRequest) => new PaymentsRoutes().payInvoice(id, request),
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["payments", user?.tenantId, user?.userId] });
    },
  });
  const pay = async (request: PayInvoiceRequest) => {
    try {
      return await mutation.mutateAsync(request);
    } finally {
      mutation.reset();
    }
  };
  const refreshMembership = useCallback(() => Promise.all([
    client.invalidateQueries({ queryKey: ["payments", user?.tenantId, user?.userId] }),
    client.invalidateQueries({ queryKey: ["plans", "current", user?.tenantId, user?.userId] }),
    client.invalidateQueries({ queryKey: ["aluno", "me"] }),
    client.invalidateQueries({ queryKey: ["schedule"] }),
    client.invalidateQueries({ queryKey: ["my-monthly-schedule"] }),
    client.invalidateQueries({ queryKey: ["user-next-class"] }),
    client.invalidateQueries({ queryKey: ["user-week-classes"] }),
  ]), [client, user?.tenantId, user?.userId]);
  return { invoice, gateway, pay, refreshMembership, isPaying: mutation.isPending };
}

export function usePayments(page?: number) {
  const { user } = useAuth();
  const canFetch = !!user?.tenantId && user.role === USER_ROLES.student;
  const query = useQuery({
    queryKey: ["payments", user?.tenantId, user?.userId, page ?? "default"],
    queryFn: () => new PaymentsRoutes().getMyPayments(page),
    // As abas permanecem montadas: consultar sempre que a tela receber foco.
    enabled: false,
  });
  const { refetch } = query;
  useFocusEffect(useCallback(() => {
    if (canFetch) void refetch();
  }, [canFetch, user?.tenantId, user?.userId, page, refetch]));

  return {
    data: canFetch ? query.data : undefined,
    payments: canFetch ? query.data?.items ?? [] : [],
    isLoading: canFetch && query.isPending,
    isRefreshing: query.isFetching,
    error: query.error,
    refetch,
  };
}
