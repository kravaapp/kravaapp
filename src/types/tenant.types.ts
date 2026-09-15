export type PendingJoinRequestType = {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  planId: string | null;
  createdAtUtc: string;
};
