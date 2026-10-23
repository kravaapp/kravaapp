import { useAuth } from "@/hooks/auth.hooks";
import { useRegisterDeviceToken } from "@/hooks/notifications.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { useQueryClient } from "@tanstack/react-query";
import { isRunningInExpoGo } from "expo";
import Constants from "expo-constants";
import type * as NotificationsType from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// In Expo SDK 53+, remote push notifications were removed from Expo Go on Android.
// In Android Expo Go, requiring expo-notifications throws an uncaught error at module load.
export const isAndroidExpoGo = Platform.OS === "android" && isRunningInExpoGo();

let Notifications: typeof NotificationsType | null = null;
if (!isAndroidExpoGo && Platform.OS !== "web") {
  try {
    Notifications = require("expo-notifications");
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.warn("Failed to load expo-notifications:", e);
  }
}

export function handleNotificationNavigation(
  data: Record<string, any> | undefined,
  userRole?: string
) {
  if (!data) return;

  // 1. If explicit url is provided in data payload
  if (data.url && typeof data.url === "string") {
    try {
      router.push(data.url as any);
      return;
    } catch (e) {
      console.warn("Failed to navigate to data.url:", data.url, e);
    }
  }

  const type = data.type || data.notificationType;
  const isAdmin = userRole === USER_ROLES.admin;
  const isTeacher =
    userRole === USER_ROLES.professor ||
    userRole === USER_ROLES.instructor ||
    userRole === "Professor" ||
    userRole === "Instrutor";

  // 1. Visão do Administrador
  if (isAdmin) {
    if (
      type === "PaymentDue" ||
      type === "PaymentConfirmed" ||
      type === "admin_payment_confirmed"
    ) {
      router.push("/(admin)/financial");
    } else if (
      type === "WaitlistPromoted" ||
      type === "BookingConfirmed" ||
      type === "ClassCancelled" ||
      type === "class_cancelled"
    ) {
      router.push("/(admin)/classes");
    } else if (
      type === "Reengagement" ||
      data.type === "churn_risk" ||
      data.type === "admin_churn_alert"
    ) {
      router.push("/(admin)/churn");
    } else if (
      type === "join_request_created" ||
      type === "partner_request_created"
    ) {
      router.push({
        pathname: "/(admin)/students",
        params: { section: "requests" },
      });
    } else if (type === "aluno_delinquent_booked") {
      router.push("/(admin)/students");
    } else if (type === "class_assigned") {
      // Admin que também dá aula e recebeu uma aula de outro admin.
      router.push("/(admin)/classes");
    } else {
      router.push("/(admin)");
    }
    return;
  }

  // 2. Visão do Professor
  if (isTeacher) {
    if (
      type === "WaitlistPromoted" ||
      type === "BookingConfirmed" ||
      type === "ClassCancelled" ||
      type === "class_cancelled"
    ) {
      router.push("/(teacher)/classes");
    } else {
      router.push("/(teacher)");
    }
    return;
  }

  // 3. Visão do Aluno (default)
  if (type === "PaymentDue" || type === "PaymentConfirmed") {
    const invoiceId = data.cobrancaId || data.invoiceId || data.id;
    const isValidUuid =
      typeof invoiceId === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        invoiceId
      );

    if (isValidUuid) {
      router.push({
        pathname: "/(user)/payment",
        params: { id: invoiceId },
      });
    } else {
      router.push("/(user)/pendingPayments");
    }
  } else if (
    type === "WaitlistPromoted" ||
    type === "BookingConfirmed" ||
    type === "ClassCancelled" ||
    type === "class_cancelled" ||
    type === "class_created" ||
    type === "Reengagement"
  ) {
    router.push("/schedule");
  } else if (type === "ContractExpiring") {
    router.push("/(user)/paymentPlans");
  } else if (type === "join_request_approved") {
    router.push("/(user)");
  } else if (
    type === "partner_request_approved" ||
    type === "partner_request_rejected"
  ) {
    router.push("/(user)/paymentPlans");
  } else {
    router.push("/(user)");
  }
}

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { registerDeviceToken } = useRegisterDeviceToken();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<any>(null);

  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  const registerForPushNotificationsAsync = useCallback(async () => {
    if (Platform.OS === "web") {
      return null;
    }

    if (isAndroidExpoGo) {
      console.warn(
        "📲 [KRAVA PUSH] No Android dentro do Expo Go (SDK 53+), notificações remotas exigem Development Build (npx expo run:android). Teste no iOS pelo Expo Go ou gere uma development build."
      );
      return null;
    }

    if (!Notifications) {
      return null;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      setPermissionStatus(finalStatus);

      if (finalStatus !== "granted") {
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        (Constants as any).easConfig?.projectId;

      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );

      const token = tokenResult.data;
      setExpoPushToken(token);
      console.log("📲 [KRAVA PUSH] Token do dispositivo:", token);

      if (token && user?.userId) {
        const platform =
          Platform.OS === "ios"
            ? "ios"
            : Platform.OS === "android"
            ? "android"
            : "web";
        await registerDeviceToken({ token, platform });
      }

      return token;
    } catch (error) {
      console.warn("Failed to get push token:", error);
      return null;
    }
  }, [user?.userId, registerDeviceToken]);

  const sendTestNotification = useCallback(async () => {
    if (!Notifications) {
      console.warn("Notifications not available on this platform/environment.");
      return;
    }
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🥋 Krava: Aula Confirmada!",
          body: "Você garantiu sua vaga para o treino de hoje. Toque para ver.",
          data: { type: "BookingConfirmed" },
          sound: "default",
          priority: Notifications.AndroidNotificationPriority?.HIGH,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn("Failed to schedule test notification:", e);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === "web" || isAndroidExpoGo || !Notifications) return;

    // 1. Foreground listener: invalidate queries so badge count and pending requests refresh in real-time
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["admin-partner-requests"] });
        queryClient.invalidateQueries({ queryKey: ["tenant-join-requests"] });
      });

    // 2. Response listener: user tapped on notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, user?.role);
      });

    // 3. Cold start: check if app was opened by clicking a notification
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, user?.role);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.role, queryClient]);

  // If already logged in and permission granted, ensure token is registered
  useEffect(() => {
    if (
      user?.userId &&
      Platform.OS !== "web" &&
      !isAndroidExpoGo &&
      Notifications
    ) {
      Notifications.getPermissionsAsync().then(({ status }) => {
        setPermissionStatus(status);
        if (status === "granted") {
          registerForPushNotificationsAsync();
        }
      });
    }
  }, [user?.userId, registerForPushNotificationsAsync]);

  return {
    expoPushToken,
    permissionStatus,
    isAndroidExpoGo,
    registerForPushNotificationsAsync,
    sendTestNotification,
  };
}
