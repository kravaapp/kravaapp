/**
 * Máscaras de entrada dos formulários.
 *
 * Todas são puras e idempotentes: recebem o texto já digitado (com ou sem
 * formatação) e devolvem o texto formatado, descartando qualquer caractere que
 * não seja dígito. O próprio dígito é a fonte da verdade — o separador é
 * recalculado a cada digitação, então apagar também funciona sem estado extra.
 */

/** Tudo que não for dígito é descartado. */
export const onlyDigits = (value: string) => value.replace(/\D/g, "");

/**
 * Inteiros positivos. Remove zeros à esquerda, menos quando o valor é "0"
 * (que em limites de plano significa "sem limite").
 */
export function maskInteger(value: string, maxDigits = 6) {
  return onlyDigits(value)
    .slice(0, maxDigits)
    .replace(/^0+(?=\d)/, "");
}

/** HH:MM — o ":" entra sozinho depois dos dois primeiros dígitos. */
export function maskTime(value: string) {
  const digits = onlyDigits(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/**
 * Lista de horários separados por vírgula ("18:00, 19:00"). Cada trecho entre
 * vírgulas recebe `maskTime`; a vírgula final é preservada para o usuário
 * conseguir começar o próximo horário.
 */
export function maskTimeList(value: string) {
  return value
    .split(",")
    .map((part) => maskTime(part))
    .join(", ");
}

/**
 * Moeda em pt-BR: os dígitos entram pela direita e os dois últimos são os
 * centavos, então "150000" vira "1.500,00".
 */
export function maskCurrency(value: string, maxDigits = 11) {
  const digits = onlyDigits(value).slice(0, maxDigits);
  if (!digits) return "";

  // Um dígito a mais que os centavos garante que sempre exista a parte inteira.
  const padded = digits.padStart(3, "0");
  const integer = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const decimals = padded.slice(-2);

  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${decimals}`;
}

/** Texto do campo de moeda a partir de um número da API (1500 → "1.500,00"). */
export function toCurrencyInput(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "";
  return maskCurrency(String(Math.round(value * 100)));
}

/**
 * Valor numérico de um campo mascarado por `maskCurrency`, já que os centavos
 * são implícitos ("1.500,00" → 1500). Devolve NaN quando não há dígito algum,
 * que é o que as validações existentes esperam para "campo vazio".
 */
export function parseCurrency(value: string) {
  const digits = onlyDigits(value);
  if (!digits) return Number.NaN;
  return Number(digits) / 100;
}

/** CPF: 000.000.000-00. */
export function maskCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/** CNPJ: 00.000.000/0000-00. */
export function maskCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12)
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

/** Telefone com DDD: (19) 99999-9999 no celular e (19) 9999-9999 no fixo. */
export function maskPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/**
 * Data no formato brasileiro: DD/MM/AAAA. O campo guarda esse texto; a
 * conversão para AAAA-MM-DD acontece só na hora de enviar (`toIsoDate`).
 */
export function maskDate(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/**
 * Texto do campo a partir da data da API ("2026-09-23" → "23/09/2026").
 * Qualquer coisa fora do formato AAAA-MM-DD vira campo vazio.
 */
export function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "";
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Valor da requisição a partir do texto do campo ("23/09/2026" → "2026-09-23").
 * Devolve null quando a data está incompleta ou não existe no calendário —
 * 31/02, por exemplo, é recusado aqui em vez de virar erro genérico da API.
 */
export function toIsoDate(value: string): string | null {
  const digits = onlyDigits(value);
  if (digits.length !== 8) return null;

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const year = Number(digits.slice(4));

  // O Date normaliza datas impossíveis (31/02 vira 03/03), então comparar de
  // volta é o que denuncia o valor inválido. Anos < 100 também caem aqui.
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  )
    return null;

  return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
}

/** Data de hoje no formato do campo, pelo fuso do aparelho. */
export function todayInput() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
}
