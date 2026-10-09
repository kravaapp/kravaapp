export type TenantPartnerType = {
  id: string;
  ctId: string;
  name: string;
  monthlyCheckInLimit: number;
  repasse: number;
  isActive: boolean;
  createdAtUtc?: string;
  updatedAtUtc?: string | null;
};

export type CreateTenantPartnerType = {
  name: string;
  monthlyCheckInLimit?: number;
  repasse?: number;
  isActive?: boolean;
};

export type UpdateTenantPartnerType = {
  name: string;
  monthlyCheckInLimit: number;
  repasse: number;
  isActive: boolean;
};

export type MyPartnerRequestType = {
  id: string | null;
  partner: string;
  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string | null;
  createdAtUtc?: string | null;
};
