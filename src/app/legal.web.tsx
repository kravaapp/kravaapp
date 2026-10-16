import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";

const COLORS = {
  foreground: "#111827",
  background: "#ffffff",
  border: "#e5e7eb",
};

export default function LegalWebScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const section = params.section || "inicio";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.title}>Central de Transparência</Text>
      </View>
      <iframe
        src={`/transparencia.html#${section}`}
        title="Central de Transparência Krava"
        style={{
          width: "100%",
          flex: 1,
          border: 0,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: "100vh" as any,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
});
