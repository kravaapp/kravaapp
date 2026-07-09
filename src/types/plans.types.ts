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
    isActive: boolean;
    modalidadeIds: string[] | null;
}

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
