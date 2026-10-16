import React, { useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { WebView } from "react-native-webview";
import { getTransparencyHtml } from "@/constants/legalContent";

const COLORS = {
  foreground: "#111827",
  background: "#ffffff",
  border: "#e5e7eb",
};

export default function LegalScreen() {
  const params = useLocalSearchParams<{ section?: string }>();
  const section = params.section || "inicio";
  const webViewRef = useRef<WebView>(null);

  const htmlContent = getTransparencyHtml(section);

  const injectedJs = `
    try {
      window.location.hash = "${section}";
      if (typeof openSection === "function") {
        openSection();
      }
    } catch (e) {}
    true;
  `;

  return (
    <SafeAreaView style={styles.safe}>
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
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          injectedJavaScript={injectedJs}
          style={styles.webview}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 52,
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
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  webviewContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
