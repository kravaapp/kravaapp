import { isHTTPError, isNetworkError, isTimeoutError } from "ky";
import { getMercadoPagoErrorMessage } from "@/utils/mercadoPagoErrors";

export type ApiErrorInfo = {
  code: string | null;
  description: string;
};

const NETWORK_FALLBACK =
  "Não foi possível conectar. Verifique sua internet e tente novamente.";

const FRIENDLY_BY_CODE: Record<string, string> = {
  "Payments.PaymentDeclined": "Pagamento Recusado",
  "Membership.ContratoLongTermLock": "Você possui um plano com fidelidade vigente. Para trocar ou cancelar, fale com a recepção do CT.",
  "Membership.PlanoInactive": "Este plano não está mais disponível para novas contratações.",
  "Membership.AlunoNotFound": "Perfil de aluno não localizado.",
  "Membership.PlanoNotFound": "Plano não encontrado.",
  "Auth.EmailNotConfirmed": "Confirme seu e-mail para entrar.",
  "Auth.UserNotFound": "Usuário não encontrado. Confira o e-mail informado.",
  "Auth.WeakPassword": "A senha deve ter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.",
  "Auth.InvalidOrExpiredResetCode": "Código de recuperação de senha inválido ou expirado. Solicite um novo código.",
  "Auth.InvalidOrExpiredConfirmationCode": "Código de confirmação inválido ou expirado. Solicite um novo código.",
  "Auth.ProfessorHasActiveClasses": "Este professor possui turmas ativas ou aulas agendadas na grade. Reatribua as aulas antes de desvinculá-lo.",
  "Auth.CannotRemoveLastAdmin": "Não é possível desvincular o único administrador ativo do CT.",
  "Auth.CannotRemoveSelf": "Você não pode desvincular seu próprio usuário.",
  "Auth.PartnerAlreadyExists": "Já existe um parceiro com este nome cadastrado no CT.",
  "Membership.CannotRemoveSelf": "Você não pode desvincular sua própria conta.",
};

const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: "Não foi possível concluir a operação. Verifique os dados e tente novamente.",
  401: "Sua sessão expirou. Entre novamente.",
  403: "Você não tem permissão para realizar esta ação.",
  404: "Recurso não encontrado.",
  429: "Muitas tentativas. Aguarde alguns instantes e tente novamente.",
  500: "Erro interno no servidor. Tente novamente em instantes.",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const looksLikeMarkup = (value: string) => /^\s*<(?:!doctype|html)/i.test(value);

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

/**
 * O `code` do erro não vem na raiz do corpo: a API o envia dentro de `errors`,
 * por exemplo `{ detail: "...", errors: [{ code: "Auth.UserNotFound", ... }] }`.
 * Os erros de upload, por outro lado, vêm como `{ message: "..." }`.
 */
function errorEntries(data: Record<string, unknown>) {
  return Array.isArray(data.errors) ? data.errors.filter(isRecord) : [];
}

function isKnownErrorCode(code: string) {
  return Object.hasOwn(FRIENDLY_BY_CODE, code) || code === "Payments.GatewayError";
}

/**
 * Normaliza o erro lançado pelo ky para o envelope `{ code, description }` desta API.
 *
 * É síncrono de propósito: o ky popula `error.data` com o corpo já parseado antes de
 * lançar, e consome a Response — então `error.response.json()` não funcionaria aqui.
 * `error.message` é ignorado porque o texto do ky é o status em inglês.
 */
export function normalizeApiError(
  error: unknown,
  fallback: string,
): ApiErrorInfo {
  if (isHTTPError(error)) {
    const { data } = error;
    const gatewayDescription = getMercadoPagoErrorMessage(data);

    if (isRecord(data)) {
      const entries = errorEntries(data);
      const codes = [data.code, ...entries.map((entry) => entry.code)].flatMap((value) => {
        const code = firstString(value);
        return code ? [code] : [];
      });
      const code = codes.find(isKnownErrorCode) ?? codes[0] ?? null;
      const entry = entries.find((entry) => firstString(entry.code) === code) ?? entries[0];
      const friendlyDescription = code && Object.hasOwn(FRIENDLY_BY_CODE, code)
        ? FRIENDLY_BY_CODE[code]
        : undefined;

      return {
        code,
        description:
          friendlyDescription ?? gatewayDescription ?? firstString(
            data.message,
            data.description,
            data.detail,
            entry?.description,
          ) ??
          FRIENDLY_BY_STATUS[error.response.status] ??
          fallback,
      };
    }

    // Corpo em texto puro — descartado se parecer uma página de erro HTML.
    if (typeof data === "string" && data.trim() && !looksLikeMarkup(data)) {
      return { code: null, description: gatewayDescription ?? data.trim().slice(0, 200) };
    }

    return {
      code: null,
      description: FRIENDLY_BY_STATUS[error.response.status] ?? fallback,
    };
  }

  if (isNetworkError(error) || isTimeoutError(error)) {
    return { code: null, description: NETWORK_FALLBACK };
  }

  return { code: null, description: fallback };
}
