/** Categorias que o endpoint de upload usa para organizar os arquivos. */
export type ImageUploadCategoryType = "logo" | "banner";

export type UploadImageResponseType = {
  url: string;
};

/**
 * Arquivo escolhido no dispositivo, já normalizado: `ImagePicker` e
 * `DocumentPicker` devolvem os mesmos dados com nomes diferentes.
 */
export type PickedImageType = {
  /** URI local, só para preview (blob: na web, file:// no nativo). */
  uri: string;
  name: string;
  mimeType: string;
  size: number | null;
  /** `File` do navegador, quando existir — na web é ele que vai no FormData. */
  file?: File;
};
