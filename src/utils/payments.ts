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

export function getPaymentType(type: string) {
  const key = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  return PAYMENT_TYPES[key] ?? { label: type || "Cobrança", description: "" };
}

export function formatPaymentDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
