import { CreateScheduleRequestSchema, GetAttendanceRequestSchema, GetBookingUserHistoryRequestSchema, GetMyMonthlyScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { AttendanceType, MyMonthlyScheduleType, PaginatedBookingUserHistory, PaginatedSchedule, ScheduleType, TodayOccurrenceType } from "@/types/schedules.types";
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