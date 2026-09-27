import { PickedImageType } from "@/types/upload.types";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  toPickedImage,
  validateImageFile,
} from "@/utils/imageUpload";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/** De onde a imagem veio. Na web "library" e "files" caem no mesmo seletor. */
export type ImageSourceType = "library" | "files" | "camera";

export type PickImageResultType =
  | { status: "picked"; image: PickedImageType }
  | { status: "canceled" }
  | { status: "denied"; message: string }
  | { status: "failed"; message: string };

const PHOTOS_PERMISSION_DENIED =
  "Acesso às fotos não autorizado. Toque em escolher imagem para tentar novamente.";
const CAMERA_PERMISSION_DENIED =
  "Acesso à câmera não autorizado. Você também pode escolher uma imagem da galeria ou dos arquivos.";
const PICKER_FAILED =
  "Não foi possível abrir o seletor de imagens. Tente novamente.";

/** Câmera só faz sentido no app nativo; no navegador o seletor já é o de arquivos. */
export const cameraAvailable = Platform.OS !== "web";

/**
 * Abre o seletor do sistema e devolve o arquivo já normalizado e validado.
 * Nunca lança: cada desfecho vira um `status`, para a tela decidir o que mostrar.
 */
export async function pickImage(
  source: ImageSourceType,
): Promise<PickImageResultType> {
  try {
    if (source === "files") return validate(await pickFromFiles());

    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted)
        return { status: "denied", message: CAMERA_PERMISSION_DENIED };
    } else if (Platform.OS !== "web") {
      const currentPermission =
        await ImagePicker.getMediaLibraryPermissionsAsync();

      if (!currentPermission.granted && currentPermission.canAskAgain) {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted)
          return { status: "denied", message: PHOTOS_PERMISSION_DENIED };
      }
      // Após uma recusa definitiva, o sistema não repete o alerta de permissão.
      // O seletor nativo ainda pode autorizar somente a imagem escolhida, sem
      // exigir acesso à galeria inteira nem encaminhar o usuário aos ajustes.
    }

    return validate(await pickFromLibrary(source === "camera"));
  } catch {
    return { status: "failed", message: PICKER_FAILED };
  }
}

async function pickFromFiles(): Promise<PickedImageType | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ALLOWED_IMAGE_MIME_TYPES,
    multiple: false,
    copyToCacheDirectory: true,
    // Sem base64: o arquivo vai no FormData como veio do disco.
    base64: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return toPickedImage({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
    size: asset.size,
    file: asset.file,
  });
}

async function pickFromLibrary(fromCamera: boolean): Promise<PickedImageType | null> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    allowsEditing: false,
    allowsMultipleSelection: false,
    quality: 1,
    base64: false,
  };
  const result = fromCamera
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  return toPickedImage({
    uri: asset.uri,
    name: asset.fileName,
    mimeType: asset.mimeType,
    size: asset.fileSize,
    file: asset.file,
  });
}

function validate(image: PickedImageType | null): PickImageResultType {
  if (!image) return { status: "canceled" };

  const error = validateImageFile(image);
  if (error) return { status: "failed", message: error };

  return { status: "picked", image };
}
