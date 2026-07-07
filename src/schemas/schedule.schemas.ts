import z from "zod";

export const scheduleRequestSchema = z.object({
    startDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((value) => {
            const date = new Date(`${value}T00:00:00Z`);
            return !isNaN(date.getTime()) &&
                date.toISOString().slice(0, 10) === value;
        }, {
            message: "Data inválida",
        }),
    endDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((value) => {
            const date = new Date(`${value}T00:00:00Z`);
            return !isNaN(date.getTime()) &&
                date.toISOString().slice(0, 10) === value;
        }, {
            message: "Data inválida",
        }),
    search: z.string().optional(),
    openForEnrollment: z.boolean().optional(),
    modalityId: z.uuid().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
});

export const createScheduleRequestSchema = z.object({
    ocorrenciaId: z.uuid(),
});

export const getBookingUserHistoryRequestSchema = z.object({
    page: z.number().optional(),
    pageSize: z.number().optional(),
    modalityId: z.uuid().optional(),
});

export type GetBookingUserHistoryRequestSchema = z.infer<typeof getBookingUserHistoryRequestSchema>;
export type ScheduleRequestSchema = z.infer<typeof scheduleRequestSchema>;
export type CreateScheduleRequestSchema = z.infer<typeof createScheduleRequestSchema>;
