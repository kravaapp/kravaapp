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
      void client.invalidateQueries({ queryKey: ["active-payment-gateway", user?.tenantId] });
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

export function useActivePaymentGateway() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["active-payment-gateway", user?.tenantId],
    queryFn: async () => {
      try {
        return await new PaymentsRoutes().getActiveGateway();
      } catch (error: any) {
        // Se retornar 404 / GatewayConfigNotFound, CT não tem gateway ativo
        if (error?.response?.status === 404) {
          return null;
        }
        return null;
      }
    },
    enabled: !!user?.tenantId,
    retry: false,
  });

  return {
    gateway: query.data ?? null,
    hasActiveGateway: !!query.data?.gateway,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/* Cobranças de um aluno na visão do CT; `enabled` adia a busca até a aba "Cobranças" ser aberta. */
export function useStudentInvoicesAdmin(alunoId?: string, enabled = true) {
  const query = useQuery({
    queryKey: ["student-invoices", alunoId],
    queryFn: () => new PaymentsRoutes().getStudentInvoices(alunoId!),
    enabled: !!alunoId && enabled,
  });

  return {
    invoices: query.data?.items ?? [],
    totalCount: query.data?.totalCount ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/* Baixa, cancelamento e estorno mudam status do aluno, contratos e indicadores financeiros. */
function useInvoiceMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<void>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: () => {
      for (const key of ["student-invoices", "aluno", "alunos", "contracts", "financial-summary", "admin-financial-dashboard"]) {
        void client.invalidateQueries({ queryKey: [key] });
      }
    },
  });
}

export function useConfirmManualPayment() {
  const mutation = useInvoiceMutation(
    ({ id, paidAmount, paymentMethod }: { id: string; paidAmount: number; paymentMethod: string }) =>
      new PaymentsRoutes().confirmManualPayment(id, { paidAmount, paymentMethod }),
  );

  return {
    confirmPayment: (id: string, paidAmount: number, paymentMethod: string) =>
      mutation.mutateAsync({ id, paidAmount, paymentMethod }),
    isConfirming: mutation.isPending,
  };
}

export function useCancelInvoice() {
  const mutation = useInvoiceMutation(({ id, notes }: { id: string; notes?: string }) =>
    new PaymentsRoutes().cancelInvoice(id, notes),
  );

  return {
    cancelInvoice: (id: string, notes?: string) => mutation.mutateAsync({ id, notes }),
    isCancelling: mutation.isPending,
  };
}

export function useRefundInvoice() {
  const mutation = useInvoiceMutation(({ id, notes }: { id: string; notes?: string }) =>
    new PaymentsRoutes().refundInvoice(id, notes),
  );

  return {
    refundInvoice: (id: string, notes?: string) => mutation.mutateAsync({ id, notes }),
    isRefunding: mutation.isPending,
  };
}
