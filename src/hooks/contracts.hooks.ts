import { ContractsRoutes } from "@/routes/contracts.routes";
import { useAuth } from "@/hooks/auth.hooks";
import { CreateContractType, SubscribeContractType } from "@/types/contracts.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSubscribeContract() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (contract: SubscribeContractType) =>
      new ContractsRoutes().subscribe(contract),
    retry: false,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payments", user?.tenantId, user?.userId] });
    },
  });

  return { subscribe: mutation.mutateAsync, isLoading: mutation.isPending };
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (contract: CreateContractType) =>
      new ContractsRoutes().createContract(contract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
      queryClient.invalidateQueries({ queryKey: ["aluno"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
  });

  return { createContract: mutation.mutateAsync, isLoading: mutation.isPending };
}
