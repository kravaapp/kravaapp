import { CategoriesRoutes } from "@/routes/categories.routes";
import { CreateCategory, UpdateCategory } from "@/types/categories.types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useCategories() {
    const query = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const categoriesRoutes = new CategoriesRoutes();
            return await categoriesRoutes.getCategories();
        },
    });

    return {
        categories: query.data,
        isLoading: query.isLoading,
        error: query.error
            ? (query.error as any).data?.detail ||
            query.error.message ||
            "Erro ao buscar categorias"
            : null,
        refetch: query.refetch,
    };
}

export function useCategoryActions() {
    const queryClient = useQueryClient();
    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["categories"] });
    const create = useMutation({
        mutationFn: (data: CreateCategory) => new CategoriesRoutes().createCategory(data),
        onSuccess: invalidate,
    });
    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateCategory }) =>
            new CategoriesRoutes().updateCategory(id, data),
        onSuccess: invalidate,
    });

    return {
        createCategory: create.mutateAsync,
        updateCategory: update.mutateAsync,
        isSaving: create.isPending || update.isPending,
    };
}
