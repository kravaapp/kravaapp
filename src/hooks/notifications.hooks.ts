import { useAuth } from "@/hooks/auth.hooks";
import { GetNotificationsParams, NotificationsRoutes } from "@/routes/notifications.routes";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

const routes = new NotificationsRoutes();

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const prevCountRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    prevCountRef.current = undefined;
  }, [user?.tenantId, user?.userId]);

  const query = useQuery({
    queryKey: ["notifications", "unread-count", user?.tenantId, user?.userId],
    queryFn: async () => {
      const data = await routes.getUnreadCount();
      return data.count;
    },
    enabled: !!user?.userId,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (query.data === undefined) return;
    if (prevCountRef.current !== undefined && query.data !== prevCountRef.current) {
      queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
      if (query.data > prevCountRef.current) {
        queryClient.invalidateQueries({ queryKey: ["admin-partner-requests"] });
        queryClient.invalidateQueries({ queryKey: ["tenant-join-requests"] });
      }
    }
    prevCountRef.current = query.data;
  }, [query.data, queryClient]);

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useNotifications(params?: GetNotificationsParams) {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["notifications", "list", user?.tenantId, user?.userId, params],
    queryFn: async () => {
      return await routes.getNotifications(params);
    },
    enabled: !!user?.userId,
    staleTime: 0,
  });

  return {
    notifications: query.data?.items ?? [],
    pagedResult: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    error: query.error
      ? (query.error as any).data?.detail ||
        query.error.message ||
        "Erro ao carregar notificações"
      : null,
    refetch: query.refetch,
  };
}

export function useNotificationActions() {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => routes.markAsRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => routes.markAllAsRead(),
    onSuccess: invalidate,
  });

  return {
    markAsRead: markRead.mutateAsync,
    markAllAsRead: markAllRead.mutateAsync,
    isMarkingRead: markRead.isPending,
    isMarkingAllRead: markAllRead.isPending,
  };
}

export function useRegisterDeviceToken() {
  const mutation = useMutation({
    mutationFn: ({
      token,
      platform,
    }: {
      token: string;
      platform: "ios" | "android" | "web";
    }) => routes.registerDeviceToken(token, platform),
  });

  return {
    registerDeviceToken: mutation.mutateAsync,
    isRegistering: mutation.isPending,
  };
}

