import { CreateScheduleRequestSchema, ScheduleRequestSchema } from "@/schemas/schedule.schemas";
import { PaginatedSchedule, ScheduleType } from "@/types/schedules.types";
import api from "./client";

export class ScheduleRoutes {
    constructor() {}

    async getUserNextClass() {
        return await api.get("/scheduling/my-next-class").json<ScheduleType>();
    }

    async getUserWeekClasses() {
        return await api.get("/scheduling/my-week-classes").json<ScheduleType[]>();
    }

    async getSchedule(params: ScheduleRequestSchema) {
        return await api.get("/scheduling/ocorrencias", { searchParams: params }).json<PaginatedSchedule>();
    }

    async createSchedule(params: CreateScheduleRequestSchema) {
        console.log('params: ', params)
        return await api.post("/scheduling/bookings", {
            json: {
                ocorrenciaId: params.ocorrenciaId,
                source: 'str',
                isTrial: false
            }
        }).json<ScheduleType>();
    }
}