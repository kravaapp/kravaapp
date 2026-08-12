import { GetAlunosRequestSchema } from "@/schemas/alunos.schemas";
import { PaginatedAlunos } from "@/types/alunos.types";
import api from "./client";

export class AlunosRoutes {
    constructor() {}

    async getAlunos(params: GetAlunosRequestSchema) {
        return await api.get("/membership/alunos", { searchParams: params }).json<PaginatedAlunos>();
    }
}
