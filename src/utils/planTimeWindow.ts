/** Atalhos de faixa de horário no cadastro do plano. Fim "00:00" significa até a meia-noite. */
export const PLAN_TIME_PRESETS = [
  { label: "Manhã", start: "06:00", end: "12:00" },
  { label: "Tarde", start: "12:00", end: "18:00" },
  { label: "Noite", start: "18:00", end: "00:00" },
] as const;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "06:00 às 12:00"; null para plano que vale a qualquer horário. */
export const planTimeWindowLabel = (start?: string | null, end?: string | null) =>
  start && end ? `${start} às ${end}` : null;

/**
 * Mesmas regras da API: as duas vazias (qualquer horário) ou as duas em HH:MM, com o início antes do fim.
 * Devolve a mensagem de erro, ou null quando a faixa é válida.
 */
export function validatePlanTimeWindow(start: string, end: string): string | null {
  if (!start && !end) return null;
  if (!start || !end) return "Informe o início e o fim do horário, ou deixe os dois em branco.";
  if (!TIME_PATTERN.test(start) || !TIME_PATTERN.test(end)) return "Use o formato HH:MM no horário do plano.";
  const endsAtMidnight = end === "00:00";
  if (endsAtMidnight ? start === "00:00" : start >= end) return "O início do horário precisa ser antes do fim.";
  return null;
}
