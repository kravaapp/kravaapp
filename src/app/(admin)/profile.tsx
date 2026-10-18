import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Building2, Check, Store } from "lucide-react-native";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
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
import { useAuth } from "@/hooks/auth.hooks";
import { useCategories } from "@/hooks/categories.hooks";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { maskCnpj, maskPhone } from "@/utils/masks";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AdminProfile() {
  const refresh = useScreenRefresh([
    ["catalog-profile"],
    ["tenant-settings"],
    ["categories"],
  ]);
  const { toast } = useToast();
  const { updateCurrentTenantLogo } = useAuth();
  const { catalogProfile, tenantSettings, loading, hasError } = useAdminSettings();
  const {
    updateCatalogProfile,
    isUpdatingCatalogProfile,
    updateTenant,
    isUpdatingTenant,
  } = useSettingsActions();
  const { categories, isLoading: categoriesLoading } = useCategories();

  const [tenantForm, setTenantFormState] = useState<{
    name: string;
    cnpj: string;
    phone: string;
    email: string;
    logoUrl: string | null;
  }>({
    name: "",
    cnpj: "",
    phone: "",
    email: "",
    logoUrl: null,
  });
  const tenantDirty = useRef(false);
  const setTenantForm = (value: Parameters<typeof setTenantFormState>[0]) => {
    tenantDirty.current = true;
    setTenantFormState(value);
  };

  const [profile, setProfileState] = useState<{
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
  const profileDirty = useRef(false);
  const setProfile = (value: Parameters<typeof setProfileState>[0]) => {
    profileDirty.current = true;
    setProfileState(value);
  };

  useEffect(() => {
    if (tenantSettings && !tenantDirty.current) {
      setTenantFormState({
        name: tenantSettings.name || "",
        cnpj: maskCnpj(tenantSettings.cnpj || ""),
        phone: maskPhone(tenantSettings.phone || ""),
        email: tenantSettings.email || "",
        logoUrl: tenantSettings.logoUrl || null,
      });
    }
  }, [tenantSettings]);

  useEffect(() => {
    if (catalogProfile && !profileDirty.current) {
      const rawModalities = catalogProfile.modalities || [];
      const sanitized =
        categories && categories.length > 0
          ? rawModalities.filter((m) =>
              categories.some((cat) => cat.isActive && cat.name === m),
            )
          : rawModalities;

      setProfileState({
        showInCatalog: catalogProfile.showInCatalog ?? true,
        description: catalogProfile.description || "",
        bannerUrl: catalogProfile.bannerUrl || null,
        modalities: sanitized,
      });
    }
  }, [catalogProfile, categories]);

  const handleLogoChange = async (newLogoUrl: string) => {
    if (!tenantSettings) return;

    await updateTenant({
      name: tenantForm.name.trim() || tenantSettings.name || "",
      slug: tenantSettings.slug,
      logoUrl: newLogoUrl,
      address: tenantSettings.address,
      contact: tenantSettings.contact,
      cnpj: tenantForm.cnpj.trim() || null,
      phone: tenantForm.phone.trim() || null,
      email: tenantForm.email.trim() || null,
      gympassRepasse: tenantSettings.gympassRepasse,
      totalpassRepasse: tenantSettings.totalpassRepasse,
      waitlistTimeoutMinutes: tenantSettings.waitlistTimeoutMinutes,
      cancellationTimeoutMinutes: tenantSettings.cancellationTimeoutMinutes,
      noShowPenaltyFee: tenantSettings.noShowPenaltyFee,
      partnerCheckInLimit: tenantSettings.partnerCheckInLimit,
      churnReengageMessage: tenantSettings.churnReengageMessage,
    });
    setTenantFormState((prev) => ({ ...prev, logoUrl: newLogoUrl }));
    updateCurrentTenantLogo(newLogoUrl);
    tenantDirty.current = false;
  };

  const handleBannerChange = async (newBannerUrl: string) => {
    if (!catalogProfile) return;

    const activeNames = new Set(
      (categories ?? []).filter((item) => item.isActive).map((item) => item.name),
    );
    const sanitizedModalities =
      categories && categories.length > 0
        ? profile.modalities.filter((name) => activeNames.has(name))
        : profile.modalities;

    await updateCatalogProfile({
      showInCatalog: profile.showInCatalog,
      description: profile.description.trim() || null,
      bannerUrl: newBannerUrl,
      modalities: sanitizedModalities,
    });
    setProfileState((prev) => ({ ...prev, bannerUrl: newBannerUrl }));
    profileDirty.current = false;
  };

  const saveTenantData = async () => {
    try {
      if (!tenantSettings) return;
      await updateTenant({
        name: tenantForm.name.trim() || tenantSettings.name || "",
        slug: tenantSettings.slug,
        logoUrl: tenantForm.logoUrl,
        address: tenantSettings.address,
        contact: tenantSettings.contact,
        cnpj: tenantForm.cnpj.trim() || null,
        phone: tenantForm.phone.trim() || null,
        email: tenantForm.email.trim() || null,
        gympassRepasse: tenantSettings.gympassRepasse,
        totalpassRepasse: tenantSettings.totalpassRepasse,
        waitlistTimeoutMinutes: tenantSettings.waitlistTimeoutMinutes,
        cancellationTimeoutMinutes: tenantSettings.cancellationTimeoutMinutes,
        noShowPenaltyFee: tenantSettings.noShowPenaltyFee,
        partnerCheckInLimit: tenantSettings.partnerCheckInLimit,
        churnReengageMessage: tenantSettings.churnReengageMessage,
      });
      updateCurrentTenantLogo(tenantForm.logoUrl);
      tenantDirty.current = false;
      toast({ title: "Dados cadastrais atualizados com sucesso!" });
    } catch (err) {
      toast({
        title: normalizeApiError(err, "Não foi possível atualizar os dados cadastrais.").description,
        variant: "destructive",
      });
    }
  };

  const saveCatalogData = async () => {
    try {
      const activeNames = new Set(
        (categories ?? []).filter((item) => item.isActive).map((item) => item.name),
      );
      // Mantém apenas as modalidades que realmente existem e estão ativas no CT
      const sanitizedModalities = (categories && categories.length > 0)
        ? profile.modalities.filter((name) => activeNames.has(name))
        : profile.modalities;

      await updateCatalogProfile({
        showInCatalog: profile.showInCatalog,
        description: profile.description.trim() || null,
        bannerUrl: profile.bannerUrl || null,
        modalities: sanitizedModalities,
      });
      setProfileState((prev) => ({ ...prev, modalities: sanitizedModalities }));
      profileDirty.current = false;
      toast({ title: "Vitrine do catálogo atualizada com sucesso!" });
    } catch (err) {
      toast({
        title: normalizeApiError(err, "Não foi possível atualizar a vitrine.").description,
        variant: "destructive",
      });
    }
  };

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
                  title="perfil do ct"
                  subtitle="Dados cadastrais, logo oficial e vitrine no catálogo"
                />
              </View>
            </View>

            {hasError && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>
                  Não foi possível carregar as informações do CT. Puxe para atualizar.
                </Text>
              </View>
            )}

            {/* Dados Cadastrais e Identidade */}
            {loading.tenant ? (
              <AdminSkeleton width="100%" height={320} radius={14} />
            ) : (
              <AdminCard style={styles.cardGap}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrap}>
                    <Building2 size={22} color={COLORS.mainOrange} />
                  </View>
                  <View style={styles.grow}>
                    <SectionTitle>Identidade e Contato</SectionTitle>
                    <Text style={styles.subtext}>
                      Dados institucionais da sua academia e logotipo oficial
                    </Text>
                  </View>
                </View>

                <ImageUploadField
                  label="Logo do CT (Marca oficial)"
                  value={tenantForm.logoUrl}
                  category="logo"
                  aspectRatio={1}
                  maxWidth={140}
                  onChange={handleLogoChange}
                />

              <Text style={styles.fieldLabel}>Nome do CT</Text>
              <TextInput
                value={tenantForm.name}
                onChangeText={(val) =>
                  setTenantForm((prev) => ({ ...prev, name: val }))
                }
                placeholder="Ex: CT Demo - Academia Krava"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>CNPJ (Opcional)</Text>
              <TextInput
                value={tenantForm.cnpj}
                onChangeText={(val) =>
                  setTenantForm((prev) => ({ ...prev, cnpj: maskCnpj(val) }))
                }
                placeholder="00.000.000/0000-00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>Telefone / WhatsApp</Text>
              <TextInput
                value={tenantForm.phone}
                onChangeText={(val) =>
                  setTenantForm((prev) => ({ ...prev, phone: maskPhone(val) }))
                }
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              <Text style={styles.fieldLabel}>E-mail institucional</Text>
              <TextInput
                value={tenantForm.email}
                onChangeText={(val) =>
                  setTenantForm((prev) => ({ ...prev, email: val }))
                }
                placeholder="contato@seuct.com.br"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.textInput}
              />

              <View style={styles.submitWrap}>
                <ActionButton
                  label={isUpdatingTenant ? "Salvando..." : "Salvar dados cadastrais"}
                  icon={<Check size={16} color="#fff" />}
                  onPress={saveTenantData}
                  disabled={isUpdatingTenant}
                />
              </View>
            </AdminCard>
          )}

          {/* Vitrine do Catálogo */}
          {loading.catalogProfile ? (
            <AdminSkeleton width="100%" height={260} radius={14} />
          ) : (
            <AdminCard>
              <View style={styles.cardHeader}>
                <View style={styles.iconWrap}>
                  <Store size={22} color={COLORS.mainOrange} />
                </View>
                <View style={styles.grow}>
                  <SectionTitle>Apresentação no Catálogo</SectionTitle>
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
                maxHeight={220}
                onChange={handleBannerChange}
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
                    isUpdatingCatalogProfile
                      ? "Salvando..."
                      : "Salvar vitrine do catálogo"
                  }
                  icon={<Check size={16} color="#fff" />}
                  onPress={saveCatalogData}
                  disabled={isUpdatingCatalogProfile}
                />
              </View>
            </AdminCard>
          )}
        </AdminScreen>
      </RefreshableScrollView>
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
  cardGap: {
    marginBottom: 16,
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
  errorCard: {
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 13,
    fontWeight: "600",
  },
});
