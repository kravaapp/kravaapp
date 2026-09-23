import { isHTTPError, isNetworkError, isTimeoutError } from "ky";

export type ApiErrorInfo = {
  code: string | null;
  description: string;
};

const NETWORK_FALLBACK =
  "Não foi possível conectar. Verifique sua internet e tente novamente.";

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

    if (isRecord(data)) {
      return {
        code: firstString(data.code),
        description:
          firstString(data.description, data.detail) ??
          FRIENDLY_BY_STATUS[error.response.status] ??
          fallback,
      };
    }

    // Corpo em texto puro — descartado se parecer uma página de erro HTML.
    if (typeof data === "string" && data.trim() && !looksLikeMarkup(data)) {
      return { code: null, description: data.trim().slice(0, 200) };
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
