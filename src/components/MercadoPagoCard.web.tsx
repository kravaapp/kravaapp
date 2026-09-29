import { cardPaymentFieldsSchema } from "@/schemas/payments.schemas";
import { createMercadoPagoCardHtml, MercadoPagoCardProps } from "@/utils/mercadoPagoCard";
import { useEffect, useMemo, useRef } from "react";

export default function MercadoPagoCard({ onToken, ...config }: MercadoPagoCardProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const processing = useRef(false);
  const html = useMemo(() => createMercadoPagoCardHtml(config), [config.publicKey, config.amount, config.customerName, config.customerDocument]);
  useEffect(() => {
    const receive = async (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow || event.data?.type !== "card-token" || processing.current) return;
      const result = cardPaymentFieldsSchema.safeParse(event.data.fields);
      if (!result.success) return;
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
  }, [onToken]);
  return <iframe ref={frame} title="Pagamento seguro com cartão" srcDoc={html} style={{ width: "100%", height: 540, border: 0 }} />;
}
