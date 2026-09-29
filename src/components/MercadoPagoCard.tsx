import { cardPaymentFieldsSchema } from "@/schemas/payments.schemas";
import { createMercadoPagoCardHtml, MercadoPagoCardProps } from "@/utils/mercadoPagoCard";
import { publicBaseUrl } from "@/utils/apiUrl";
import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import { WebView } from "react-native-webview";

export default function MercadoPagoCard({ onToken, ...config }: MercadoPagoCardProps) {
  const webview = useRef<WebView>(null);
  const processing = useRef(false);
  const [failed, setFailed] = useState(false);
  const html = useMemo(() => createMercadoPagoCardHtml(config), [config.publicKey, config.amount, config.customerName, config.customerDocument]);
  return (
    <View style={{ height: 540 }}>
      {failed && <Text style={{ color: "#b91c1c" }}>Não foi possível abrir o checkout. Tente novamente.</Text>}
      <WebView
        ref={webview}
        source={{ html, baseUrl: publicBaseUrl }}
        originWhitelist={["https://*"]}
        javaScriptEnabled
        onError={() => setFailed(true)}
        onMessage={async (event) => {
          if (processing.current) return;
          let message;
          try {
            message = JSON.parse(event.nativeEvent.data);
          } catch {
            return;
          }
          if (message?.type !== "card-token") return;
          const result = cardPaymentFieldsSchema.safeParse(message.fields);
          if (!result.success) return;
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
