import { TenantRoutes } from "@/routes/tenant.routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const joinRequestsKey = ["tenant-join-requests"];

export function usePendingJoinRequests() {
  const query = useQuery({
    queryKey: joinRequestsKey,
    queryFn: () => new TenantRoutes().getPendingJoinRequests(),
  });

  return {
    requests: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error
      ? (query.error as any).data?.detail ||
        query.error.message ||
        "Erro ao buscar solicitações"
      : null,
  };
}

export function useJoinRequestActions() {
  const client = useQueryClient();
  const invalidate = () => {
    client.invalidateQueries({ queryKey: joinRequestsKey });
    client.invalidateQueries({ queryKey: ["alunos"] });
  };
  const approve = useMutation({
    mutationFn: (id: string) => new TenantRoutes().approveJoinRequest(id),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: (id: string) => new TenantRoutes().rejectJoinRequest(id),
    onSuccess: invalidate,
  });

  return {
    approveJoinRequest: approve.mutateAsync,
    rejectJoinRequest: reject.mutateAsync,
    isSaving: approve.isPending || reject.isPending,
  };
}
