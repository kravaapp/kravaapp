import { PaginatedNotifications, UnreadNotificationCountDto } from "@/types/notifications.types";
import api from "./client";

export interface GetNotificationsParams {
  unreadOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export class NotificationsRoutes {
  async getUnreadCount(): Promise<UnreadNotificationCountDto> {
    return await api.get("/notifications/unread-count").json<UnreadNotificationCountDto>();
  }

  async getNotifications(params?: GetNotificationsParams): Promise<PaginatedNotifications> {
    const searchParams: Record<string, any> = {};
    if (params?.unreadOnly !== undefined) searchParams.unreadOnly = params.unreadOnly;
    if (params?.page !== undefined) searchParams.page = params.page;
    if (params?.pageSize !== undefined) searchParams.pageSize = params.pageSize;

    return await api.get("/notifications", { searchParams }).json<PaginatedNotifications>();
  }

  async markAsRead(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/read`);
  }

  async markAllAsRead(): Promise<void> {
    await api.patch("/notifications/read-all");
  }
}
