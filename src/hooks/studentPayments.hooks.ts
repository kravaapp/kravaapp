import { useAuth } from "@/hooks/auth.hooks";
import { PaymentsRoutes } from "@/routes/payments.routes";
import { USER_ROLES } from "@/types/auth.types";
import { useQuery } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";

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
