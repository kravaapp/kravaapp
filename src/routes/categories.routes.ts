import { Category } from "@/types/categories.types";
import api from "./client";

export class CategoriesRoutes {
    constructor() {}

    async getCategories() {
        return (await api.get("/scheduling/modalidades").json<{ items: Category[] }>()).items;
    }
}