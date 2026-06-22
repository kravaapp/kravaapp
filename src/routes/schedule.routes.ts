import { UserNextClass } from "@/types/schedules.types";
import api from "./client";

export class ScheduleRoutes {
    constructor() {}

    async getUserNextClass() {
        return await api.get("/scheduling/my-next-class").json<UserNextClass | null>();
    }

    async getUserWeekClasses() {
        return await api.get("/scheduling/my-week-classes").json<UserNextClass[] | null>();
    }
}