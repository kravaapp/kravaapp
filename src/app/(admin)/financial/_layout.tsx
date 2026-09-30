import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { router, Stack, usePathname } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const sections = [
  { label: "Financeiro", href: "/(admin)/financial" },
  { label: "Planos", href: "/(admin)/financial/plans" },
  { label: "Gateways", href: "/(admin)/financial/gateways" },
] as const;

export default function FinancialLayout() {
  const pathname = usePathname();
  const activeSection = pathname.endsWith("/gateways")
    ? "Gateways"
    : pathname.endsWith("/plans") ? "Planos" : "Financeiro";

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ClientHeader />
      <View style={styles.navigation}>
        <View style={styles.tabs}>
          {sections.map((section) => {
            const selected = activeSection === section.label;
            return (
              <TouchableOpacity
                key={section.label}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                activeOpacity={0.75}
                style={[styles.tab, selected && styles.activeTab]}
                onPress={() => {
                  if (!selected) router.replace(section.href);
                }}
              >
                <Text style={[styles.label, selected && styles.activeLabel]}>
                  {section.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <Stack screenOptions={{ headerShown: false, animation: "none" }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="plans" />
        <Stack.Screen name="gateways" />
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  navigation: { paddingHorizontal: 20, paddingTop: 8 },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E8EB",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: { borderBottomColor: COLORS.mainOrange },
  label: { fontSize: 13, fontWeight: "600", color: COLORS.mutedForeground },
  activeLabel: { color: COLORS.mainOrange, fontWeight: "800" },
});
