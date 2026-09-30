import { cardPaymentFieldsSchema } from "@/schemas/payments.schemas";
import { createMercadoPagoCardHtml, MercadoPagoCardProps } from "@/utils/mercadoPagoCard";
import { publicBaseUrl } from "@/utils/apiUrl";
import { useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";

export default function MercadoPagoCard({ onToken, onError, ...config }: MercadoPagoCardProps) {
  const webview = useRef<WebView>(null);
  const processing = useRef(false);
  const html = useMemo(() => createMercadoPagoCardHtml(config), [config.publicKey, config.amount, config.customerName, config.customerDocument]);
  return (
    <View style={{ height: 292 }}>
      <WebView
        ref={webview}
        source={{ html, baseUrl: publicBaseUrl }}
        originWhitelist={["https://*"]}
        javaScriptEnabled
        onError={() => onError("Não foi possível abrir o checkout. Tente novamente.")}
        onMessage={async (event) => {
          if (processing.current) return;
          let message;
          try {
            message = JSON.parse(event.nativeEvent.data);
          } catch {
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
            webview.current?.injectJavaScript("window.kravaUnlockCard && window.kravaUnlockCard(); true;");
          }
        }}
      />
    </View>
  );
}
