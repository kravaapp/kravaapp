import { COLORS } from "@/components/ClientHeader";
import { getHomeRoute } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import {
    Dumbbell,
    LayoutGrid,
    Settings,
    Users,
    Wallet,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProtectedLayout() {
  const { user } = useAuth();

  const insets = useSafeAreaInsets();

  if (!user) {
    return <Redirect href="/signIn" />;
  }

  if (user.role !== USER_ROLES.admin) {
    return <Redirect href={getHomeRoute(user.role)} />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.mainOrange,
        tabBarInactiveTintColor: COLORS.grayLabels,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 2 },
        tabBarIconStyle: { marginTop: 2 },
        tabBarStyle: {
          backgroundColor: COLORS.white,
          paddingTop: 8,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: "#ECEDEF",
          elevation: 8,
          shadowColor: "#111827",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Painel",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <LayoutGrid color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="students"
        options={{
          title: "Alunos",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
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
        name="financial"
        options={{
          title: "Financeiro",
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Wallet color={color} size={size} />,
        }}
      />

      <Tabs.Screen
        name="plans"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Ajustes",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
