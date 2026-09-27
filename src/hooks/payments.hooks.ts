import { useAuth } from "@/hooks/auth.hooks";
import { PaymentsRoutes } from "@/routes/payments.routes";
import { PaymentGateway, PaymentGatewayConfiguration, UpdatePaymentGateway } from "@/types/payments.types";
import { updateGatewayStatuses } from "@/utils/paymentGateways";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function usePaymentGateways() {
  const { user } = useAuth();
  const client = useQueryClient();
  const queryKey = ["payment-gateways", user?.tenantId];
  const query = useQuery({
    queryKey,
    queryFn: () => new PaymentsRoutes().getGateways(),
    enabled: !!user?.tenantId,
  });
  const mutation = useMutation({
    mutationFn: ({ gateway, configuration }: { gateway: PaymentGateway; configuration: UpdatePaymentGateway }) =>
      new PaymentsRoutes().updateGateway(gateway, configuration),
    gcTime: 0,
    retry: false,
    onSuccess: (_, { gateway, configuration }) => {
      client.setQueryData<PaymentGatewayConfiguration[]>(queryKey, (previous = []) =>
        updateGatewayStatuses(previous, gateway, configuration.isActive),
      );
      void client.invalidateQueries({ queryKey });
    },
  });

  const saveGateway = async (gateway: PaymentGateway, configuration: UpdatePaymentGateway) => {
    try {
      await mutation.mutateAsync({ gateway, configuration });
    } finally {
      // Remove as credenciais do estado da mutation ao concluir a requisição.
      mutation.reset();
    }
  };

  return {
    configurations: query.data ?? [],
    hasData: query.data !== undefined,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    saveGateway,
    isSaving: mutation.isPending,
  };
}
