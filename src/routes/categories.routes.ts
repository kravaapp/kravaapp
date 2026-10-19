import { Category, CreateCategory, UpdateCategory } from "@/types/categories.types";
import api from "./client";

export class CategoriesRoutes {
    constructor() {}

    async getCategories(params?: { isActive?: boolean; search?: string }) {
        return (await api.get("/scheduling/modalidades", { searchParams: params }).json<{ items: Category[] }>()).items;
    }

    async createCategory(data: CreateCategory) {
        return api.post("/scheduling/modalidades", { json: data }).json<Category>();
    }

    async updateCategory(id: string, data: UpdateCategory) {
        return api.put(`/scheduling/modalidades/${id}`, { json: data }).json<Category>();
    }
}
