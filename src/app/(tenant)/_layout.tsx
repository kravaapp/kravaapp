import { useAuth } from "@/hooks/useAuth";
import { Redirect, Stack } from "expo-router";

export default function Layout() {
    const { selectTenantState } = useAuth();

    if (!selectTenantState) {
        return <Redirect href="/signIn" />;
    }
    return (
        <Stack>
            <Stack.Screen
                name="selectTenant"
                options={{ headerShown: false, animation: "none" }}
            />
        </Stack>
    );
}