import { PaginatedType } from "./schedules.types";

export type PlanType = {
    id: string;
    name: string;
    description: string;
    price: number;
    durationDays: number;
    maxClassesPerWeek: number | null;
    maxClassesPerDay: number | null;
    allowsAllModalidades: boolean;
    isRecurring: boolean;
    isActive: boolean;
    /** Faixa de horário "HH:MM"; null = qualquer horário (fim "00:00" = até a meia-noite). */
    startTime?: string | null;
    endTime?: string | null;
    modalidadeIds: string[] | null;
}

export type AdminPlanType = {
    id: string;
    name: string | null;
    description: string | null;
    price?: number;
    durationDays: number;
    maxClassesPerWeek?: number | null;
    maxClassesPerDay?: number | null;
    allowsAllModalidades: boolean;
    isRecurring: boolean;
    isActive: boolean;
    modalidadeIds?: string[] | null;
    startTime?: string | null;
    endTime?: string | null;
}

export type CreateAdminPlanType = {
    name: string;
    description: string | null;
    price: number;
    durationDays: number;
    maxClassesPerWeek?: number | null;
    maxClassesPerDay?: number | null;
    allowsAllModalidades: boolean;
    isRecurring: boolean;
    startTime?: string | null;
    endTime?: string | null;
}

export type UpdateAdminPlanType = CreateAdminPlanType & { isActive: boolean };
export type PaginatedAdminPlans = PaginatedType & { items: AdminPlanType[] | null; totalPages: number; pageNumber?: number };

export type PaginatedPlanType = PaginatedType & {
    items: PlanType[];
}

export type CurrentPlanType = {
    contratoId: string;
    planoName: string;
    startDate: string;
    endDate: string;
    status: string;
    maxClassesPerMonth: number | null;
    classesUsedThisMonth: number;
    classesRemainingThisMonth: number | null;
    modalitiesPermitted: string[];
    autoRenew: boolean;
    /** Saldo semanal do plano (o limite aplicado no agendamento). */
    maxClassesPerWeek?: number | null;
    classesUsedThisWeek?: number;
    classesRemainingThisWeek?: number | null;
    maxClassesPerDay?: number | null;
    startTime?: string | null;
    endTime?: string | null;
}

export type PlanRequestItemType = {
    id: string;
    alunoId: string;
    alunoName: string;
    planoId: string;
    planoName: string;
    planoPrice: number;
    status: string;
    rejectionReason: string | null;
    createdAtUtc: string;
};

export type MyPlanRequestType = {
    id: string;
    planoId: string;
    planoName: string;
    planoPrice: number;
    status: string;
    createdAtUtc: string;
};
