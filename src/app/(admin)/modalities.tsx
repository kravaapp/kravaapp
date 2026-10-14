import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import React, { useState } from "react";
import Modal from "@/components/AppModal";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  Globe2,
  Pencil,
  Plus,
  X,
} from "lucide-react-native";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminPageHeader,
  AdminScreen,
  AdminSkeleton,
  Pill,
  SectionTitle,
} from "@/components/admin/AdminUi";
import { useCategories, useCategoryActions } from "@/hooks/categories.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { Category } from "@/types/categories.types";
import { maskInteger } from "@/utils/masks";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminModalities() {
  const refresh = useScreenRefresh([["categories"]]);
  const { toast } = useToast();
  const { categories, isLoading, error } = useCategories();
  const { createCategory, updateCategory, isSaving } = useCategoryActions();
  const [editingCategory, setEditingCategory] = useState<Category | null | undefined>(
    undefined,
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ClientHeader />
      <RefreshableScrollView {...refresh} style={styles.content}>
        <AdminScreen>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <ArrowLeft size={20} color={COLORS.foreground} />
            </TouchableOpacity>
            <View style={styles.headerTextWrap}>
              <AdminPageHeader
                title="modalidades"
                subtitle="Cadastre e gerencie as artes marciais e treinos do CT"
              />
            </View>
            <ActionButton
              label="Nova"
              icon={<Plus size={15} color="#fff" />}
              onPress={() => setEditingCategory(null)}
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {isLoading ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <AdminSkeleton key={idx} height={84} radius={12} />
            ))
          ) : (categories ?? []).length === 0 ? (
            <AdminCard>
              <Text style={styles.emptyText}>
                Nenhuma modalidade cadastrada ainda. Clique em "Nova" para criar a primeira!
              </Text>
            </AdminCard>
          ) : (
            (categories ?? []).map((category) => (
              <AdminCard key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryIconWrap}>
                  <Globe2 size={22} color={COLORS.mainOrange} />
                </View>
                <View style={styles.grow}>
                  <Text style={styles.categoryName}>
                    {category.name || "Modalidade sem nome"}
                  </Text>
                  <Text style={styles.categoryDesc}>
                    {category.description || "Sem descrição"}
                  </Text>
                  <Text style={styles.capacityText}>
                    Capacidade padrão: {category.defaultCapacity} alunos
                  </Text>
                </View>
                <View style={styles.actionColumn}>
                  <Pill
                    label={category.isActive ? "Ativa" : "Inativa"}
                    tone={category.isActive ? "success" : "neutral"}
                  />
                  <TouchableOpacity
                    onPress={() => setEditingCategory(category)}
                    style={styles.editBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Editar modalidade"
                  >
                    <Pencil size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </AdminCard>
            ))
          )}
        </AdminScreen>
      </RefreshableScrollView>

      {/* Modal de Criação / Edição */}
      <CategoryModal
        category={editingCategory}
        visible={editingCategory !== undefined}
        saving={isSaving}
        onClose={() => setEditingCategory(undefined)}
        onSave={async (payload) => {
          try {
            if (editingCategory) {
              await updateCategory({ id: editingCategory.id, data: payload });
              toast({ title: "Modalidade atualizada com sucesso!" });
            } else {
              await createCategory(payload);
              toast({ title: "Modalidade criada com sucesso!" });
            }
            setEditingCategory(undefined);
          } catch (err) {
            toast({
              title: normalizeApiError(err, "Não foi possível salvar a modalidade.").description,
              variant: "destructive",
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

function CategoryModal({
  category,
  visible,
  saving,
  onClose,
  onSave,
}: {
  category: Category | null | undefined;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    description: string | null;
    defaultCapacity: number;
    isActive: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("20");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (category) {
      setName(category.name || "");
      setDescription(category.description || "");
      setCapacity(category.defaultCapacity ? String(category.defaultCapacity) : "20");
      setIsActive(category.isActive ?? true);
      setError("");
    } else {
      setName("");
      setDescription("");
      setCapacity("20");
      setIsActive(true);
      setError("");
    }
  }, [category, visible]);

  const submit = () => {
    if (!name.trim()) {
      setError("Informe o nome da modalidade.");
      return;
    }
    const defaultCapacity = Number(capacity);
    if (!defaultCapacity || defaultCapacity <= 0) {
      setError("Capacidade padrão deve ser maior que 0.");
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || null,
      defaultCapacity,
      isActive,
    });
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoider>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <ScrollView
              contentContainerStyle={styles.modalScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <SectionTitle>
                  {category ? "Editar modalidade" : "Nova modalidade"}
                </SectionTitle>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
                  <X size={20} color={COLORS.foreground} />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Text style={styles.fieldLabel}>Nome da modalidade *</Text>
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  setError("");
                }}
                placeholder="Ex: Jiu-Jitsu, Muay Thai, Boxe"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Breve descrição dos treinos e níveis..."
                placeholderTextColor={COLORS.mutedForeground}
                style={[styles.textInput, styles.textarea]}
                multiline
              />

              <Text style={styles.fieldLabel}>Capacidade padrão de alunos por aula *</Text>
              <TextInput
                value={capacity}
                onChangeText={(val) => {
                  setCapacity(maskInteger(val));
                  setError("");
                }}
                keyboardType="number-pad"
                placeholder="20"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              {category ? (
                <View style={styles.switchRow}>
                  <View style={styles.grow}>
                    <Text style={styles.switchTitle}>Modalidade ativa</Text>
                    <Text style={styles.switchSub}>
                      Permite criar turmas e exibir no catálogo
                    </Text>
                  </View>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
              ) : null}

              <View style={styles.submitWrap}>
                <ActionButton
                  label={
                    saving
                      ? "Salvando..."
                      : category
                        ? "Salvar alterações"
                        : "Criar modalidade"
                  }
                  icon={<Check size={16} color="#fff" />}
                  onPress={submit}
                  disabled={saving}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  content: { backgroundColor: "#FAFAFA" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  headerTextWrap: { flex: 1 },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
  },
  categoryIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  categoryName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  categoryDesc: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  capacityText: {
    fontSize: 11,
    color: COLORS.mainOrange,
    fontWeight: "600",
    marginTop: 4,
  },
  actionColumn: {
    alignItems: "flex-end",
    gap: 8,
  },
  editBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 12,
    fontWeight: "600",
  },
  emptyText: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalScroll: {
    padding: 22,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.foreground,
    backgroundColor: "#FFF",
  },
  textarea: {
    minHeight: 70,
    textAlignVertical: "top",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 4,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  switchSub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  submitWrap: {
    marginTop: 10,
  },
});
