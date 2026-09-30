import { ActionButton } from "@/components/admin/AdminUi";
import { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import { useUploadTenantImage } from "@/hooks/tenant.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { ImageUploadCategoryType, PickedImageType } from "@/types/upload.types";
import { publicImageUrl } from "@/utils/apiUrl";
import { IMAGE_FORMATS_HINT, formatFileSize } from "@/utils/imageUpload";
import {
  ImageSourceType,
  cameraAvailable,
  pickImage,
} from "@/utils/imagePicker";
import {
  Camera,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  label: string;
  /** URL já persistida da imagem, se houver. */
  value: string | null;
  category: ImageUploadCategoryType;
  /** Chamado com a URL devolvida pela API depois do upload. */
  onChange: (url: string) => void;
  aspectRatio?: number;
};

/**
 * Substitui o campo de URL da imagem: o arquivo é escolhido no dispositivo,
 * enviado para a API e a URL devolvida por ela é que vira a configuração.
 * Enquanto o upload não termina, o preview usa o arquivo local; depois passa a
 * usar a URL da API.
 */
export function ImageUploadField({
  label,
  value,
  category,
  onChange,
  aspectRatio = 16 / 9,
}: Props) {
  const { toast } = useToast();
  const { uploadImage, isUploading } = useUploadTenantImage();
  const [picked, setPicked] = useState<PickedImageType | null>(null);
  const [choosing, setChoosing] = useState(false);
  // No iOS o seletor só é apresentado depois que o modal termina de sair.
  const [pendingSource, setPendingSource] = useState<ImageSourceType | null>(
    null,
  );

  const preview = picked?.uri ?? publicImageUrl(value);

  const choose = async (source: ImageSourceType) => {
    const result = await pickImage(source);

    if (result.status === "picked") {
      setPicked(result.image);
      return;
    }
    if (result.status === "canceled") return;

    // Permissão negada ou seletor indisponível: a imagem atual segue intacta.
    toast({ title: result.message, variant: "destructive" });
  };

  const selectSource = (source: ImageSourceType) => {
    setChoosing(false);
    if (Platform.OS === "ios") setPendingSource(source);
    else void choose(source);
  };

  // `onDismiss` do Modal é iOS-only e dispara no fim da animação de saída —
  // é o gancho certo para abrir o seletor sem correr com o fechamento.
  const runPendingSource = () => {
    if (!pendingSource) return;
    const source = pendingSource;
    setPendingSource(null);
    void choose(source);
  };

  const upload = async () => {
    // A guarda fecha a janela entre o toque e o `isPending` do react-query,
    // que é o que impediria dois envios do mesmo arquivo.
    if (!picked || isUploading) return;

    try {
      const { url } = await uploadImage({ file: picked, category });
      onChange(url);
      setPicked(null);
      toast({ title: "Imagem enviada!" });
    } catch (error) {
      // A imagem anterior continua configurada — só o preview local sai.
      toast({
        title: normalizeApiError(error, "Não foi possível enviar a imagem.")
          .description,
        variant: "destructive",
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <View style={[styles.preview, { aspectRatio }]}>
        {preview ? (
          <Image source={{ uri: preview }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.empty}>
            <ImageIcon size={26} color={COLORS.mutedForeground} />
            <Text style={styles.emptyText}>Nenhuma imagem configurada</Text>
          </View>
        )}

        {isUploading ? (
          <View style={styles.overlay}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.overlayText}>Enviando imagem...</Text>
          </View>
        ) : null}
      </View>

      {picked ? (
        <View style={styles.selection}>
          <View style={styles.grow}>
            <Text style={styles.fileName} numberOfLines={1}>
              {picked.name}
            </Text>
            <Text style={styles.muted}>
              {formatFileSize(picked.size) || "Tamanho não informado"} · aguardando
              envio
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setPicked(null)}
            disabled={isUploading}
            style={[styles.cancel, isUploading && styles.disabled]}
          >
            <X size={15} color={COLORS.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.hint}>{IMAGE_FORMATS_HINT}</Text>

      <View style={styles.actions}>
        {picked ? (
          <>
            <ActionButton
              label={isUploading ? "Enviando..." : "Enviar imagem"}
              icon={
                isUploading ? (
                  <Loader2 size={14} color="#fff" />
                ) : (
                  <Upload size={14} color="#fff" />
                )
              }
              onPress={upload}
              disabled={isUploading}
            />
            <ActionButton
              label="Escolher outra"
              outline
              onPress={() => setChoosing(true)}
              disabled={isUploading}
            />
          </>
        ) : (
          <ActionButton
            label={value ? "Trocar imagem" : "Escolher imagem"}
            icon={<ImageIcon size={14} color="#fff" />}
            onPress={() => setChoosing(true)}
          />
        )}
      </View>

      <SourceSheet
        visible={choosing}
        onClose={() => setChoosing(false)}
        onSelect={selectSource}
        onDismiss={runPendingSource}
      />
    </View>
  );
}

/**
 * Origem da imagem. No nativo o sistema oferece galeria, gerenciador de
 * arquivos e câmera como caminhos distintos; na web o próprio seletor de
 * arquivos do navegador cobre a escolha, então vamos direto nele.
 */
function SourceSheet({
  visible,
  onClose,
  onSelect,
  onDismiss,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (source: ImageSourceType) => void;
  onDismiss: () => void;
}) {
  const options = [
    {
      source: "library" as const,
      label: "Galeria de fotos",
      description: "Escolher uma imagem já salva no aparelho",
      Icon: ImageIcon,
      mobileOnly: false,
    },
    {
      source: "files" as const,
      label: "Arquivos",
      description: "Procurar a imagem no gerenciador de arquivos",
      Icon: FolderOpen,
      mobileOnly: false,
    },
    {
      source: "camera" as const,
      label: "Câmera",
      description: "Tirar uma foto agora",
      Icon: Camera,
      mobileOnly: true,
    },
  ].filter((option) => !option.mobileOnly || cameraAvailable);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onDismiss={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Escolher imagem</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          {options.map(({ source, label, description, Icon }) => (
            <TouchableOpacity
              key={source}
              onPress={() => onSelect(source)}
              style={styles.option}
            >
              <Icon size={20} color={COLORS.mainOrange} />
              <View style={styles.grow}>
                <Text style={styles.optionLabel}>{label}</Text>
                <Text style={styles.muted}>{description}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  grow: { flex: 1 },
  label: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 11 },
  disabled: { opacity: 0.4 },
  preview: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#F7F8FA",
    overflow: "hidden",
  },
  image: { width: "100%", height: "100%" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  emptyText: { color: COLORS.mutedForeground, fontSize: 12 },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(15,23,42,.6)",
  },
  overlayText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  selection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F7F8FA",
  },
  fileName: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  cancel: { padding: 6 },
  hint: { color: COLORS.mutedForeground, fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    gap: 6,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sheetTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  optionLabel: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
});
