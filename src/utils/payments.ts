const PAYMENT_TYPES: Record<string, { label: string; description: string }> = {
  mensalidade: {
    label: "Mensalidade",
    description: "Cobrança recorrente gerada de acordo com o plano de matrícula do aluno.",
  },
  avulso: {
    label: "Avulso",
    description: "Pagamento pontual, como aula avulsa/diária (drop-in) ou compra de algum produto/serviço.",
  },
  matricula: {
    label: "Matrícula",
    description: "Taxa inicial de adesão/matrícula do aluno no CT.",
  },
  taxa: {
    label: "Taxa",
    description: "Outras cobranças avulsas, como exame de faixa, anuidade/manutenção ou inscrição em campeonato interno.",
  },
  totalpass: {
    label: "TotalPass",
    description: "Cobrança ou repasse relacionado ao convênio TotalPass.",
  },
};

export function isPaymentPaid(status: string) {
  return ["paid", "pago", "paga", "confirmado", "confirmada"].includes(status.trim().toLowerCase());
}

export function canPayInvoice(status: string) {
  return ["pending", "pendente", "overdue", "vencido", "vencida", "atrasado", "atrasada", "action_required"].includes(status.trim().toLowerCase());
}

export function getPaymentResultMessage(status: string) {
  const value = status.trim().toLowerCase();
  if (isPaymentPaid(value)) return "Pagamento aprovado!";
  if (value === "action_required") return "Seu pagamento precisa de autenticação. Continue no provedor para concluir.";
  if (["pending", "pendente", "in_process", "processing"].includes(value)) return "Aguardando confirmação do pagamento.";
  if (["rejected", "failed", "recusado"].includes(value)) return "Pagamento não aprovado. Você pode tentar novamente.";
  return `Status do pagamento: ${status}`;
}

export function getCheckoutUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function getPaymentType(type: string) {
  const key = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return PAYMENT_TYPES[key] ?? { label: type || "Cobrança", description: "" };
}

export function formatPaymentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
