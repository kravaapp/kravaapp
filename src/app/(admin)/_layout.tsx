import { AdminDockTabBar } from "@/components/navigation/AdminDockTabBar";
import { getHomeRoute } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";

export default function ProtectedLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Redirect href="/signIn" />;
  }

  if (user.role !== USER_ROLES.admin) {
    return <Redirect href={getHomeRoute(user.role)} />;
  }

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AdminDockTabBar {...props} />}
    >
      {/* 3 Abas Primárias do Dock */}
      <Tabs.Screen
        name="index"
        options={{
          title: "Painel",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="students"
        options={{
          title: "Membros",
          headerShown: false,
        }}
      />

      <Tabs.Screen
        name="classes"
        options={{
          title: "Aulas",
          headerShown: false,
        }}
      />

      {/* Rotas Secundárias acessadas pelo Launcher (+) */}
      <Tabs.Screen
        name="financial"
        options={{
          title: "Financeiro",
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="plans"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="modalities"
        options={{
          title: "Modalidades",
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Políticas do CT",
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil do CT",
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
