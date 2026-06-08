import { useAuth } from "@/hooks/useAuth";
import { Redirect, Stack } from "expo-router";

export default function ProtectedLayout() {

    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return <Redirect  href="/signIn"/>;
    }

    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: "Home", headerShown: false }} />
        </Stack>
    );
}