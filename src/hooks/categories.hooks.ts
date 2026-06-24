import { CategoriesRoutes } from "@/routes/categories.routes";
import { useQuery } from "@tanstack/react-query";

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