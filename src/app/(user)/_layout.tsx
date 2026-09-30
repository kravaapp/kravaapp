import { getHomeRoute } from "@/contexts/authContext";
import { useAuth } from "@/hooks/auth.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { Redirect, Tabs } from "expo-router";
import {
  CalendarIcon,
  Clock,
  CreditCardIcon,
  HomeIcon,
} from "lucide-react-native";
import { useEffect, useState, type ComponentProps } from "react";
import { Keyboard, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const BRAND_ORANGE = "#E85C07";
const INACTIVE = "#6B7280";

const MENU_ITEMS = {
  index: { label: "Início", Icon: HomeIcon },
  schedule: { label: "Agendar", Icon: CalendarIcon },
  paymentPlans: { label: "Planos", Icon: CreditCardIcon },
  history: { label: "Histórico", Icon: Clock },
};

type StudentTabBarProps = Parameters<
  NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

function StudentTabBar({ state, navigation }: StudentTabBarProps) {
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

  if (keyboardVisible || state.routes[state.index]?.name === "payment") return null;

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
            <Icon color={focused ? BRAND_ORANGE : INACTIVE} size={21} strokeWidth={focused ? 2.3 : 2} />
            <Text style={[styles.label, focused && styles.labelActive]}>{label}</Text>
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
      tabBar={(props) => <StudentTabBar {...props} />}
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

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
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
  },
  itemPressed: {
    opacity: 0.65,
  },
  indicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    marginBottom: 4,
    backgroundColor: "transparent",
  },
  indicatorActive: {
    backgroundColor: BRAND_ORANGE,
  },
  label: {
    color: INACTIVE,
    fontSize: 12,
    fontWeight: "500",
  },
  labelActive: {
    color: "#111827",
    fontWeight: "600",
  },
});
