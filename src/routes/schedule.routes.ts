import { CreateScheduleRequestSchema, GetAttendanceRequestSchema, GetBookingUserHistoryRequestSchema, GetMyMonthlyScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { AttendanceType, AulaType, BookingSourcePreviewType, CreateAulaType, MyMonthlyScheduleType, PaginatedAulas, PaginatedBookingUserHistory, PaginatedModalidades, PaginatedSchedule, ProfessorType, ScheduleType, TodayOccurrenceType, UpdateAulaType } from "@/types/schedules.types";
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

    async getBookingSource(ocorrenciaId: string): Promise<BookingSourcePreviewType | null> {
        const preview = await api.get(`/scheduling/ocorrencias/${ocorrenciaId}/booking-source`).json<BookingSourcePreviewType>();
        // A API antiga não tem a rota: sem um "kind" conhecido, o modal segue sem a informação.
        return ["Plan", "Partner", "None"].includes(preview?.kind) ? preview : null;
    }

    async createSchedule(params: CreateScheduleRequestSchema) {
        return await api.post("/scheduling/bookings", {
            json: {
                ocorrenciaId: params.ocorrenciaId,
                source: 'str',
                isTrial: false
            }
        }).json<ScheduleType>();
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

    /** Endpoints sem corpo de resposta — a Response não é parseada. */
    async markPresent(bookingId: string) {
        await api.patch(`/scheduling/bookings/${bookingId}/mark-present`);
    }

    async markAbsent(bookingId: string) {
        await api.patch(`/scheduling/bookings/${bookingId}/mark-absent`);
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
