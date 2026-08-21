import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  Pill,
  SectionTitle,
} from "@/components/admin/AdminUi";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { AvulsoConfigType, SchedulingRuleType } from "@/types/settings.types";
import {
  Check,
  Clock,
  DollarSign,
  Pencil,
  Plus,
  ShieldAlert,
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
  const { rules, avulsoConfigs, tenantSettings, loading, hasError } =
    useAdminSettings();
  const {
    createRule,
    updateAvulso,
    updateTenant,
    isCreatingRule,
    isUpdatingAvulso,
    isUpdatingTenant,
  } = useSettingsActions();
  const [newRule, setNewRule] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [tenantEditing, setTenantEditing] = useState<string | null>(null);
  const [tenantValues, setTenantValues] = useState({
    cancellationTimeoutMinutes: "",
    noShowPenaltyFee: "",
    partnerCheckInLimit: "",
  });
  useEffect(() => {
    setPrices(
      Object.fromEntries(
        avulsoConfigs.map((item) => [item.modalidadeId, String(item.price)]),
      ),
    );
  }, [avulsoConfigs]);

  useEffect(() => {
    if (!tenantSettings) return;
    setTenantValues({
      cancellationTimeoutMinutes: String(
        tenantSettings.cancellationTimeoutMinutes,
      ),
      noShowPenaltyFee: String(tenantSettings.noShowPenaltyFee),
      partnerCheckInLimit: String(tenantSettings.partnerCheckInLimit),
    });
  }, [tenantSettings]);

  const saveTenant = async () => {
    if (!tenantSettings) return;
    const cancellationTimeoutMinutes = Number(
      tenantValues.cancellationTimeoutMinutes,
    );
    const noShowPenaltyFee = Number(
      tenantValues.noShowPenaltyFee.replace(",", "."),
    );
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
    const price = Number((prices[item.modalidadeId] ?? "").replace(",", "."));
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
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <ScrollView>
        <AdminScreen>
          {hasError && (
            <Text style={styles.error}>
              Algumas configurações não puderam ser carregadas.
            </Text>
          )}
          <SettingsCard
            icon={<Clock color={COLORS.mainOrange} size={20} />}
            title="Regras de agendamento"
            action={
              <ActionButton
                label="Adicionar"
                icon={<Plus size={14} color="#fff" />}
                onPress={() => setNewRule(true)}
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
                </View>
              ))
            )}
          </SettingsCard>
          <SettingsCard
            icon={<DollarSign color={COLORS.success} size={20} />}
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
                              [item.modalidadeId]: value,
                            }))
                          }
                          keyboardType="decimal-pad"
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
                />
              </>
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
          </SettingsCard>
          <SettingsCard
            icon={<Users color={COLORS.info} size={20} />}
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
              />
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
            <Text style={styles.info}>
              ⓘ Estas configurações se aplicam a todos os alunos parceiros.
            </Text>
          </SettingsCard>
        </AdminScreen>
      </ScrollView>
      <RuleModal
        visible={newRule}
        saving={isCreatingRule}
        onClose={() => setNewRule(false)}
        onSave={async (rule) => {
          try {
            await createRule(rule);
            setNewRule(false);
            toast({ title: "Regra de agendamento criada!" });
          } catch {
            toast({
              title: "Não foi possível criar a regra.",
              variant: "destructive",
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

function RuleModal({
  visible,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  saving: boolean;
  onClose: () => void;
  onSave: (rule: Omit<SchedulingRuleType, "id">) => void;
}) {
  const [releaseTime, setReleaseTime] = useState("");
  const [targetOffset, setTargetOffset] = useState("");
  const [targetHours, setTargetHours] = useState("");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const submit = () => {
    const offset = Number(targetOffset);
    if (
      !/^\d{2}:\d{2}$/.test(releaseTime) ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      selectedDays.length === 0
    )
      return;
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
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <SectionTitle>Nova regra</SectionTitle>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={styles.fieldLabel}>Dias das aulas</Text>
          <View style={styles.dayOptions}>
            {days.map((day, index) => (
              <TouchableOpacity
                key={day}
                onPress={() =>
                  setSelectedDays((current) =>
                    current.includes(index)
                      ? current.filter((value) => value !== index)
                      : [...current, index],
                  )
                }
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
          <Text style={styles.fieldLabel}>Liberar às</Text>
          <TextInput
            value={releaseTime}
            onChangeText={setReleaseTime}
            placeholder="08:00"
            maxLength={5}
            style={styles.fullInput}
          />
          <Text style={styles.fieldLabel}>Antecedência em dias</Text>
          <TextInput
            value={targetOffset}
            onChangeText={setTargetOffset}
            placeholder="7"
            keyboardType="number-pad"
            style={styles.fullInput}
          />
          <Text style={styles.fieldLabel}>Horários das aulas (opcional)</Text>
          <TextInput
            value={targetHours}
            onChangeText={setTargetHours}
            placeholder="18:00, 19:00"
            style={styles.fullInput}
          />
          <ActionButton
            label={saving ? "Criando..." : "Criar regra"}
            onPress={submit}
          />
        </View>
      </View>
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
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <View style={styles.icon}>{icon}</View>
          <SectionTitle>{title}</SectionTitle>
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
}: {
  label: string;
  value: string;
  suffix: string;
  editing: boolean;
  onEdit: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
  saving?: boolean;
}) {
  return (
    <View style={styles.rule}>
      <View style={styles.grow}>
        <Text style={styles.itemTitle}>{label}</Text>
        {editing ? (
          <View style={styles.inputRow}>
            <TextInput
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
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
  safe: { flex: 1, backgroundColor: "#f8fafc" },
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
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  icon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  rule: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
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
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
  edit: { padding: 8 },
  info: {
    color: COLORS.info,
    fontSize: 11,
    lineHeight: 17,
    backgroundColor: COLORS.infoSurface,
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
    padding: 20,
    gap: 12,
  },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  fullInput: {
    height: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
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
