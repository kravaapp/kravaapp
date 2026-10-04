import { CurvedTabBar } from "@/components/navigation/CurvedTabBar";
import { getHomeRoute } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";

export default function ProtectedLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/signIn" />;
  }

  if (
    !user.tenantId ||
    user.tenantId === "00000000-0000-0000-0000-000000000000" ||
    !user.tenantName?.trim()
  ) {
    return <Redirect href="/selectTenant" />;
  }

  if (
    user.role === USER_ROLES.professor ||
    user.role === USER_ROLES.instructor ||
    user.role === USER_ROLES.admin
  ) {
    return <Redirect href={getHomeRoute(user.role)} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CurvedTabBar {...props} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: "Agendar",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="paymentPlans"
        options={{
          title: "Planos",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          headerShown: false,
        }}
      />
      <Tabs.Screen name="pendingPayments" options={{ href: null }} />
      <Tabs.Screen name="payment" options={{ href: null }} />
    </Tabs>
  );
}
