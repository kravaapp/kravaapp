export type NotificationType =
  | 'WaitlistPromoted'
  | 'ClassCancelled'
  | 'PaymentDue'
  | 'PaymentConfirmed'
  | 'ContractExpiring'
  | 'NoShow'
  | 'General'
  | 'Reengagement'
  | 'BookingConfirmed';

export interface NotificationDto {
  id: string;
  type: NotificationType | string;
  title: string;
  message: string;
  payload: string | null;
  isRead: boolean;
  readAtUtc: string | null;
  createdAtUtc: string;
}

export interface PaginatedNotifications {
  items: NotificationDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface UnreadNotificationCountDto {
  count: number;
}
