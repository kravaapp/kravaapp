import KeyboardDismissView from "@/components/KeyboardDismissView";
import { NotificationPermissionModal } from "@/components/NotificationPermissionModal";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      retryOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: false,
    },
  },
});

function PushNotificationManager() {
  const { user } = useAuth();
  const { permissionStatus, isAndroidExpoGo, registerForPushNotificationsAsync } =
    usePushNotifications();
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!user?.userId || Platform.OS === "web" || isAndroidExpoGo) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    async function checkPrompt() {
      if (permissionStatus === "granted") return;

      try {
        const dismissedAt = await AsyncStorage.getItem(
          "@krava:push_prompt_dismissed_at"
        );
        if (!dismissedAt) {
          timeoutId = setTimeout(() => {
            setModalVisible(true);
          }, 1500);
        }
      } catch {}
    }

    checkPrompt();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user?.userId, permissionStatus]);

  return (
    <NotificationPermissionModal
      visible={modalVisible}
      onClose={() => setModalVisible(false)}
      onRequestPermission={registerForPushNotificationsAsync}
    />
  );
}

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PushNotificationManager />
        <ToastProvider>
          <KeyboardDismissView>
            <Stack>
              <Stack.Screen
                name="(user)"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="(teacher)"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="(admin)"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="signIn"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="forgotPassword"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="confirmEmail"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="profile"
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="definir-senha"
                options={{ headerShown: false, animation: "none" }}
              />
              <Stack.Screen
                name="(tenant)"
                options={{ headerShown: false, animation: "none" }}
              />
            </Stack>
          </KeyboardDismissView>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
