import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  AdminPageHeader,
  Pill,
  SectionTitle,
} from "@/components/admin/AdminUi";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useCategories, useCategoryActions } from "@/hooks/categories.hooks";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { AvulsoConfigType, SchedulingRuleType } from "@/types/settings.types";
import { Category } from "@/types/categories.types";
import {
  maskCurrency,
  maskInteger,
  maskTime,
  maskTimeList,
  parseCurrency,
  toCurrencyInput,
} from "@/utils/masks";
import {
  Check,
  Clock,
  DollarSign,
  Globe2,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { ReactNode, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ruleDescription = (rule: SchedulingRuleType) => {
  const selectedDays =
    rule.daysOfWeek
      ?.map((day) => days[day])
      .filter(Boolean)
      .join(", ") || "todos os dias";
  const hours = rule.targetHours?.length
    ? `, aulas às ${rule.targetHours.map((hour) => hour.slice(0, 5)).join(", ")}`
    : "";
  return `Liberar ${rule.targetOffset} dia(s) antes, às ${rule.releaseTime?.slice(0, 5) || "--:--"}, para ${selectedDays}${hours}`;
};

export default function AdminSettings() {
  const { toast } = useToast();
  const {
    rules,
    avulsoConfigs,
    tenantSettings,
    catalogProfile,
    loading,
    hasError,
  } = useAdminSettings();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { createCategory, updateCategory, isSaving: isSavingCategory } = useCategoryActions();
  const {
    createRule,
    updateRule,
    deleteRule,
    updateAvulso,
    updateTenant,
    updateCatalogProfile,
    isCreatingRule,
    isUpdatingRule,
    isDeletingRule,
    isUpdatingAvulso,
    isUpdatingTenant,
    isUpdatingCatalogProfile,
  } = useSettingsActions();
  const [editingRule, setEditingRule] = useState<SchedulingRuleType | null | undefined>(undefined);
  const [editingCategory, setEditingCategory] = useState<Category | null | undefined>(undefined);
  const [editing, setEditing] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [tenantEditing, setTenantEditing] = useState<string | null>(null);
  const [tenantValues, setTenantValues] = useState({
    cancellationTimeoutMinutes: "",
    noShowPenaltyFee: "",
    partnerCheckInLimit: "",
  });
  const [profile, setProfile] = useState({
    showInCatalog: false,
    description: "",
    bannerUrl: "",
    modalities: [] as string[],
  });
  useEffect(() => {
    setPrices(
      Object.fromEntries(
        avulsoConfigs.map((item) => [
          item.modalidadeId,
          toCurrencyInput(item.price),
        ]),
      ),
    );
  }, [avulsoConfigs]);

  useEffect(() => {
    if (!tenantSettings) return;
    setTenantValues({
      cancellationTimeoutMinutes: maskInteger(
        String(tenantSettings.cancellationTimeoutMinutes ?? ""),
      ),
      noShowPenaltyFee: toCurrencyInput(tenantSettings.noShowPenaltyFee),
      partnerCheckInLimit: maskInteger(
        String(tenantSettings.partnerCheckInLimit ?? ""),
      ),
    });
  }, [tenantSettings]);

  useEffect(() => {
    if (!catalogProfile) return;
    setProfile({
      showInCatalog: catalogProfile.showInCatalog,
      description: catalogProfile.description ?? "",
      bannerUrl: catalogProfile.bannerUrl ?? "",
      modalities: catalogProfile.modalities ?? [],
    });
  }, [catalogProfile]);

  const saveCatalogProfile = async () => {
    if (isUpdatingCatalogProfile || categoriesLoading) return;
    try {
      await updateCatalogProfile({
        showInCatalog: profile.showInCatalog,
        description: profile.description.trim() || null,
        bannerUrl: profile.bannerUrl.trim() || null,
        modalities: profile.modalities,
      });
      toast({ title: "Perfil público atualizado!" });
    } catch {
      toast({
        title: "Não foi possível atualizar o perfil público.",
        variant: "destructive",
      });
    }
  };

  const saveTenant = async () => {
    if (!tenantSettings) return;
    const cancellationTimeoutMinutes = Number(
      tenantValues.cancellationTimeoutMinutes,
    );
    const noShowPenaltyFee = parseCurrency(tenantValues.noShowPenaltyFee);
    const partnerCheckInLimit = Number(tenantValues.partnerCheckInLimit);
    if (
      !Number.isInteger(cancellationTimeoutMinutes) ||
      cancellationTimeoutMinutes < 0 ||
      !Number.isFinite(noShowPenaltyFee) ||
      noShowPenaltyFee < 0 ||
      !Number.isInteger(partnerCheckInLimit) ||
      partnerCheckInLimit < 0
    ) {
      toast({
        title: "Informe valores válidos para a configuração.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateTenant({
        name: tenantSettings.name,
        slug: tenantSettings.slug,
        logoUrl: tenantSettings.logoUrl,
        address: tenantSettings.address,
        contact: tenantSettings.contact,
        gympassRepasse: tenantSettings.gympassRepasse,
        totalpassRepasse: tenantSettings.totalpassRepasse,
        waitlistTimeoutMinutes: tenantSettings.waitlistTimeoutMinutes,
        cancellationTimeoutMinutes,
        noShowPenaltyFee,
        partnerCheckInLimit,
      });
      setTenantEditing(null);
      toast({ title: "Configuração atualizada!" });
    } catch {
      toast({
        title: "Não foi possível atualizar a configuração.",
        variant: "destructive",
      });
    }
  };

  const saveAvulso = async (item: AvulsoConfigType, active = item.active) => {
    const price = parseCurrency(prices[item.modalidadeId] ?? "");
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Informe um preço válido.", variant: "destructive" });
      return;
    }
    try {
      await updateAvulso({
        modalidadeId: item.modalidadeId,
        config: { price, active },
      });
      setEditing(null);
      toast({ title: "Configuração de aula avulsa atualizada!" });
    } catch {
      toast({
        title: "Não foi possível atualizar a aula avulsa.",
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ClientHeader />
      <ScreenScrollView>
        <AdminScreen>
          <AdminPageHeader title="configurações" subtitle="Dados do CT e regras de operação" />
          {hasError && (
            <Text style={styles.error}>
              Algumas configurações não puderam ser carregadas.
            </Text>
          )}
          <SettingsCard
            icon={<Globe2 color={COLORS.mainOrange} size={20} />}
            title="Perfil público"
          >
            {loading.catalogProfile ? (
              <AdminSkeleton width="100%" height={250} radius={12} />
            ) : catalogProfile ? (
              <>
                <View style={styles.rule}>
                  <View style={styles.grow}>
                    <Text style={styles.itemTitle}>Exibir no catálogo</Text>
                    <Text style={styles.muted}>
                      Permite que novos alunos encontrem este CT.
                    </Text>
                  </View>
                  <Switch
                    value={profile.showInCatalog}
                    onValueChange={(showInCatalog) =>
                      setProfile((current) => ({ ...current, showInCatalog }))
                    }
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
                <Text style={styles.fieldLabel}>Descrição</Text>
                <TextInput
                  value={profile.description}
                  onChangeText={(description) =>
                    setProfile((current) => ({ ...current, description }))
                  }
                  placeholder="Apresente seu centro de treinamento"
                  multiline
                  style={[styles.fullInput, styles.textarea]}
                />
                <ImageUploadField
                  label="Banner do catálogo"
                  value={profile.bannerUrl || null}
                  category="banner"
                  onChange={(bannerUrl) =>
                    setProfile((current) => ({ ...current, bannerUrl }))
                  }
                />
                <Text style={styles.fieldLabel}>Modalidades exibidas</Text>
                {categoriesLoading ? (
                  <AdminSkeleton width="100%" height={50} radius={10} />
                ) : (
                  <View style={styles.profileModalities}>
                    {(categories ?? [])
                      .filter((item) => item.isActive)
                      .map((item) => {
                        const selected = profile.modalities.includes(item.name);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            onPress={() =>
                              setProfile((current) => ({
                                ...current,
                                modalities: selected
                                  ? current.modalities.filter(
                                      (name) => name !== item.name,
                                    )
                                  : [...current.modalities, item.name],
                              }))
                            }
                            style={[
                              styles.dayOption,
                              selected && styles.dayOptionActive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayText,
                                selected && styles.dayTextActive,
                              ]}
                            >
                              {item.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                )}
                <ActionButton
                  label={
                    isUpdatingCatalogProfile || categoriesLoading
                      ? "Aguarde..."
                      : "Salvar perfil público"
                  }
                  icon={<Check size={14} color="#fff" />}
                  onPress={saveCatalogProfile}
                />
              </>
            ) : (
              <Text style={styles.empty}>Perfil público indisponível.</Text>
            )}
          </SettingsCard>
          <SettingsCard
            icon={<Globe2 color={COLORS.mainOrange} size={20} />}
            title="Modalidades"
            action={
              <ActionButton
                label="Adicionar"
                icon={<Plus size={14} color="#fff" />}
                onPress={() => setEditingCategory(null)}
              />
            }
          >
            {categoriesLoading ? (
              <AdminSkeleton width="100%" height={130} radius={12} />
            ) : (categories ?? []).length === 0 ? (
              <Text style={styles.empty}>Nenhuma modalidade cadastrada.</Text>
            ) : (
              (categories ?? []).map((category) => (
                <View key={category.id} style={styles.rule}>
                  <View style={styles.grow}>
                    <Text style={styles.itemTitle}>{category.name || "Modalidade sem nome"}</Text>
                    <Text style={styles.muted}>
                      {category.description || "Sem descrição"} · capacidade padrão {category.defaultCapacity}
                    </Text>
                  </View>
                  <Pill label={category.isActive ? "Ativa" : "Inativa"} tone={category.isActive ? "success" : "neutral"} />
                  <TouchableOpacity onPress={() => setEditingCategory(category)} style={styles.edit}>
                    <Pencil size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SettingsCard>
          <SettingsCard
            icon={<Clock color={COLORS.mainOrange} size={20} />}
            title="Regras de agendamento"
            action={
              <ActionButton
                label="Adicionar"
                icon={<Plus size={14} color="#fff" />}
                onPress={() => setEditingRule(null)}
              />
            }
          >
            {loading.rules ? (
              <AdminSkeleton width="100%" height={130} radius={12} />
            ) : rules.length === 0 ? (
              <Text style={styles.empty}>Nenhuma regra cadastrada.</Text>
            ) : (
              rules.map((rule) => (
                <View key={rule.id} style={styles.rule}>
                  <Text style={[styles.itemTitle, styles.grow]}>
                    {ruleDescription(rule)}
                  </Text>
                  <Pill label="Ativa" tone="success" />
                  <TouchableOpacity onPress={() => setEditingRule(rule)} style={styles.edit}>
                    <Pencil size={17} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isDeletingRule}
                    onPress={async () => {
                      try {
                        await deleteRule(rule.id);
                        toast({ title: "Regra excluída!" });
                      } catch (requestError) {
                        toast({
                          title: normalizeApiError(
                            requestError,
                            "Não foi possível excluir a regra.",
                          ).description,
                          variant: "destructive",
                        });
                      }
                    }}
                    style={styles.edit}
                  >
                    <Trash2 size={17} color={COLORS.destructive} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SettingsCard>
          <SettingsCard
            icon={<DollarSign color={COLORS.mainOrange} size={20} />}
            title="Aula avulsa"
          >
            <Text style={styles.muted}>
              Configure a disponibilidade e o preço por modalidade.
            </Text>
            {loading.avulso ? (
              <AdminSkeleton width="100%" height={160} radius={12} />
            ) : avulsoConfigs.length === 0 ? (
              <Text style={styles.empty}>
                Nenhuma modalidade configurada para aula avulsa.
              </Text>
            ) : (
              avulsoConfigs.map((item) => (
                <View key={item.modalidadeId} style={styles.rule}>
                  <View style={styles.grow}>
                    <Text style={styles.itemTitle}>
                      {item.modalidadeName || "Modalidade"}
                    </Text>
                    {editing === item.modalidadeId ? (
                      <View style={styles.inputRow}>
                        <Text>R$</Text>
                        <TextInput
                          value={prices[item.modalidadeId] ?? ""}
                          onChangeText={(value) =>
                            setPrices((current) => ({
                              ...current,
                              [item.modalidadeId]: maskCurrency(value),
                            }))
                          }
                          keyboardType="number-pad"
                          style={styles.input}
                        />
                        <Text style={styles.muted}>por aula</Text>
                      </View>
                    ) : (
                      <Text style={styles.muted}>
                        R${" "}
                        {item.price.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        por aula
                      </Text>
                    )}
                  </View>
                  {editing === item.modalidadeId ? (
                    <ActionButton
                      label={isUpdatingAvulso ? "Salvando..." : "Salvar"}
                      icon={<Check size={14} color="#fff" />}
                      onPress={() => saveAvulso(item)}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setEditing(item.modalidadeId)}
                      style={styles.edit}
                    >
                      <Pencil size={17} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={item.active}
                    onValueChange={(active) => saveAvulso(item, active)}
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
              ))
            )}
          </SettingsCard>
          <SettingsCard
            icon={<ShieldAlert color={COLORS.destructive} size={20} />}
            title="Regras de cancelamento"
          >
            {loading.tenant ? (
              <AdminSkeleton width="100%" height={130} radius={12} />
            ) : tenantSettings ? (
              <>
                <EditableRow
                  label="Prazo mínimo para cancelamento"
                  value={tenantValues.cancellationTimeoutMinutes}
                  suffix="minuto(s) antes da aula"
                  editing={tenantEditing === "cancellationTimeoutMinutes"}
                  onEdit={() => setTenantEditing("cancellationTimeoutMinutes")}
                  onChange={(value) =>
                    setTenantValues((current) => ({
                      ...current,
                      cancellationTimeoutMinutes: value,
                    }))
                  }
                  onSave={saveTenant}
                  saving={isUpdatingTenant}
                  mask={maskInteger}
                />
                <EditableRow
                  label="Multa por falta não cancelada"
                  value={tenantValues.noShowPenaltyFee}
                  suffix="reais"
                  editing={tenantEditing === "noShowPenaltyFee"}
                  onEdit={() => setTenantEditing("noShowPenaltyFee")}
                  onChange={(value) =>
                    setTenantValues((current) => ({
                      ...current,
                      noShowPenaltyFee: value,
                    }))
                  }
                  onSave={saveTenant}
                  saving={isUpdatingTenant}
                  mask={maskCurrency}
                />
              </>
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
          </SettingsCard>
          <SettingsCard
            icon={<Users color={COLORS.mainOrange} size={20} />}
            title="Limites de check-in por parceiro"
          >
            {loading.tenant ? (
              <AdminSkeleton width="100%" height={90} radius={12} />
            ) : tenantSettings ? (
              <EditableRow
                label="Todos os parceiros"
                value={tenantValues.partnerCheckInLimit}
                suffix="check-in(s) por aluno"
                editing={tenantEditing === "partnerCheckInLimit"}
                onEdit={() => setTenantEditing("partnerCheckInLimit")}
                onChange={(value) =>
                  setTenantValues((current) => ({
                    ...current,
                    partnerCheckInLimit: value,
                  }))
                }
                onSave={saveTenant}
                saving={isUpdatingTenant}
                mask={maskInteger}
              />
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
            <Text style={styles.info}>
              ⓘ Estas configurações se aplicam a todos os alunos parceiros.
            </Text>
          </SettingsCard>
        </AdminScreen>
      </ScreenScrollView>
      <RuleModal
        rule={editingRule}
        visible={editingRule !== undefined}
        saving={isCreatingRule || isUpdatingRule}
        onClose={() => setEditingRule(undefined)}
        onSave={async (rule) => {
          try {
            if (editingRule) await updateRule({ id: editingRule.id, rule });
            else await createRule(rule);
            setEditingRule(undefined);
            toast({ title: editingRule ? "Regra atualizada!" : "Regra de agendamento criada!" });
          } catch (requestError) {
            setEditingRule(undefined);
            toast({
              title: normalizeApiError(
                requestError,
                editingRule
                  ? "Não foi possível atualizar a regra."
                  : "Não foi possível criar a regra.",
              ).description,
              variant: "destructive",
            });
          }
        }}
      />
      <CategoryModal
        category={editingCategory}
        visible={editingCategory !== undefined}
        saving={isSavingCategory}
        onClose={() => setEditingCategory(undefined)}
        onSave={async (data) => {
          try {
            if (editingCategory) await updateCategory({ id: editingCategory.id, data });
            else {
              const { isActive: _isActive, ...createData } = data;
              await createCategory(createData);
            }
            setEditingCategory(undefined);
            toast({ title: editingCategory ? "Modalidade atualizada!" : "Modalidade criada!" });
          } catch (requestError) {
            setEditingCategory(undefined);
            toast({
              title: normalizeApiError(
                requestError,
                "Não foi possível salvar a modalidade.",
              ).description,
              variant: "destructive",
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

function RuleModal({
  rule,
  visible,
  saving,
  onClose,
  onSave,
}: {
  rule: SchedulingRuleType | null | undefined;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (rule: Omit<SchedulingRuleType, "id">) => void;
}) {
  const [releaseTime, setReleaseTime] = useState("");
  const [targetOffset, setTargetOffset] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [errors, setErrors] = useState({ days: false, releaseTime: false, targetOffset: false });
  useEffect(() => {
    if (!visible) return;
    setReleaseTime(rule?.releaseTime?.slice(0, 5) ?? "");
    setTargetOffset(rule ? String(rule.targetOffset) : "");
    setTargetHours(rule?.targetHours?.join(", ") ?? "");
    setSelectedDays(rule?.daysOfWeek ?? []);
    setErrors({ days: false, releaseTime: false, targetOffset: false });
  }, [rule, visible]);
  const submit = () => {
    const offset = Number(targetOffset);
    const nextErrors = {
      days: selectedDays.length === 0,
      releaseTime: !/^\d{2}:\d{2}$/.test(releaseTime),
      targetOffset: !Number.isInteger(offset) || offset < 0,
    };
    if (Object.values(nextErrors).some(Boolean)) {
      setErrors(nextErrors);
      return;
    }
    onSave({
      releaseTime,
      targetOffset: offset,
      daysOfWeek: selectedDays,
      targetHours: targetHours
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    });
  };
  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <SectionTitle>{rule ? "Editar regra" : "Nova regra"}</SectionTitle>
                <TouchableOpacity onPress={onClose}>
                  <X color={COLORS.foreground} />
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldLabel}>Dias das aulas</Text>
              <View style={styles.dayOptions}>
                {days.map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    onPress={() => {
                      setSelectedDays((current) =>
                        current.includes(index)
                          ? current.filter((value) => value !== index)
                          : [...current, index],
                      );
                      setErrors((current) => ({ ...current, days: false }));
                    }}
                    style={[
                      styles.dayOption,
                      selectedDays.includes(index) && styles.dayOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDays.includes(index) && styles.dayTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {errors.days ? <Text style={styles.fieldError}>Selecione pelo menos um dia.</Text> : null}
              <Text style={styles.fieldLabel}>Liberar às</Text>
              <TextInput
                value={releaseTime}
                onChangeText={(value) => {
                  setReleaseTime(maskTime(value));
                  setErrors((current) => ({ ...current, releaseTime: false }));
                }}
                placeholder="08:00"
                keyboardType="number-pad"
                style={[styles.fullInput, errors.releaseTime && styles.inputError]}
              />
              {errors.releaseTime ? <Text style={styles.fieldError}>Informe um horário no formato HH:MM.</Text> : null}
              <Text style={styles.fieldLabel}>Antecedência em dias</Text>
              <TextInput
                value={targetOffset}
                onChangeText={(value) => {
                  setTargetOffset(maskInteger(value));
                  setErrors((current) => ({ ...current, targetOffset: false }));
                }}
                placeholder="7"
                keyboardType="number-pad"
                style={[styles.fullInput, errors.targetOffset && styles.inputError]}
              />
              {errors.targetOffset ? <Text style={styles.fieldError}>Informe uma quantidade de dias válida.</Text> : null}
              <Text style={styles.fieldLabel}>Horários das aulas (opcional)</Text>
              <TextInput
                value={targetHours}
                onChangeText={(value) => setTargetHours(maskTimeList(value))}
                placeholder="18:00, 19:00"
                keyboardType="number-pad"
                style={styles.fullInput}
              />
              <ActionButton
                label={saving ? "Salvando..." : rule ? "Salvar alterações" : "Criar regra"}
                onPress={submit}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
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
  onSave: (data: { name: string | null; description: string | null; defaultCapacity: number; isActive: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    setCapacity(category ? String(category.defaultCapacity) : "");
    setIsActive(category?.isActive ?? true);
    setError("");
  }, [category, visible]);

  const submit = () => {
    const defaultCapacity = Number(capacity);
    if (!name.trim() || !Number.isInteger(defaultCapacity) || defaultCapacity <= 0) {
      setError(!name.trim() ? "Informe o nome da modalidade." : "Informe uma capacidade padrão válida.");
      return;
    }
    onSave({ name: name.trim(), description: description.trim() || null, defaultCapacity, isActive });
  };

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <SectionTitle>{category ? "Editar modalidade" : "Nova modalidade"}</SectionTitle>
                <TouchableOpacity onPress={onClose}><X color={COLORS.foreground} /></TouchableOpacity>
              </View>
              {error ? <Text style={styles.fieldError}>{error}</Text> : null}
              <Text style={styles.fieldLabel}>Nome *</Text>
              <TextInput value={name} onChangeText={(value) => { setName(value); setError(""); }} style={styles.fullInput} />
              <Text style={styles.fieldLabel}>Descrição</Text>
              <TextInput value={description} onChangeText={setDescription} style={[styles.fullInput, styles.textarea]} multiline />
              <Text style={styles.fieldLabel}>Capacidade padrão *</Text>
              <TextInput value={capacity} onChangeText={(value) => { setCapacity(maskInteger(value)); setError(""); }} keyboardType="number-pad" style={styles.fullInput} />
              {category ? (
                <View style={styles.rule}>
                  <Text style={[styles.itemTitle, styles.grow]}>Modalidade ativa</Text>
                  <Switch value={isActive} onValueChange={setIsActive} trackColor={{ true: COLORS.mainOrange }} />
                </View>
              ) : null}
              <ActionButton label={saving ? "Salvando..." : category ? "Salvar alterações" : "Criar modalidade"} onPress={submit} />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function SettingsCard({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AdminCard>
      <View style={styles.cardHeader}>
        <View style={styles.headerTitle}>
          <View style={styles.icon}>{icon}</View>
          <View style={styles.titleContent}>
            <SectionTitle>{title}</SectionTitle>
          </View>
        </View>
        {action}
      </View>
      {children}
    </AdminCard>
  );
}

function EditableRow({
  label,
  value,
  suffix,
  editing,
  onEdit,
  onChange,
  onSave,
  saving = false,
  mask,
}: {
  label: string;
  value: string;
  suffix: string;
  editing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
  mask: (value: string) => string;
}) {
  return (
    <View style={styles.rule}>
      <View style={styles.grow}>
        <Text style={styles.itemTitle}>{label}</Text>
        {editing ? (
          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={(next) => onChange(mask(next))}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.muted}>{suffix}</Text>
          </View>
        ) : (
          <Text style={styles.muted}>
            {value} {suffix}
          </Text>
        )}
      </View>
      {editing ? (
        <ActionButton
          label={saving ? "Salvando..." : "Salvar"}
          icon={<Check size={14} color="#fff" />}
          onPress={onSave}
        />
      ) : (
        <TouchableOpacity onPress={onEdit} style={styles.edit}>
          <Pencil size={17} color={COLORS.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  error: {
    backgroundColor: "#fee2e2",
    color: COLORS.destructive,
    padding: 12,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 200,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  titleContent: { flex: 1, minWidth: 0 },
  icon: {
    width: 39,
    height: 39,
    flexShrink: 0,
    borderRadius: 11,
    backgroundColor: "#FFF0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#F7F8FA",
  },
  grow: { flex: 1, gap: 3 },
  itemTitle: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 11, lineHeight: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 3,
  },
  input: {
    width: 72,
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
  edit: { padding: 8 },
  info: {
    color: COLORS.mainOrange,
    fontSize: 11,
    lineHeight: 17,
    backgroundColor: "#FFF0E6",
    padding: 11,
    borderRadius: 10,
  },
  empty: { textAlign: "center", color: COLORS.mutedForeground, padding: 24 },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Teto para o sheet poder encolher quando o teclado sobe; o padding foi
    // para o contentContainer da ScrollView, que é quem rola agora — daí o
    // overflow, para o conteúdo não passar por cima dos cantos arredondados.
    maxHeight: "92%",
    overflow: "hidden",
  },
  modalContent: {
    padding: 20,
    gap: 12,
  },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  fullInput: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  inputError: { borderColor: COLORS.destructive },
  fieldError: { color: COLORS.destructive, fontSize: 11, fontWeight: "600" },
  textarea: { minHeight: 90, paddingTop: 10, textAlignVertical: "top" },
  profileModalities: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  dayOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  dayOptionActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  dayText: { color: COLORS.mutedForeground, fontSize: 11, fontWeight: "700" },
  dayTextActive: { color: COLORS.white },
});
