import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import React, { ReactNode, useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const refresh = useScreenRefresh([["scheduling-rules"], ["tenant-settings"], ["avulso-configs"], ["catalog-profile"]]);
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

  const [editingRule, setEditingRule] = useState<SchedulingRuleType | null | undefined>(
    undefined,
  );
  const [tenantEditing, setTenantEditing] = useState<string | null>(null);
  const [tenantValues, setTenantValues] = useState({
    cancellationTimeoutMinutes: "",
    noShowPenaltyFee: "",
    partnerCheckInLimit: "",
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
        partnerCheckInLimit:
          tenantSettings.partnerCheckInLimit !== undefined
            ? String(tenantSettings.partnerCheckInLimit)
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
                    style={styles.deleteBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Excluir regra"
                  >
                    <Trash2 size={17} color={COLORS.destructive} />
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

          {/* Limites de Check-in por Parceiro */}
          <SettingsCard
            icon={<Users color={COLORS.mainOrange} size={20} />}
            title="Limites de check-in por parceiro"
          >
            {loading.tenant ? (
              <AdminSkeleton width="100%" height={90} radius={12} />
            ) : tenantSettings ? (
              <EditableRow
                label="Todos os parceiros (Gympass / Totalpass)"
                value={tenantValues.partnerCheckInLimit}
                suffix="check-in(s) por aluno"
                onPress={() => setTenantEditing("partnerCheckInLimit")}
              />
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
            <Text style={styles.info}>
              ⓘ Estas configurações se aplicam a todos os alunos parceiros no CT.
            </Text>
          </SettingsCard>
        </AdminScreen>
      </RefreshableScrollView>

      {/* Modal de Regra de Agendamento */}
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
      />

      {/* Modal de Configuração de Valor */}
      <EditSettingModal
        visible={tenantEditing !== null}
        title={
          tenantEditing === "cancellationTimeoutMinutes"
            ? "Prazo de cancelamento"
            : tenantEditing === "noShowPenaltyFee"
            ? "Multa por falta (No-Show)"
            : "Limite de check-in"
        }
        subtitle="Defina o novo valor da política"
        value={
          tenantEditing === "cancellationTimeoutMinutes"
            ? tenantValues.cancellationTimeoutMinutes
            : tenantEditing === "noShowPenaltyFee"
            ? tenantValues.noShowPenaltyFee
            : tenantValues.partnerCheckInLimit
        }
        suffix={
          tenantEditing === "cancellationTimeoutMinutes"
            ? "minuto(s) antes da aula"
            : tenantEditing === "noShowPenaltyFee"
            ? "reais"
            : "check-in(s) por aluno"
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
              partnerCheckInLimit: String(
                tenantSettings.partnerCheckInLimit ?? 0,
              ),
            });
          }
          setTenantEditing(null);
        }}
        onSave={saveTenant}
        saving={isUpdatingTenant}
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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.modalContent}>
              <View style={styles.header}>
                <View style={styles.grow}>
                  <Text style={styles.itemTitle}>{title}</Text>
                  {subtitle ? (
                    <Text style={styles.muted}>{subtitle}</Text>
                  ) : null}
                </View>
                <TouchableOpacity onPress={onClose} style={styles.edit}>
                  <X size={20} color={COLORS.foreground} />
                </TouchableOpacity>
              </View>
              <View style={styles.titleContent}>
                <Text style={styles.fieldLabel}>Valor ({suffix})</Text>
                <TextInput
                  value={value}
                  onChangeText={(val) => onChange(mask ? mask(val) : val)}
                  keyboardType="number-pad"
                  style={styles.fullInput}
                  autoFocus
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
  onClose,
  onSave,
}: {
  rule: SchedulingRuleType | null | undefined;
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (rule: Omit<SchedulingRuleType, "id">) => Promise<void>;
}) {
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
                <SectionTitle>
                  {rule ? "Editar regra" : "Nova regra de agendamento"}
                </SectionTitle>
                <TouchableOpacity onPress={onClose}>
                  <X color={COLORS.foreground} />
                </TouchableOpacity>
              </View>
              {error ? <Text style={styles.fieldError}>{error}</Text> : null}
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
              />
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
                style={styles.fullInput}
              />
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
              <Text style={styles.fieldLabel}>
                Horários específicos das aulas (opcional, separados por vírgula)
              </Text>
              <TextInput
                value={hours}
                onChangeText={(value) => setHours(maskTimeList(value))}
                placeholder="Ex: 07:00, 19:00"
                style={styles.fullInput}
              />
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
  fieldError: { color: COLORS.destructive, fontSize: 12, fontWeight: "600" },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  fullInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.foreground,
    fontSize: 14,
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
});
