const REJECTION_MESSAGES: Record<string, string> = {
  rejected_by_issuer: "O banco emissor recusou o pagamento. Entre em contato com o banco ou escolha outro cartão ou Pix.",
  insufficient_amount: "O cartão não tem saldo ou limite suficiente. Use outro cartão ou pague com Pix.",
  bad_filled_card_data: "Confira os dados do cartão, incluindo número, validade e código de segurança.",
  bad_filled_card_number: "Confira o número do cartão e tente novamente.",
  bad_filled_date: "Confira a data de validade do cartão e tente novamente.",
  bad_filled_security_code: "Confira o código de segurança (CVV) do cartão e tente novamente.",
  bad_filled_other: "Confira os dados do titular do cartão e tente novamente.",
  required_call_for_authorize: "O banco precisa autorizar este pagamento. Entre em contato com o banco ou escolha outra forma de pagamento.",
  call_for_authorize: "O banco precisa autorizar este pagamento. Entre em contato com o banco ou escolha outra forma de pagamento.",
  card_disabled: "O cartão está desabilitado para este pagamento. Entre em contato com o banco ou use outro cartão ou Pix.",
  duplicated_payment: "Foi identificada uma possível duplicidade. Confira o status da cobrança nas pendências antes de tentar novamente.",
  invalid_installments: "O parcelamento escolhido não está disponível. Selecione outra quantidade de parcelas.",
  max_attempts_exceeded: "O limite de tentativas com este cartão foi atingido. Aguarde antes de tentar novamente ou pague com Pix.",
  high_risk: "O pagamento não foi aprovado pela análise de segurança. Escolha outro cartão ou pague com Pix.",
  other_reason: "O pagamento foi recusado. Entre em contato com o banco ou escolha outro cartão ou Pix.",
  card_error: "Não foi possível processar este cartão. Confira os dados ou escolha outra forma de pagamento.",
};

const GATEWAY_FALLBACK = "Não foi possível processar o pagamento. Confira o status da cobrança nas pendências antes de tentar novamente ou escolher outra forma de pagamento.";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Lê apenas códigos e motivos; nunca devolve mensagens brutas, tokens ou IDs. */
export function getMercadoPagoErrorMessage(body: unknown): string | null {
  const reasons: string[] = [];
  let gatewayError = false;

  const addReason = (value: unknown) => {
    if (typeof value !== "string") return;
    const code = value.split(":").at(-1)!.trim().toLowerCase().replace(/^cc_rejected_/, "");
    if (Object.hasOwn(REJECTION_MESSAGES, code)) reasons.push(code);
  };

  const visit = (value: unknown, depth = 0): void => {
    if (depth > 8) return;
    if (typeof value === "string") {
      if (/mercado\s*pago/i.test(value)) gatewayError = true;
      // A API inclui o retorno JSON do provedor depois de "Mercado Pago (...):".
      const start = value.indexOf("{");
      const end = value.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          visit(JSON.parse(value.slice(start, end + 1)), depth + 1);
        } catch {
          // Corpo incompleto ou inválido: exibir somente uma mensagem segura.
        }
      } else {
        addReason(value);
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!isRecord(value)) return;
    if (value.code === "Payments.GatewayError") gatewayError = true;
    // O motivo da transação tem prioridade sobre o status genérico da order.
    visit(value.data, depth + 1);
    visit(value.transactions, depth + 1);
    visit(value.payments, depth + 1);
    addReason(value.status_detail);
    visit(value.errors, depth + 1);
    visit(value.details, depth + 1);
    addReason(value.code);
    for (const key of ["detail", "description", "message"]) visit(value[key], depth + 1);
  };

  visit(body);
  if (reasons.length > 0) return REJECTION_MESSAGES[reasons[0]];
  return gatewayError ? GATEWAY_FALLBACK : null;
}
