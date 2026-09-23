const DEFAULT_API_URL = "https://api.kravaapp.com.br/api";

/** Base dos endpoints — a mesma que o cliente HTTP usa no `prefix`. */
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() || DEFAULT_API_URL;

/**
 * Raiz do servidor, sem o `/api` do fim: é ali que a API publica os arquivos
 * enviados (`/uploads/...`), fora do prefixo dos endpoints.
 */
export const publicBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");

/**
 * URL exibível de uma imagem vinda da API. O upload devolve caminho relativo
 * ("/uploads/..."), que só o host não resolve — daí a raiz na frente. URLs já
 * absolutas (http, data:, blob:, file:) passam intactas.
 */
export function publicImageUrl(url: string | null | undefined) {
  if (!url) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return url;
  return `${publicBaseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
