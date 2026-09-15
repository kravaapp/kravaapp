import { PendingJoinRequestType } from "@/types/tenant.types";
import api from "./client";

export class TenantRoutes {
  async getPendingJoinRequests() {
    return api.get("/tenant/join-requests").json<PendingJoinRequestType[]>();
  }

  async approveJoinRequest(id: string) {
    await api.post(`/tenant/join-requests/${id}/approve`);
  }

  async rejectJoinRequest(id: string) {
    await api.post(`/tenant/join-requests/${id}/reject`);
  }
}
