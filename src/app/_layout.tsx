import { AuthProvider } from "@/contexts/authContext";
import { Stack } from "expo-router";

export default function Layout() {
    return (
        <AuthProvider>
            <Stack>
                <Stack.Screen name="(protected)" options={{ headerShown: false, animation: "none" }} />
                <Stack.Screen name="signIn" options={{ headerShown: false, animation: "none" }} />
            </Stack>
        </AuthProvider>
    );
}
