import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/contexts/authContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

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

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
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
              name="(tenant)"
              options={{ headerShown: false, animation: "none" }}
            />
          </Stack>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
