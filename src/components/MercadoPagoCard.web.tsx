import { cardPaymentFieldsSchema } from "@/schemas/payments.schemas";
import { createMercadoPagoCardHtml, MercadoPagoCardProps } from "@/utils/mercadoPagoCard";
import { useEffect, useMemo, useRef } from "react";

export default function MercadoPagoCard({ onToken, onError, ...config }: MercadoPagoCardProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const processing = useRef(false);
  const html = useMemo(() => createMercadoPagoCardHtml(config), [config.publicKey, config.amount, config.customerName, config.customerDocument]);
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "card-error") {
        if (typeof event.data.message === "string") onError(event.data.message);
        return;
      }
      if (event.data?.type !== "card-token" || processing.current) return;
      const result = cardPaymentFieldsSchema.safeParse(event.data.fields);
      if (!result.success) {
        onError("Não foi possível validar o cartão. Confira os dados e tente novamente.");
        return;
      }
      processing.current = true;
      try {
        await onToken(result.data);
      } finally {
        processing.current = false;
        frame.current?.contentWindow?.postMessage("krava-unlock", "*");
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [onToken, onError]);
  return <iframe ref={frame} title="Pagamento seguro com cartão" srcDoc={html} style={{ width: "100%", height: 380, border: 0 }} />;
}
