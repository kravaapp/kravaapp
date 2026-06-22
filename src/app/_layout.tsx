import { AuthProvider } from "@/contexts/authContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";

const queryClient = new QueryClient();

export default function Layout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack>
          <Stack.Screen
            name="(protected)"
            options={{ headerShown: false, animation: "none" }}
          />
          <Stack.Screen
            name="signIn"
            options={{ headerShown: false, animation: "none" }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}