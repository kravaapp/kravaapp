import z from "zod";

export const getAlunosRequestSchema = z.object({
    status: z.string().optional(),
    search: z.string().optional(),
    level: z.string().optional(),
    paymentMethod: z.string().optional(),
    modalityId: z.uuid().optional(),
    page: z.number().optional(),
    pageSize: z.number().optional(),
    sortBy: z.string().optional(),
    sortDirection: z.string().optional(),
});

export type GetAlunosRequestSchema = z.infer<typeof getAlunosRequestSchema>;
