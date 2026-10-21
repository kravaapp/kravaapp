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

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function isPaymentOverdue(status: string) {
  return ["overdue", "vencido", "vencida", "atrasado", "atrasada"].includes(status.trim().toLowerCase());
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  creditcard: "Cartão de crédito",
  cartaocredito: "Cartão de crédito",
  boleto: "Boleto",
  transferencia: "Transferência",
  gympass: "Gympass",
  totalpass: "TotalPass",
  balcao: "Balcão",
  recepcao: "Recepção",
};

export function formatPaymentMethod(method?: string | null) {
  if (!method) return "";
  const key = method.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? method;
}

export function formatPaymentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export type PaymentStatusConfig = {
  label: string;
  badgeBg: string;
  badgeText: string;
  iconBg: string;
  iconColor: string;
  isPaid: boolean;
  canPay: boolean;
};

export function getPaymentStatusConfig(status: string): PaymentStatusConfig {
  const value = (status || "").trim().toLowerCase();

  if (isPaymentPaid(value)) {
    return {
      label: "Pago",
      badgeBg: "#DCFCE7",
      badgeText: "#16A34A",
      iconBg: "#DCFCE7",
      iconColor: "#16A34A",
      isPaid: true,
      canPay: false,
    };
  }

  if (["overdue", "vencido", "vencida", "atrasado", "atrasada"].includes(value)) {
    return {
      label: "Atrasado",
      badgeBg: "#FEE2E2",
      badgeText: "#DC2626",
      iconBg: "#FEE2E2",
      iconColor: "#DC2626",
      isPaid: false,
      canPay: true,
    };
  }

  if (["cancelado", "cancelada", "canceled", "cancelled"].includes(value)) {
    return {
      label: "Cancelado",
      badgeBg: "#F3F4F6",
      badgeText: "#6B7280",
      iconBg: "#F3F4F6",
      iconColor: "#6B7280",
      isPaid: false,
      canPay: false,
    };
  }

  return {
    label: "Pendente",
    badgeBg: "#FEF3C7",
    badgeText: "#D97706",
    iconBg: "#FEF3C7",
    iconColor: "#D97706",
    isPaid: false,
    canPay: true,
  };
}

