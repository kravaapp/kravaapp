import { PickedImageType } from "@/types/upload.types";

/** Limite da API. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** `image/jpg` não é padrão, mas aparece em alguns provedores do Android. */
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const ALLOWED_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];

export const IMAGE_FORMATS_HINT = "PNG, JPG, JPEG ou WEBP — máximo 5 MB";

const FORMAT_ERROR =
  "Formato de imagem inválido. Formatos permitidos: JPG, JPEG, PNG, WEBP.";
const SIZE_ERROR = "O tamanho da imagem não pode ultrapassar 5 MB.";

/** Extensão do arquivo, ou "" quando o nome não tem uma. */
function extensionOf(name: string) {
  const index = name.lastIndexOf(".");
  // `index <= 0` cobre "foto" (sem ponto) e ".gitignore" (ponto na posição 0).
  if (index <= 0 || index === name.length - 1) return "";
  return name.slice(index + 1).toLowerCase();
}

/**
 * Validação local, só para não gastar uma requisição com um arquivo que a API
 * recusaria. Não substitui a validação da API, que é a final.
 *
 * Nem todo seletor entrega todos os metadados — no iOS e em alguns provedores
 * do Android o mime vem vazio, e em outros o nome vem nulo. Um sinal conhecido
 * apontando para fora da lista já basta para recusar; se nenhum for conhecido,
 * deixamos a API decidir em vez de bloquear um arquivo legítimo.
 */
export function validateImageFile(file: {
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
}): string | null {
  const mimeType = file.mimeType?.trim().toLowerCase() ?? "";
  const extension = extensionOf(file.name ?? "");

  const mimeAllowed =
    !mimeType || ALLOWED_IMAGE_MIME_TYPES.includes(mimeType);
  const extensionAllowed =
    !extension || ALLOWED_IMAGE_EXTENSIONS.includes(extension);

  if (!mimeAllowed || !extensionAllowed) return FORMAT_ERROR;

  if (typeof file.size === "number" && file.size > MAX_IMAGE_BYTES)
    return SIZE_ERROR;

  return null;
}

/** Nome de arquivo seguro para enviar, quando o seletor não informa nenhum. */
export function fallbackFileName(mimeType: string) {
  const extension =
    { "image/png": "png", "image/webp": "webp" }[mimeType] ?? "jpg";
  return `imagem.${extension}`;
}

/** "1,4 MB" — usado no resumo do arquivo escolhido. */
export function formatFileSize(bytes: number | null) {
  if (bytes === null || !Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Junta os campos dos dois seletores em um só formato. */
export function toPickedImage(asset: {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  size?: number | null;
  file?: File;
}): PickedImageType {
  const mimeType = asset.mimeType?.trim().toLowerCase() || "image/jpeg";
  return {
    uri: asset.uri,
    name: asset.name?.trim() || fallbackFileName(mimeType),
    mimeType,
    size: typeof asset.size === "number" ? asset.size : null,
    file: asset.file,
  };
}
