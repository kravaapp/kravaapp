import { AlunosRoutes } from "@/routes/alunos.routes";
import { GetAlunosRequestSchema } from "@/schemas/alunos.schemas";
import { CreateAlunoType, UpdateAlunoMeType, UpdateAlunoPaymentMethodsType, UpdateAlunoType } from "@/types/alunos.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useAlunos(params: GetAlunosRequestSchema) {
    const query = useQuery({
        queryKey: ["alunos", params],
        queryFn: async () => {
            const alunosRoutes = new AlunosRoutes();
            return await alunosRoutes.getAlunos(params);
        },
    });

    return {
        alunos: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar alunos"
            : null,
        refetch: query.refetch,
    };
}

export function useAlunoDetails(id: string | null) {
    const detail = useQuery({ queryKey: ["aluno", id], queryFn: () => new AlunosRoutes().getAluno(id!), enabled: !!id });
    const history = useQuery({ queryKey: ["aluno-history", id], queryFn: () => new AlunosRoutes().getHistory(id!), enabled: !!id });
    return { aluno: detail.data, history: history.data, isLoading: detail.isLoading, historyLoading: history.isLoading, hasError: detail.isError, historyError: history.isError };
}

export function useMeuPerfilAluno(enabled = true) {
    const client = useQueryClient();
    const profile = useQuery({
        queryKey: ["aluno", "me"],
        queryFn: () => new AlunosRoutes().getMyAluno(),
        enabled,
    });
    const update = useMutation({
        mutationFn: (data: UpdateAlunoMeType) => new AlunosRoutes().updateMyAluno(data),
        onSuccess: () => {
            client.invalidateQueries({ queryKey: ["aluno", "me"] });
            client.invalidateQueries({ queryKey: ["alunos"] });
        },
    });

    return {
        aluno: profile.data,
        isLoading: profile.isLoading,
        error: profile.error,
        updateMeuPerfil: update.mutateAsync,
        isSaving: update.isPending,
    };
}

export function useAlunoActions() {
    const client = useQueryClient();
    const refresh = (id?: string) => {
        client.invalidateQueries({ queryKey: ["alunos"] });
        if (id) {
            client.invalidateQueries({ queryKey: ["aluno", id] });
            // Marcar ou desmarcar o chip do parceiro cria ou encerra o acesso via parceiro.
            client.invalidateQueries({ queryKey: ["aluno-partner-access", id] });
        }
    };
    const create = useMutation({ mutationFn: (data: CreateAlunoType) => new AlunosRoutes().createAluno(data), onSuccess: () => refresh() });
    const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateAlunoType }) => new AlunosRoutes().updateAluno(id, data), onSuccess: (_, values) => refresh(values.id) });
    const level = useMutation({ mutationFn: ({ id, value }: { id: string; value: string | null }) => new AlunosRoutes().updateLevel(id, value), onSuccess: (_, values) => refresh(values.id) });
    const status = useMutation({ mutationFn: ({ id, value }: { id: string; value: string | null }) => new AlunosRoutes().updateStatus(id, value), onSuccess: (_, values) => refresh(values.id) });
    const payments = useMutation({ mutationFn: ({ id, data }: { id: string; data: UpdateAlunoPaymentMethodsType }) => new AlunosRoutes().updatePaymentMethods(id, data), onSuccess: (_, values) => refresh(values.id) });
    const remove = useMutation({
        mutationFn: (id: string) => new AlunosRoutes().deleteAluno(id),
        onSuccess: (_, id) => {
            refresh(id);
            client.removeQueries({ queryKey: ["aluno", id] });
        },
    });
    return { createAluno: create.mutateAsync, updateAluno: update.mutateAsync, updateLevel: level.mutateAsync, updateStatus: status.mutateAsync, updatePaymentMethods: payments.mutateAsync, deleteAluno: remove.mutateAsync, isDeleting: remove.isPending, isSaving: create.isPending || update.isPending || level.isPending || status.isPending || payments.isPending };
}

/** Parceiros ativos do aluno (um por parceiro), na visão do CT. */
export function useAlunoPartnerAccesses(id: string | null) {
    const query = useQuery({
        queryKey: ["aluno-partner-access", id],
        queryFn: () => new AlunosRoutes().getPartnerAccesses(id!),
        enabled: !!id,
    });
    return { partnerAccesses: query.data ?? [], isLoading: query.isLoading };
}

export function useEndAlunoPartnerAccess() {
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: ({ id, partner, reason }: { id: string; partner: string; reason?: string }) =>
            new AlunosRoutes().endPartnerAccess(id, partner, reason),
        retry: false,
        onSuccess: (_, { id }) => {
            void client.invalidateQueries({ queryKey: ["aluno-partner-access", id] });
            void client.invalidateQueries({ queryKey: ["aluno", id] });
            void client.invalidateQueries({ queryKey: ["alunos"] });
        },
    });
    return { endPartnerAccess: mutation.mutateAsync, isEnding: mutation.isPending };
}
