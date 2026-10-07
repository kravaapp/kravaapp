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
}
