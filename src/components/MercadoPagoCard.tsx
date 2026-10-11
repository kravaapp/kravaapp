import { cardPaymentFieldsSchema } from "@/schemas/payments.schemas";
import { createMercadoPagoCardHtml, MercadoPagoCardProps } from "@/utils/mercadoPagoCard";
import { publicBaseUrl } from "@/utils/apiUrl";
import { AlertCircle, RefreshCw, ShieldCheck } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

export default function MercadoPagoCard({
  onToken,
  onError,
  onFallbackToPix,
  ...config
}: MercadoPagoCardProps) {
  const webview = useRef<WebView>(null);
  const processing = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTimeout, setIsTimeout] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // No Web (iframe), escutar postMessage da janela pai
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleWebMessage = async (event: MessageEvent) => {
      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (data?.type === "card-ready") {
        setIsLoading(false);
        setIsTimeout(false);
        return;
      }

      if (data?.type === "card-error") {
        if (typeof data.message === "string") onError(data.message);
        return;
      }

      if (data?.type !== "card-token") return;
      const result = cardPaymentFieldsSchema.safeParse(data.fields);
      if (!result.success) {
        onError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
        return;
      }

      if (processing.current) return;
      processing.current = true;
      try {
        await onToken(result.data);
      } finally {
        processing.current = false;
        window.postMessage("krava-unlock", "*");
      }
    };

    window.addEventListener("message", handleWebMessage);
    return () => window.removeEventListener("message", handleWebMessage);
  }, [onError, onToken]);

  // Animação de pulso do Skeleton
  useEffect(() => {
    if (!isLoading) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [isLoading, pulseAnim]);

  // Timeout de 10 segundos para carregar o SDK
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => {
      setIsTimeout(true);
    }, 10000);
    return () => clearTimeout(timer);
  }, [isLoading, retryKey]);

  const handleRetry = () => {
    setIsTimeout(false);
    setIsLoading(true);
    setRetryKey((prev) => prev + 1);
  };

  const html = useMemo(
    () => createMercadoPagoCardHtml(config),
    [config.publicKey, config.amount, config.customerName, config.customerDocument],
  );

  return (
    <View style={styles.container}>
      {/* WebView permanece montada em segundo plano para inicializar o SDK */}
      {!isTimeout && (
        <WebView
          key={retryKey}
          ref={webview}
          style={[styles.webview, isLoading && styles.hiddenWebview]}
          source={{ html, baseUrl: publicBaseUrl }}
          originWhitelist={["https://*"]}
          javaScriptEnabled
          onError={() => {
            onError("Não foi possível abrir o checkout. Tente novamente.");
            setIsTimeout(true);
          }}
          onMessage={async (event) => {
            if (processing.current) return;
            let message;
            try {
              message = JSON.parse(event.nativeEvent.data);
            } catch {
              return;
            }

            if (message?.type === "card-ready") {
              setIsLoading(false);
              setIsTimeout(false);
              return;
            }

            if (message?.type === "card-error") {
              if (typeof message.message === "string") onError(message.message);
              return;
            }

            if (message?.type !== "card-token") return;
            const result = cardPaymentFieldsSchema.safeParse(message.fields);
            if (!result.success) {
              onError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
              return;
            }

            processing.current = true;
            try {
              await onToken(result.data);
            } finally {
              processing.current = false;
              webview.current?.injectJavaScript(
                "window.kravaUnlockCard && window.kravaUnlockCard(); true;",
              );
            }
          }}
        />
      )}

      {/* Skeleton nativo enquanto o SDK carrega */}
      {isLoading && !isTimeout && (
        <View style={styles.skeletonOverlay}>
          {/* Número do Cartão */}
          <View style={styles.skeletonField}>
            <Animated.View style={[styles.skeletonLabel, { width: 110, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
          </View>

          {/* Validade e CVV */}
          <View style={styles.skeletonRow}>
            <View style={styles.skeletonHalf}>
              <Animated.View style={[styles.skeletonLabel, { width: 50, opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
            </View>
            <View style={styles.skeletonHalf}>
              <Animated.View style={[styles.skeletonLabel, { width: 32, opacity: pulseAnim }]} />
              <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
            </View>
          </View>

          {/* Indicador de segurança */}
          <View style={styles.skeletonSecurityBox}>
            <ShieldCheck size={14} color="#6B7280" />
            <Text style={styles.skeletonSecurityText}>
              Iniciando ambiente seguro do Mercado Pago...
            </Text>
          </View>

          {/* Parcelas */}
          <View style={styles.skeletonField}>
            <Animated.View style={[styles.skeletonLabel, { width: 55, opacity: pulseAnim }]} />
            <Animated.View style={[styles.skeletonInput, { opacity: pulseAnim }]} />
          </View>

          {/* Botão */}
          <Animated.View style={[styles.skeletonButton, { opacity: pulseAnim }]} />
        </View>
      )}

      {/* Fallback de timeout de 10s */}
      {isTimeout && (
        <View style={styles.timeoutCard}>
          <AlertCircle size={26} color="#E85C07" />
          <Text style={styles.timeoutTitle}>Carregamento demorou mais que o esperado</Text>
          <Text style={styles.timeoutSubtitle}>
            Não conseguimos conectar com o Mercado Pago a tempo. Verifique sua conexão ou escolha outra opção.
          </Text>
          <View style={styles.timeoutActions}>
            <TouchableOpacity
              accessibilityRole="button"
              style={styles.retryButton}
              onPress={handleRetry}
            >
              <RefreshCw size={15} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
            {onFallbackToPix && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.pixButton}
                onPress={onFallbackToPix}
              >
                <Text style={styles.pixButtonText}>Pagar com Pix</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 292,
    position: "relative",
  },
  webview: {
    height: 292,
    backgroundColor: "#FFFFFF",
  },
  hiddenWebview: {
    opacity: 0,
  },
  skeletonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    gap: 6,
    zIndex: 10,
  },
  skeletonField: {
    gap: 4,
  },
  skeletonRow: {
    flexDirection: "row",
    gap: 10,
  },
  skeletonHalf: {
    flex: 1,
    gap: 4,
  },
  skeletonLabel: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginBottom: 2,
  },
  skeletonInput: {
    height: 44,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
  },
  skeletonSecurityBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  skeletonSecurityText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  skeletonButton: {
    height: 44,
    backgroundColor: "#FBDECD",
    borderRadius: 10,
    marginTop: 4,
  },
  timeoutCard: {
    minHeight: 220,
    backgroundColor: "#FFF9F5",
    borderWidth: 1,
    borderColor: "#FDD8C2",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  timeoutTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  timeoutSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  timeoutActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E85C07",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  pixButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pixButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13,
  },
});
