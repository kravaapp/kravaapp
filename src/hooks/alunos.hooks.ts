import { AlunosRoutes } from "@/routes/alunos.routes";
import { GetAlunosRequestSchema } from "@/schemas/alunos.schemas";
import { useQuery } from "@tanstack/react-query";

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
