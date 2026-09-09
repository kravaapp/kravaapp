import { GetAlunosRequestSchema } from "@/schemas/alunos.schemas";
import { AlunoHistoryType, AlunoType, CreateAlunoType, PaginatedAlunos, UpdateAlunoPaymentMethodsType, UpdateAlunoType } from "@/types/alunos.types";
import api from "./client";

export class AlunosRoutes {
    constructor() {}

    async getAlunos(params: GetAlunosRequestSchema) {
        return await api.get("/membership/alunos", { searchParams: params }).json<PaginatedAlunos>();
    }
    async getAluno(id: string) {
        return api.get(`/membership/alunos/${id}`).json<AlunoType>();
    }
    async createAluno(data: CreateAlunoType) {
        await api.post("/membership/alunos", { json: data });
    }
    async updateAluno(id: string, data: UpdateAlunoType) {
        return api.put(`/membership/alunos/${id}`, { json: data }).json<AlunoType>();
    }
    async updateLevel(id: string, level: string | null) {
        await api.patch(`/membership/alunos/${id}/level`, { json: { level } });
    }
    async updateStatus(id: string, status: string | null) {
        await api.patch(`/membership/alunos/${id}/status`, { json: { status } });
    }
    async updatePaymentMethods(id: string, data: UpdateAlunoPaymentMethodsType) {
        await api.patch(`/membership/alunos/${id}/payment-methods`, { json: data });
    }
    async getHistory(id: string) {
        return api.get(`/membership/alunos/${id}/history`).json<AlunoHistoryType>();
    }
}
