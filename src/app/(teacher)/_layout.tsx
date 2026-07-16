import { COLORS } from "@/components/ClientHeader";
import { getHomeRoute } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import { Dumbbell, HomeIcon, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProtectedLayout() {
    const { user } = useAuth();

    const insets = useSafeAreaInsets();

    if (!user) {
        return <Redirect href="/signIn" />;
    }

    if (user.role !== USER_ROLES.professor) {
        return <Redirect href={getHomeRoute(user.role)} />;
    }

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: COLORS.mainOrange,
                tabBarInactiveTintColor: COLORS.grayLabels,
                tabBarStyle: {
                    paddingTop: 5,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom,
                    borderTopWidth: 1,
                    borderTopColor: '#9fa2a8ff',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Início",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <HomeIcon color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="classes"
                options={{
                    title: "Aulas",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Dumbbell color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="students"
                options={{
                    title: "Alunos",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Users color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}
