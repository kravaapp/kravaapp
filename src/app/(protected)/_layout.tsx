import { COLORS } from "@/components/ClientHeader";
import { useAuth } from "@/hooks/useAuth";
import { Redirect, Tabs } from "expo-router";
import { CalendarIcon, Clock, CreditCardIcon, HomeIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProtectedLayout() {
    const { isAuthenticated } = useAuth();

    const insets = useSafeAreaInsets();

    if (!isAuthenticated) {
        return <Redirect href="/signIn" />;
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
                name="schedule"
                options={{
                    title: "Agendamento",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <CalendarIcon color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="paymentPlans"
                options={{
                    title: "Planos",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <CreditCardIcon color={color} size={size} />
                    ),
                }}
            />

            <Tabs.Screen
                name="history"
                options={{
                    title: "Histórico",
                    headerShown: false,
                    tabBarIcon: ({ color, size }) => (
                        <Clock color={color} size={size} />
                    ),
                }}
            />
        </Tabs>
    );
}