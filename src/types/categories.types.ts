export interface Category {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    createdAtUtc: string;
    defaultCapacity: number;
}

export type CreateCategory = {
    name: string | null;
    description: string | null;
    defaultCapacity: number;
};

export type UpdateCategory = CreateCategory & { isActive: boolean };
