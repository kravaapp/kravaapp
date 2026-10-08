export type PendingJoinRequestType = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  planId: string | null;
  createdAtUtc: string;
};

export type CtInvitationSummaryType = {
  id: string;
  ctId: string;
  ctName: string;
  email: string;
  role: string;
  status: string;
  planId?: string | null;
  isPaidLocally: boolean;
  createdAtUtc: string;
};

