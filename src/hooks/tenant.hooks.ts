import { TenantRoutes } from "@/routes/tenant.routes";
import {
  ImageUploadCategoryType,
  PickedImageType,
} from "@/types/upload.types";
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
    refetch: query.refetch,
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

/**
 * Envia a imagem e devolve a URL pública. Sem invalidação de query: quem
 * persiste a URL nova é o formulário da tela, no salvar dele — o upload sozinho
 * não muda a configuração do tenant.
 */
export function useUploadTenantImage() {
  const upload = useMutation({
    mutationFn: ({
      file,
      category,
    }: {
      file: PickedImageType;
      category: ImageUploadCategoryType;
    }) => new TenantRoutes().uploadImage(file, category),
  });

  return { uploadImage: upload.mutateAsync, isUploading: upload.isPending };
}

export function useCtInvitations(role?: string) {
  const query = useQuery({
    queryKey: ["tenant-invitations", role ?? "all"],
    queryFn: () => new TenantRoutes().getInvitations(role),
  });

  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    error: query.error
      ? (query.error as any).data?.detail ||
        query.error.message ||
        "Erro ao buscar convites"
      : null,
  };
}

export function useCancelCtInvitation() {
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: (id: string) => new TenantRoutes().cancelInvitation(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["tenant-invitations"] });
      client.invalidateQueries({ queryKey: ["professors"] });
    },
  });

  return {
    cancelInvitation: cancel.mutateAsync,
    isCancelling: cancel.isPending,
  };
}

