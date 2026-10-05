import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Check, Store } from "lucide-react-native";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminPageHeader,
  AdminScreen,
  AdminSkeleton,
  SectionTitle,
} from "@/components/admin/AdminUi";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useCategories } from "@/hooks/categories.hooks";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminProfile() {
  const { toast } = useToast();
  const { catalogProfile, loading } = useAdminSettings();
  const { updateCatalogProfile, isUpdatingCatalogProfile } = useSettingsActions();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const [profile, setProfile] = useState<{
    showInCatalog: boolean;
    description: string;
    bannerUrl: string | null;
    modalities: string[];
  }>({
    showInCatalog: true,
    description: "",
    bannerUrl: null,
    modalities: [],
  });

  useEffect(() => {
    if (catalogProfile) {
      setProfile({
        showInCatalog: catalogProfile.showInCatalog ?? true,
        description: catalogProfile.description || "",
        bannerUrl: catalogProfile.bannerUrl || null,
        modalities: catalogProfile.modalities || [],
      });
    }
  }, [catalogProfile]);

  const saveProfile = async () => {
    try {
      await updateCatalogProfile({
        showInCatalog: profile.showInCatalog,
        description: profile.description.trim() || null,
        bannerUrl: profile.bannerUrl || null,
        modalities: profile.modalities,
      });
      toast({ title: "Perfil do CT atualizado com sucesso!" });
    } catch (err) {
      toast({
        title: normalizeApiError(err, "Não foi possível atualizar o perfil.").description,
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ClientHeader />
      <ScreenScrollView style={styles.content}>
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
                title="perfil do ct"
                subtitle="Vitrine pública no catálogo, banner e apresentação"
              />
            </View>
          </View>

          {loading.catalogProfile ? (
            <AdminSkeleton width="100%" height={260} radius={14} />
          ) : (
            <AdminCard>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Store size={22} color={COLORS.mainOrange} />
                </View>
                <View style={styles.grow}>
                  <SectionTitle>Apresentação do CT</SectionTitle>
                  <Text style={styles.subtext}>
                    Estas informações são exibidas para novos alunos no catálogo
                  </Text>
                </View>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.grow}>
                  <Text style={styles.switchTitle}>Exibir CT no catálogo</Text>
                  <Text style={styles.switchSub}>
                    Permite que alunos encontrem este CT pelo app
                  </Text>
                </View>
                <Switch
                  value={profile.showInCatalog}
                  onValueChange={(showInCatalog) =>
                    setProfile((prev) => ({ ...prev, showInCatalog }))
                  }
                  trackColor={{ true: COLORS.mainOrange }}
                />
              </View>

              <Text style={styles.fieldLabel}>Descrição e Apresentação</Text>
              <TextInput
                value={profile.description}
                onChangeText={(val) =>
                  setProfile((prev) => ({ ...prev, description: val }))
                }
                placeholder="Conte sobre seu CT, metodologia, estrutura, professores..."
                placeholderTextColor={COLORS.mutedForeground}
                style={[styles.textInput, styles.textarea]}
                multiline
              />

              <ImageUploadField
                label="Banner de capa do catálogo"
                value={profile.bannerUrl || null}
                category="banner"
                onChange={(bannerUrl) =>
                  setProfile((prev) => ({ ...prev, bannerUrl }))
                }
              />

              <Text style={styles.fieldLabel}>
                Modalidades em destaque no catálogo
              </Text>
              <Text style={styles.fieldHint}>
                Selecione quais artes marciais aparecem na vitrine do seu CT
              </Text>

              {categoriesLoading ? (
                <AdminSkeleton width="100%" height={50} radius={10} />
              ) : (
                <View style={styles.modalitiesGrid}>
                  {(categories ?? [])
                    .filter((item) => item.isActive)
                    .map((item) => {
                      const selected = profile.modalities.includes(item.name);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() =>
                            setProfile((prev) => ({
                              ...prev,
                              modalities: selected
                                ? prev.modalities.filter((name) => name !== item.name)
                                : [...prev.modalities, item.name],
                            }))
                          }
                          style={[
                            styles.modalityChip,
                            selected && styles.modalityChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.modalityText,
                              selected && styles.modalityTextActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}

              <View style={styles.submitWrap}>
                <ActionButton
                  label={
                    isUpdatingCatalogProfile ? "Salvando..." : "Salvar alterações"
                  }
                  icon={<Check size={16} color="#fff" />}
                  onPress={saveProfile}
                  disabled={isUpdatingCatalogProfile}
                />
              </View>
            </AdminCard>
          )}
        </AdminScreen>
      </ScreenScrollView>
    </SafeAreaView>
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  grow: { flex: 1 },
  subtext: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 6,
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 10,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: -2,
    marginBottom: 4,
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
    minHeight: 85,
    textAlignVertical: "top",
  },
  modalitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  modalityChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  modalityChipActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: "#FFF7ED",
  },
  modalityText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  modalityTextActive: {
    color: COLORS.mainOrange,
    fontWeight: "700",
  },
  submitWrap: {
    marginTop: 16,
  },
});
