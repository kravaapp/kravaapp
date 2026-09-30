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
import { useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MENU_ITEMS = {
  index: { label: "Painel", Icon: LayoutGrid },
  students: { label: "Alunos", Icon: Users },
  classes: { label: "Aulas", Icon: Dumbbell },
  financial: { label: "Financeiro", Icon: Wallet },
  settings: { label: "Ajustes", Icon: Settings },
};

type AdminTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

function AdminTabBar({ state, navigation }: AdminTabBarProps) {
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const item = MENU_ITEMS[route.name as keyof typeof MENU_ITEMS];
        if (!item) return null;

        const focused = state.index === index;
        const { Icon, label } = item;

        return (
          <Pressable
            key={route.key}
            style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            }}
            onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
            <Icon color={focused ? COLORS.mainOrange : COLORS.grayLabels} size={21} strokeWidth={focused ? 2.3 : 2} />
            <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
      tabBar={(props) => <AdminTabBar {...props} />}
    >
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
          title: "Alunos",
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

      <Tabs.Screen
        name="financial"
        options={{
          title: "Financeiro",
          headerShown: false,
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
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingTop: 8,
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  item: {
    flex: 1,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  itemPressed: { opacity: 0.65 },
  indicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  indicatorActive: { backgroundColor: COLORS.mainOrange },
  label: { color: COLORS.grayLabels, fontSize: 11, fontWeight: "500" },
  labelActive: { color: COLORS.foreground, fontWeight: "600" },
});
