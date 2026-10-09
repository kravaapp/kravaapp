import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import React, { ReactNode, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Plus,
  ShieldAlert,
  Trash2,
  Users,
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
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { useTenantPartners, usePartnerActions } from "@/hooks/partners.hooks";
import { TenantPartnerType } from "@/types/partners.types";
import { normalizeApiError } from "@/routes/apiError";
import { SchedulingRuleType } from "@/types/settings.types";
import {
  maskCurrency,
  maskInteger,
  maskTime,
  maskTimeList,
  parseCurrency,
  toCurrencyInput,
} from "@/utils/masks";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

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
  const refresh = useScreenRefresh([
    ["scheduling-rules"],
    ["tenant-settings"],
    ["avulso-configs"],
    ["catalog-profile"],
    ["tenant-partners"],
  ]);
  const { toast } = useToast();
  const {
    rules,
    tenantSettings,
    loading,
    hasError,
  } = useAdminSettings();
  const {
    createRule,
    updateRule,
    deleteRule,
    updateTenant,
    isCreatingRule,
    isUpdatingRule,
    isDeletingRule,
    isUpdatingTenant,
  } = useSettingsActions();
  const {
    partners,
    isLoading: loadingPartners,
  } = useTenantPartners();
  const {
    createPartner,
    updatePartner,
    deletePartner,
    isCreating: isCreatingPartner,
    isUpdating: isUpdatingPartner,
    isDeleting: isDeletingPartner,
  } = usePartnerActions();

  const [editingRule, setEditingRule] = useState<SchedulingRuleType | null | undefined>(
    undefined,
  );
  const [editingPartner, setEditingPartner] = useState<
    TenantPartnerType | null | undefined
  >(undefined);
  const [tenantEditing, setTenantEditing] = useState<string | null>(null);
  const [tenantValues, setTenantValues] = useState({
    cancellationTimeoutMinutes: "",
    noShowPenaltyFee: "",
  });

  useEffect(() => {
    if (tenantSettings && !tenantEditing) {
      setTenantValues({
        cancellationTimeoutMinutes:
          tenantSettings.cancellationTimeoutMinutes !== undefined
            ? String(tenantSettings.cancellationTimeoutMinutes)
            : "",
        noShowPenaltyFee:
          tenantSettings.noShowPenaltyFee !== undefined
            ? toCurrencyInput(tenantSettings.noShowPenaltyFee)
            : "",
      });
    }
  }, [tenantSettings]);

  const saveTenant = async () => {
    if (!tenantSettings) return;
    const cancellationTimeoutMinutes = Number(
      tenantValues.cancellationTimeoutMinutes,
    );
    const noShowPenaltyFee = parseCurrency(tenantValues.noShowPenaltyFee);
    if (
      !Number.isInteger(cancellationTimeoutMinutes) ||
      cancellationTimeoutMinutes < 0 ||
      !Number.isFinite(noShowPenaltyFee) ||
      noShowPenaltyFee < 0
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
        partnerCheckInLimit: tenantSettings.partnerCheckInLimit ?? 0,
        churnReengageMessage: tenantSettings.churnReengageMessage,
      });
      setTenantEditing(null);
      toast({ title: "Políticas do CT atualizadas!" });
    } catch {
      toast({
        title: "Não foi possível atualizar a configuração.",
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ClientHeader />
      <RefreshableScrollView {...refresh}>
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
                title="políticas do ct"
                subtitle="Regras de agendamento, cancelamento e limites"
              />
            </View>
          </View>

          {hasError && (
            <Text style={styles.error}>
              Algumas configurações não puderam ser carregadas.
            </Text>
          )}

          {/* Regras de Agendamento */}
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
                  <TouchableOpacity
                    style={styles.ruleTouchable}
                    activeOpacity={0.7}
                    onPress={() => setEditingRule(rule)}
                    accessibilityRole="button"
                    accessibilityLabel="Editar regra de agendamento"
                  >
                    <Text style={[styles.itemTitle, styles.grow]}>
                      {ruleDescription(rule)}
                    </Text>
                    <Pill label="Ativa" tone="success" />
                    <ChevronRight size={18} color={COLORS.mutedForeground} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </SettingsCard>

          {/* Regras de Cancelamento */}
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
                  onPress={() => setTenantEditing("cancellationTimeoutMinutes")}
                />
                <EditableRow
                  label="Multa por falta não cancelada (No-Show)"
                  value={tenantValues.noShowPenaltyFee}
                  suffix="reais"
                  onPress={() => setTenantEditing("noShowPenaltyFee")}
                />
              </>
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
          </SettingsCard>

          {/* Parceiros e convênios */}
          <SettingsCard
            icon={<Users color={COLORS.mainOrange} size={20} />}
            title="Parceiros e convênios"
            action={
              <ActionButton
                label="Adicionar"
                icon={<Plus size={14} color="#fff" />}
                onPress={() => setEditingPartner(null)}
              />
            }
          >
            {loadingPartners ? (
              <AdminSkeleton width="100%" height={120} radius={12} />
            ) : partners.length === 0 ? (
              <Text style={styles.empty}>Nenhum parceiro cadastrado.</Text>
            ) : (
              partners.map((partner) => (
                <TouchableOpacity
                  key={partner.id}
                  style={styles.editableRow}
                  activeOpacity={0.7}
                  onPress={() => setEditingPartner(partner)}
                  accessibilityRole="button"
                  accessibilityLabel={`Editar parceiro ${partner.name}`}
                >
                  <View style={styles.grow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={styles.itemTitle}>{partner.name}</Text>
                      <Pill
                        label={partner.isActive ? "Ativo" : "Inativo"}
                        tone={partner.isActive ? "success" : "neutral"}
                      />
                    </View>
                    <Text style={styles.muted}>
                      {partner.monthlyCheckInLimit === 0
                        ? "Check-ins ilimitados"
                        : `${partner.monthlyCheckInLimit} check-in(s)/mês`}{" "}
                      • Repasse: {currency(partner.repasse)}
                    </Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.mutedForeground} />
                </TouchableOpacity>
              ))
            )}
            <Text style={styles.info}>
              ⓘ Defina limites mensais de check-in e valores de repasse por parceiro (Gympass, TotalPass, etc).
            </Text>
          </SettingsCard>
        </AdminScreen>
      </RefreshableScrollView>

      {/* Modal de Regra de Agendamento */}
      <RuleModal
        rule={editingRule}
        visible={editingRule !== undefined}
        saving={isCreatingRule || isUpdatingRule}
        deleting={isDeletingRule}
        onClose={() => setEditingRule(undefined)}
        onSave={async (rule) => {
          try {
            if (editingRule) await updateRule({ id: editingRule.id, rule });
            else await createRule(rule);
            setEditingRule(undefined);
            toast({
              title: editingRule
                ? "Regra atualizada!"
                : "Regra de agendamento criada!",
            });
          } catch (requestError) {
            toast({
              title: normalizeApiError(
                requestError,
                "Não foi possível salvar a regra de agendamento.",
              ).description,
              variant: "destructive",
            });
          }
        }}
        onDelete={async (id) => {
          try {
            await deleteRule(id);
            setEditingRule(undefined);
            toast({ title: "Regra excluída com sucesso!" });
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
      />

      {/* Modal de Configuração de Valor */}
      <EditSettingModal
        visible={tenantEditing !== null}
        title={
          tenantEditing === "cancellationTimeoutMinutes"
            ? "Prazo de cancelamento"
            : "Multa por falta (No-Show)"
        }
        subtitle="Defina o novo valor da política"
        value={
          tenantEditing === "cancellationTimeoutMinutes"
            ? tenantValues.cancellationTimeoutMinutes
            : tenantValues.noShowPenaltyFee
        }
        suffix={
          tenantEditing === "cancellationTimeoutMinutes"
            ? "minuto(s) antes da aula"
            : "reais"
        }
        mask={tenantEditing === "noShowPenaltyFee" ? maskCurrency : maskInteger}
        onChange={(val) => {
          if (tenantEditing) {
            setTenantValues((prev) => ({ ...prev, [tenantEditing]: val }));
          }
        }}
        onClose={() => {
          if (tenantSettings) {
            setTenantValues({
              cancellationTimeoutMinutes: String(
                tenantSettings.cancellationTimeoutMinutes ?? 0,
              ),
              noShowPenaltyFee: toCurrencyInput(
                tenantSettings.noShowPenaltyFee ?? 0,
              ),
            });
          }
          setTenantEditing(null);
        }}
        onSave={saveTenant}
        saving={isUpdatingTenant}
      />

      {/* Modal de Parceiro */}
      <PartnerModal
        partner={editingPartner}
        visible={editingPartner !== undefined}
        saving={isCreatingPartner || isUpdatingPartner}
        deleting={isDeletingPartner}
        onClose={() => setEditingPartner(undefined)}
        onSave={async (data) => {
          try {
            if (editingPartner) {
              await updatePartner({ id: editingPartner.id, partner: data });
              toast({ title: `Parceiro ${data.name} atualizado!` });
            } else {
              await createPartner(data);
              toast({ title: `Parceiro ${data.name} criado com sucesso!` });
            }
            setEditingPartner(undefined);
          } catch (requestError) {
            toast({
              title: normalizeApiError(
                requestError,
                "Não foi possível salvar o parceiro.",
              ).description,
              variant: "destructive",
            });
          }
        }}
        onDelete={async (id) => {
          try {
            await deletePartner(id);
            setEditingPartner(undefined);
            toast({ title: "Parceiro removido com sucesso!" });
          } catch (requestError) {
            toast({
              title: normalizeApiError(
                requestError,
                "Não foi possível remover o parceiro.",
              ).description,
              variant: "destructive",
            });
          }
        }}
      />
    </SafeAreaView>
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
  onPress,
}: {
  label: string;
  value: string;
  suffix: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.editableRow}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Editar ${label}`}
    >
      <View style={styles.grow}>
        <Text style={styles.itemTitle}>{label}</Text>
        <Text style={styles.muted}>
          {value ? `${value} ${suffix}` : "Não configurado"}
        </Text>
      </View>
      <ChevronRight size={18} color={COLORS.mutedForeground} />
    </TouchableOpacity>
  );
}

function EditSettingModal({
  visible,
  title,
  subtitle,
  value,
  onChange,
  onSave,
  onClose,
  saving,
  suffix,
  mask,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving?: boolean;
  suffix: string;
  mask?: (val: string) => string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View
              style={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              ]}
            >
              <View style={styles.header}>
                <View style={styles.grow}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.muted}>{subtitle}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={COLORS.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>Valor ({suffix})</Text>
                <TextInput
                  value={value}
                  onChangeText={(val) => onChange(mask ? mask(val) : val)}
                  keyboardType="number-pad"
                  style={styles.fullInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.mutedForeground}
                />
              </View>
              <View style={styles.modalButtons}>
                <View style={styles.modalBtn}>
                  <ActionButton
                    outline
                    label="Cancelar"
                    onPress={onClose}
                  />
                </View>
                <View style={styles.modalBtn}>
                  <ActionButton
                    label={saving ? "Salvando..." : "Salvar"}
                    icon={<Check size={14} color="#fff" />}
                    onPress={onSave}
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function RuleModal({
  rule,
  visible,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  rule: SchedulingRuleType | null | undefined;
  visible: boolean;
  saving: boolean;
  deleting?: boolean;
  onClose: () => void;
  onSave: (rule: Omit<SchedulingRuleType, "id">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [offset, setOffset] = useState("1");
  const [time, setTime] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (rule) {
      setOffset(String(rule.targetOffset));
      setTime(rule.releaseTime?.slice(0, 5) || "");
      setSelectedDays(rule.daysOfWeek ?? []);
      setHours((rule.targetHours ?? []).map((h) => h.slice(0, 5)).join(", "));
      setError("");
    } else {
      setOffset("1");
      setTime("");
      setSelectedDays([]);
      setHours("");
      setError("");
    }
  }, [rule, visible]);

  const toggleDay = (day: number) => {
    setSelectedDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day].sort(),
    );
  };

  const submit = () => {
    const targetOffset = Number(offset);
    if (!Number.isInteger(targetOffset) || targetOffset < 0) {
      setError("Informe uma antecedência válida.");
      return;
    }
    if (!time) {
      setError("Informe o horário de liberação.");
      return;
    }
    const targetHours = hours
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => (item.length === 5 ? `${item}:00` : item));
    onSave({
      targetOffset,
      releaseTime: time.length === 5 ? `${time}:00` : time,
      daysOfWeek: selectedDays,
      targetHours,
    });
  };

  const handleDelete = () => {
    if (!rule || !onDelete) return;
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm("Deseja realmente excluir esta regra de agendamento?")
      ) {
        onDelete(rule.id);
      }
    } else {
      Alert.alert(
        "Excluir regra",
        "Tem certeza que deseja excluir esta regra de agendamento? Esta ação não pode ser desfeita.",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: () => onDelete(rule.id),
          },
        ],
      );
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.grow}>
                  <Text style={styles.modalTitle}>
                    {rule ? "Editar regra" : "Nova regra de agendamento"}
                  </Text>
                  <Text style={styles.muted}>
                    {rule
                      ? "Atualize as condições de liberação de vagas"
                      : "Defina quando as vagas serão abertas para os alunos"}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={COLORS.foreground} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.fieldError}>{error}</Text> : null}
              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>
                  Liberar agendamento com quantos dias de antecedência? *
                </Text>
                <TextInput
                  value={offset}
                  onChangeText={(value) => {
                    setOffset(maskInteger(value));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  style={styles.fullInput}
                  placeholder="Ex: 1"
                  placeholderTextColor={COLORS.mutedForeground}
                />
              </View>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>
                  Horário da liberação das vagas (HH:mm) *
                </Text>
                <TextInput
                  value={time}
                  onChangeText={(value) => {
                    setTime(maskTime(value));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  placeholder="Ex: 06:00"
                  placeholderTextColor={COLORS.mutedForeground}
                  style={styles.fullInput}
                />
              </View>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>Dias da semana</Text>
                <View style={styles.days}>
                  {days.map((day, index) => {
                    const selected = selectedDays.includes(index);
                    return (
                      <TouchableOpacity
                        key={day}
                        onPress={() => toggleDay(index)}
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
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>
                  Horários específicos das aulas (opcional, separados por vírgula)
                </Text>
                <TextInput
                  value={hours}
                  onChangeText={(value) => setHours(maskTimeList(value))}
                  placeholder="Ex: 07:00, 19:00"
                  placeholderTextColor={COLORS.mutedForeground}
                  style={styles.fullInput}
                />
              </View>
              <View style={styles.modalButtons}>
                <View style={styles.modalBtn}>
                  <ActionButton
                    outline
                    label="Cancelar"
                    onPress={onClose}
                  />
                </View>
                <View style={styles.modalBtn}>
                  <ActionButton
                    label={
                      saving
                        ? "Salvando..."
                        : rule
                          ? "Salvar alterações"
                          : "Criar regra"
                    }
                    onPress={submit}
                  />
                </View>
              </View>
              {rule && onDelete ? (
                <View style={styles.deleteRuleWrap}>
                  <ActionButton
                    outline
                    label={deleting ? "Excluindo..." : "Excluir regra"}
                    icon={<Trash2 size={16} color={COLORS.destructive} />}
                    onPress={handleDelete}
                  />
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function PartnerModal({
  partner,
  visible,
  saving,
  deleting,
  onClose,
  onSave,
  onDelete,
}: {
  partner: TenantPartnerType | null | undefined;
  visible: boolean;
  saving: boolean;
  deleting?: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    monthlyCheckInLimit: number;
    repasse: number;
    isActive: boolean;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [limit, setLimit] = useState("");
  const [repasse, setRepasse] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (partner) {
      setName(partner.name);
      setLimit(String(partner.monthlyCheckInLimit));
      setRepasse(toCurrencyInput(partner.repasse));
      setIsActive(partner.isActive);
      setError("");
    } else {
      setName("");
      setLimit("10");
      setRepasse("0,00");
      setIsActive(true);
      setError("");
    }
  }, [partner, visible]);

  const submit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Informe o nome do parceiro.");
      return;
    }
    const monthlyLimit = Number(limit);
    if (!Number.isInteger(monthlyLimit) || monthlyLimit < 0) {
      setError("Informe um limite mensal válido de check-ins (0 ou maior).");
      return;
    }
    const repasseVal = parseCurrency(repasse);
    if (!Number.isFinite(repasseVal) || repasseVal < 0) {
      setError("Informe um valor de repasse válido.");
      return;
    }
    onSave({
      name: trimmedName,
      monthlyCheckInLimit: monthlyLimit,
      repasse: repasseVal,
      isActive,
    });
  };

  const handleDelete = () => {
    if (!partner || !onDelete) return;
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm(`Deseja realmente remover o parceiro "${partner.name}"?`)
      ) {
        onDelete(partner.id);
      }
    } else {
      Alert.alert(
        "Excluir parceiro",
        `Deseja realmente remover o parceiro "${partner.name}"? Esta ação não pode ser desfeita.`,
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Excluir",
            style: "destructive",
            onPress: () => onDelete(partner.id),
          },
        ],
      );
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      statusBarTranslucent
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <ScrollView
              contentContainerStyle={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 16) + 16 },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <View style={styles.grow}>
                  <Text style={styles.modalTitle}>
                    {partner ? "Editar parceiro" : "Novo parceiro"}
                  </Text>
                  <Text style={styles.muted}>
                    {partner
                      ? "Atualize as configurações e limites deste convênio"
                      : "Cadastre um convênio corporativo ou parceiro de check-in"}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color={COLORS.foreground} />
                </TouchableOpacity>
              </View>

              {error ? <Text style={styles.fieldError}>{error}</Text> : null}

              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>Nome do parceiro *</Text>
                <TextInput
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    setError("");
                  }}
                  style={styles.fullInput}
                  placeholder="Ex: Gympass, TotalPass, Empresa Parceira"
                  placeholderTextColor={COLORS.mutedForeground}
                />
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>
                  Limite de check-ins por aluno / mês *
                </Text>
                <TextInput
                  value={limit}
                  onChangeText={(val) => {
                    setLimit(maskInteger(val));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  style={styles.fullInput}
                  placeholder="Ex: 10 (0 para sem limite)"
                  placeholderTextColor={COLORS.mutedForeground}
                />
              </View>

              <View style={styles.modalFieldGroup}>
                <Text style={styles.fieldLabel}>Valor do repasse por check-in (R$) *</Text>
                <TextInput
                  value={repasse}
                  onChangeText={(val) => {
                    setRepasse(maskCurrency(val));
                    setError("");
                  }}
                  keyboardType="number-pad"
                  style={styles.fullInput}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.mutedForeground}
                />
              </View>

              <View style={styles.switchRow}>
                <View style={styles.grow}>
                  <Text style={styles.fieldLabel}>Parceiro ativo</Text>
                  <Text style={styles.muted}>
                    Parceiros inativos não permitem agendamentos nem novas vinculações.
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: COLORS.border, true: COLORS.mainOrange }}
                />
              </View>

              <View style={styles.modalButtons}>
                <View style={styles.modalBtn}>
                  <ActionButton
                    outline
                    label="Cancelar"
                    onPress={onClose}
                  />
                </View>
                <View style={styles.modalBtn}>
                  <ActionButton
                    label={
                      saving
                        ? "Salvando..."
                        : partner
                          ? "Salvar alterações"
                          : "Criar parceiro"
                    }
                    icon={<Check size={14} color="#fff" />}
                    onPress={submit}
                  />
                </View>
              </View>

              {partner && onDelete ? (
                <View style={styles.deleteRuleWrap}>
                  <ActionButton
                    outline
                    label={deleting ? "Excluindo..." : "Excluir parceiro"}
                    icon={<Trash2 size={16} color={COLORS.destructive} />}
                    onPress={handleDelete}
                  />
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FAFAFA" },
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
  error: { color: COLORS.destructive, fontSize: 13, fontWeight: "600" },
  empty: { color: COLORS.mutedForeground, fontSize: 13 },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
    paddingVertical: 10,
  },
  ruleTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  editableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
    paddingVertical: 12,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
  },
  grow: { flex: 1, gap: 4 },
  itemTitle: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 12 },
  edit: { padding: 4 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  titleContent: { flex: 1, gap: 2 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF7F1",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { color: COLORS.mutedForeground, fontSize: 12, fontStyle: "italic" },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalContent: { padding: 20, gap: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalFieldGroup: {
    gap: 8,
    marginVertical: 4,
  },
  fieldError: { color: COLORS.destructive, fontSize: 12, fontWeight: "600" },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  fullInput: {
    minHeight: 48,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: COLORS.foreground,
    fontSize: 16,
    backgroundColor: COLORS.white,
  },
  deleteRuleWrap: {
    marginTop: 6,
  },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayOptionActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: "#FFF7F1",
  },
  dayText: { color: COLORS.mutedForeground, fontSize: 12, fontWeight: "600" },
  dayTextActive: { color: COLORS.mainOrange, fontWeight: "800" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    gap: 12,
  },
});
