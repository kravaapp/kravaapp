import { CreateScheduleRequestSchema, GetAttendanceRequestSchema, GetBookingUserHistoryRequestSchema, GetMyMonthlyScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { AttendanceType, AulaType, CreateAulaType, MyMonthlyScheduleType, PaginatedAulas, PaginatedBookingUserHistory, PaginatedModalidades, PaginatedSchedule, ProfessorType, ScheduleType, TodayOccurrenceType, UpdateAulaType } from "@/types/schedules.types";
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

    async getModalidades() {
        return await api.get("/scheduling/modalidades", {
            searchParams: { page: 1, pageSize: 100 },
        }).json<PaginatedModalidades>();
    }

    async getProfessors() {
        return await api.get("/tenant/professors").json<ProfessorType[]>();
    }

    async createAula(params: CreateAulaType) {
        return await api.post("/scheduling/aulas", { json: params }).json<AulaType>();
    }

    async updateAula(id: string, params: UpdateAulaType) {
        return await api.put(`/scheduling/aulas/${id}`, { json: params }).json<AulaType>();
    }

    async deleteAula(id: string) {
        await api.delete(`/scheduling/aulas/${id}`);
    }

    async getSchedule(params: ScheduleRequestSchema) {
        return await api.get("/scheduling/ocorrencias", { searchParams: params }).json<PaginatedSchedule>();
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
}
