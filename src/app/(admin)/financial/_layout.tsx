import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { router, Stack, usePathname } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const sections = [
  { label: "Financeiro", href: "/(admin)/financial" },
  { label: "Planos", href: "/(admin)/financial/plans" },
] as const;

export default function FinancialLayout() {
  const pathname = usePathname();
  const activeSection = pathname.endsWith("/plans") ? "Planos" : "Financeiro";

  return (
    <SafeAreaView style={styles.container}>
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
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  navigation: { paddingHorizontal: 16, paddingTop: 16 },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    borderRadius: 8,
  },
  activeTab: { backgroundColor: "#fff" },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.mutedForeground },
  activeLabel: { color: COLORS.mainOrange },
});
