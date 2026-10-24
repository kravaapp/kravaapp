import { CreateScheduleRequestSchema, GetAttendanceRequestSchema, GetBookingUserHistoryRequestSchema, GetMyMonthlyScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { AttendanceType, AulaType, BookingOptionsType, CreateAulaType, MarkAbsentResultType, MyMonthlyScheduleType, PaginatedAulas, PaginatedBookingUserHistory, PaginatedModalidades, PaginatedSchedule, ProfessorType, ScheduleType, TodayOccurrenceType, UpdateAulaType } from "@/types/schedules.types";
import api from "./client";

export class ScheduleRoutes {
    constructor() {}

    async getUserNextClass() {
        return await api.get("/scheduling/my-next-class").json<ScheduleType>();
    }

    async getUserWeekClasses() {
        return await api.get("/scheduling/my-week-classes").json<ScheduleType[]>();
    }

    async getTodayOccurrences() {
        return await api.get("/scheduling/ocorrencias/today").json<TodayOccurrenceType[]>();
    }

    async getAulas() {
        return await api.get("/scheduling/aulas", {
            searchParams: { activeOnly: true, page: 1, pageSize: 100 },
        }).json<PaginatedAulas>();
    }

    async getModalidades(params?: { isActive?: boolean; page?: number; pageSize?: number }) {
        return await api.get("/scheduling/modalidades", {
            searchParams: { page: 1, pageSize: 100, ...params },
        }).json<PaginatedModalidades>();
    }

    async getProfessors() {
        return await api.get("/tenant/professors").json<ProfessorType[]>();
    }

    async deleteProfessor(userId: string) {
        await api.delete(`/tenant/professors/${userId}`);
    }

    async createAula(params: CreateAulaType) {
        // A tela recarrega a grade após sucesso; não depende do formato do lote retornado.
        await api.post("/scheduling/aulas", { json: params });
    }

    async updateAula(id: string, params: UpdateAulaType) {
        return await api.put(`/scheduling/aulas/${id}`, { json: { ...params, isActive: true } }).json<AulaType>();
    }

    async deleteAula(id: string) {
        await api.delete(`/scheduling/aulas/${id}`);
    }

    async getSchedule(params: ScheduleRequestSchema) {
        return await api.get("/scheduling/ocorrencias", { searchParams: params }).json<PaginatedSchedule>();
    }

    async getBookingOptions(ocorrenciaId: string): Promise<BookingOptionsType | null> {
        const data = await api.get(`/scheduling/ocorrencias/${ocorrenciaId}/booking-options`).json<BookingOptionsType>();
        // Sem a lista (API antiga), o modal segue sem a escolha e a API decide a origem.
        return Array.isArray(data?.options) ? data : null;
    }

    async createSchedule(params: CreateScheduleRequestSchema) {
        return await api.post("/scheduling/bookings", {
            json: {
                ocorrenciaId: params.ocorrenciaId,
                source: 'App',
                isTrial: false,
                origin: params.origin ?? null,
            }
        }).json<ScheduleType>();
    }

    /** Check-in do aluno pelo app (quando o CT exige check-in). */
    async checkIn(bookingId: string) {
        await api.post(`/scheduling/bookings/${bookingId}/check-in`, { retry: 0 });
    }

    async deleteSchedule(bookingId: string) {
        await api.delete(`/scheduling/bookings/${bookingId}`);
    }

    async getBookingUserHistory(params: GetBookingUserHistoryRequestSchema) {
        return await api.get("/scheduling/my-history", { searchParams: params }).json<PaginatedBookingUserHistory>();
    }

    async getMyMonthlySchedule(params: GetMyMonthlyScheduleRequestSchema) {
        return await api.get("/checkin/my-status").json<MyMonthlyScheduleType>();
    }

    async getAttendance({ ocorrenciaId, status }: GetAttendanceRequestSchema) {
        return await api.get(`/scheduling/ocorrencias/${ocorrenciaId}/attendance`, {
            searchParams: { status }
        }).json<AttendanceType>();
    }

    /** Sem corpo de resposta — a Response não é parseada. */
    async markPresent(bookingId: string) {
        await api.patch(`/scheduling/bookings/${bookingId}/mark-present`);
    }

    /** Devolve quem da lista de espera entrou na vaga (a API antiga respondia sem corpo). */
    async markAbsent(bookingId: string): Promise<MarkAbsentResultType> {
        const response = await api.patch(`/scheduling/bookings/${bookingId}/mark-absent`);
        const body = await response.text();
        return body ? (JSON.parse(body) as MarkAbsentResultType) : { promotedStudentName: null };
    }

    /** Professor coloca na aula um aluno do CT que chegou sem reserva; devolve o id da reserva. */
    async addStudentToOcorrencia(ocorrenciaId: string, alunoUserId: string): Promise<string> {
        return await api.post(`/scheduling/ocorrencias/${ocorrenciaId}/students`, {
            json: { alunoId: alunoUserId },
        }).json<string>();
    }

    async closeOcorrencia(ocorrenciaId: string) {
        await api.post(`/scheduling/ocorrencias/${ocorrenciaId}/close`);
    }

    async cancelOcorrencia(ocorrenciaId: string, reason?: string) {
        await api.post(`/scheduling/ocorrencias/${ocorrenciaId}/cancel`, {
            json: { reason: reason || null }
        });
    }
}
