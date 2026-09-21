import { ContractsRoutes } from "@/routes/contracts.routes";
import { CreateContractType } from "@/types/contracts.types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateContract() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (contract: CreateContractType) =>
      new ContractsRoutes().createContract(contract),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      queryClient.invalidateQueries({ queryKey: ["alunos"] });
    },
  });

  return { createContract: mutation.mutateAsync, isLoading: mutation.isPending };
}
