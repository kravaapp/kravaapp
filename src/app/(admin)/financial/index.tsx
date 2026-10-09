import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  AdminPageHeader,
  Pill,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import {
  useFinancialScreen,
  useUpdateFinancialSettings,
} from "@/hooks/financial.hooks";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import {
  maskCurrency,
  parseCurrency,
  toCurrencyInput,
} from "@/utils/masks";
import { format } from "date-fns";
import {
  Check,
  ChevronRight,
  CreditCard,
  Handshake,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
const statusTone = (status?: string | null) => {
  const value = status?.toLocaleLowerCase("pt-BR");
  if (value === "ativo" || value === "pago" || value === "active")
    return "success" as const;
  if (
    value === "vencido" ||
    value === "cancelado" ||
    value === "expired" ||
    value === "cancelled"
  )
    return "danger" as const;
  return "warning" as const;
};

export default function AdminFinancial() {
  const refresh = useScreenRefresh([["financial-summary"], ["contracts"], ["plans", "financial"], ["modalidades", "active"], ["tenant-settings"]]);
  const { toast } = useToast();
  const month = useMemo(() => format(new Date(), "yyyy-MM"), []);
  const {
    summary,
    contracts,
    plans,
    modalidades,
    settings,
    loading,
    hasError,
  } = useFinancialScreen(month);
  const { updateSettings, isLoading: isSaving } = useUpdateFinancialSettings();
  const [filter, setFilter] = useState("Todas");
  const [gympass, setGympass] = useState("");
  const [totalpass, setTotalpass] = useState("");
  const [editing, setEditing] = useState<"gympass" | "totalpass" | null>(null);

  useEffect(() => {
    if (!settings || editing) return;
    setGympass(toCurrencyInput(settings.gympassRepasse));
    setTotalpass(toCurrencyInput(settings.totalpassRepasse));
  }, [settings]);

  const plansById = useMemo(
    () => new Map(plans.map((plan) => [plan.id, plan])),
    [plans],
  );
  const selectedModality = modalidades.find((item) => item.name === filter);
  const visibleContracts = contracts.filter((contract) => {
    if (!selectedModality) return true;
    const plan = plansById.get(contract.planoId);
    return (
      plan?.allowsAllModalidades ||
      plan?.modalidadeIds?.includes(selectedModality.id)
    );
  });

  const blocks = summary
    ? [
        {
          label: "Mensalistas",
          block: summary.monthly,
          Icon: Users,
        },
        {
          label: "Gympass",
          block: summary.gympass,
          Icon: CreditCard,
        },
        {
          label: "Totalpass",
          block: summary.totalpass,
          Icon: CreditCard,
        },
        {
          label: "Avulsos",
          block: summary.avulso,
          Icon: TrendingUp,
        },
        {
          label: "Parceiros",
          block: summary.partner,
          Icon: Handshake,
        },
      ]
    : [];

  const saveTransfer = async (field: "gympass" | "totalpass") => {
    if (!settings) return;
    const gympassRepasse = parseCurrency(gympass);
    const totalpassRepasse = parseCurrency(totalpass);
    if (
      !Number.isFinite(gympassRepasse) ||
      gympassRepasse < 0 ||
      !Number.isFinite(totalpassRepasse) ||
      totalpassRepasse < 0
    ) {
      toast({
        title: "Informe um valor de repasse válido.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateSettings({
        name: settings.name,
        slug: settings.slug,
        logoUrl: settings.logoUrl,
        address: settings.address,
        contact: settings.contact,
        gympassRepasse,
        totalpassRepasse,
        waitlistTimeoutMinutes: settings.waitlistTimeoutMinutes,
        cancellationTimeoutMinutes: settings.cancellationTimeoutMinutes,
        noShowPenaltyFee: settings.noShowPenaltyFee,
        partnerCheckInLimit: settings.partnerCheckInLimit,
      });
      setEditing(null);
      toast({
        title: `Repasse ${field === "gympass" ? "Gympass" : "Totalpass"} atualizado!`,
      });
    } catch {
      toast({
        title: "Não foi possível atualizar o repasse.",
        variant: "destructive",
      });
    }
  };

  return (
    <View style={styles.safe}>
      <RefreshableScrollView {...refresh}>
        <AdminScreen>
          <AdminPageHeader title="financeiro" subtitle="Receitas, repasses e contratos" />
          {hasError && (
            <Text style={styles.error}>
              Alguns dados financeiros não puderam ser carregados.
            </Text>
          )}
          <View style={styles.grid}>
            {loading.summary
              ? [1, 2, 3, 4].map((item) => (
                  <AdminSkeleton
                    key={item}
                    width="48%"
                    height={120}
                    radius={14}
                  />
                ))
              : blocks.map(({ label, block, Icon }) => (
                  <AdminCard
                    key={label}
                    style={styles.summary}
                  >
                    <Icon size={20} color={COLORS.mainOrange} />
                    <Text style={styles.value}>{currency(block.total)}</Text>
                    <Text style={styles.label}>{label}</Text>
                    <Text style={styles.muted}>
                      {block.count} lançamentos · média{" "}
                      {currency(block.avgPrice)}
                    </Text>
                  </AdminCard>
                ))}
          </View>
          <AdminCard style={styles.total}>
            <TrendingUp size={22} color="#fff" />
            {loading.summary ? (
              <AdminSkeleton width="50%" height={28} />
            ) : (
              <Text style={styles.totalValue}>
                {currency(summary?.grandTotal ?? 0)}
              </Text>
            )}
            <Text style={styles.totalText}>Receita consolidada do mês</Text>
          </AdminCard>
          <AdminCard>
            <SectionTitle>Configuração de repasses</SectionTitle>
            {loading.settings ? (
              <AdminSkeleton width="100%" height={130} radius={12} />
            ) : settings ? (
              <>
                <EditableTransfer
                  label="Gympass"
                  value={gympass}
                  onPress={() => setEditing("gympass")}
                />
                <EditableTransfer
                  label="Totalpass"
                  value={totalpass}
                  onPress={() => setEditing("totalpass")}
                />
              </>
            ) : (
              <Text style={styles.empty}>Configurações indisponíveis.</Text>
            )}
          </AdminCard>
          <AdminCard>
            <SectionTitle>Contratos</SectionTitle>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
              {[
                "Todas",
                ...modalidades
                  .filter((item) => item.isActive && item.name)
                  .map((item) => item.name as string),
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setFilter(item)}
                  style={[
                    styles.filter,
                    filter === item && styles.activeFilter,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      filter === item && styles.activeFilterText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {loading.contracts ? (
              <AdminSkeleton width="100%" height={260} radius={12} />
            ) : visibleContracts.length === 0 ? (
              <Text style={styles.empty}>Nenhum contrato encontrado.</Text>
            ) : (
              visibleContracts.map((contract) => (
                <View key={contract.id} style={styles.contract}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initials(contract.alunoName || "Aluno")}
                    </Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.contractName}>
                      {contract.alunoName || "Aluno"}
                    </Text>
                    <Text style={styles.muted}>
                      {contract.planoName || "Plano"}
                    </Text>
                    <View style={styles.badges}>
                      <Pill
                        label={
                          contract.autoRenew
                            ? "Renovação automática"
                            : "Sem renovação"
                        }
                        tone="info"
                      />
                      <Pill
                        label={contract.status || "Sem status"}
                        tone={statusTone(contract.status)}
                      />
                    </View>
                  </View>
                  <View style={styles.amount}>
                    <Text style={styles.contractName}>
                      {currency(contract.effectivePrice)}
                    </Text>
                    <Text style={styles.muted}>
                      até{" "}
                      {new Date(
                        `${contract.endDate}T00:00:00`,
                      ).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </AdminCard>
        </AdminScreen>
      </RefreshableScrollView>
      <TransferModal
        visible={editing !== null}
        partner={editing}
        value={editing === "gympass" ? gympass : totalpass}
        setValue={editing === "gympass" ? setGympass : setTotalpass}
        onSave={() => editing && saveTransfer(editing)}
        onClose={() => {
          if (settings) {
            setGympass(toCurrencyInput(settings.gympassRepasse ?? 0));
            setTotalpass(toCurrencyInput(settings.totalpassRepasse ?? 0));
          }
          setEditing(null);
        }}
        saving={isSaving}
      />
    </View>
  );
}

function EditableTransfer({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.editRow}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Editar repasse ${label}`}
    >
      <View style={styles.grow}>
        <Text style={styles.contractName}>Valor de repasse {label}</Text>
        <Text style={styles.muted}>
          {currency(parseCurrency(value) || 0)} por check-in
        </Text>
      </View>
      <ChevronRight size={18} color={COLORS.mutedForeground} />
    </TouchableOpacity>
  );
}

function TransferModal({
  visible,
  partner,
  value,
  setValue,
  onSave,
  onClose,
  saving,
}: {
  visible: boolean;
  partner: "gympass" | "totalpass" | null;
  value: string;
  setValue: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
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
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <View style={styles.grow}>
                <Text style={styles.modalTitle}>
                  Repasse {partner === "gympass" ? "Gympass" : "Totalpass"}
                </Text>
                <Text style={styles.muted}>
                  Valor repassado ao CT por cada check-in
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <View
              style={[
                styles.modalForm,
                { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              ]}
            >
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Valor por check-in</Text>
                <View style={styles.inputPrefixWrap}>
                  <Text style={styles.prefix}>R$</Text>
                  <TextInput
                    value={value}
                    onChangeText={(next) => setValue(maskCurrency(next))}
                    keyboardType="number-pad"
                    placeholder="0,00"
                    placeholderTextColor={COLORS.mutedForeground}
                    style={styles.modalInput}
                  />
                </View>
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
                    label={saving ? "Salvando..." : "Salvar repasse"}
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summary: { width: "47.5%", minHeight: 132, justifyContent: "space-between" },
  value: { fontSize: 19, fontWeight: "800", color: COLORS.foreground },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.foreground },
  muted: { color: COLORS.mutedForeground, fontSize: 11 },
  total: { backgroundColor: COLORS.mainOrange, borderColor: COLORS.mainOrange },
  totalValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  totalText: { color: COLORS.white, fontSize: 12 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F8FA",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  grow: { flex: 1, gap: 4 },
  contractName: { fontSize: 13, fontWeight: "700", color: COLORS.foreground },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ECEDEF",
  },
  modalTitle: { color: COLORS.foreground, fontSize: 18, fontWeight: "800" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalForm: { padding: 16, gap: 14 },
  fieldGroup: { gap: 6 },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  inputPrefixWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 48,
    height: 48,
    backgroundColor: COLORS.white,
  },
  prefix: { fontSize: 15, fontWeight: "700", color: COLORS.foreground },
  modalInput: {
    flex: 1,
    height: 48,
    minHeight: 48,
    fontSize: 16,
    color: COLORS.foreground,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalBtn: {
    flex: 1,
  },
  filters: { flexDirection: "row", gap: 5 },
  filter: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#f3f4f6",
  },
  activeFilter: { backgroundColor: COLORS.mainOrange },
  filterText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    fontWeight: "700",
  },
  activeFilterText: { color: "#fff" },
  contract: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.subOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.mainOrange, fontSize: 10, fontWeight: "800" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 3 },
  amount: { alignItems: "flex-end", gap: 3 },
  empty: { textAlign: "center", color: COLORS.mutedForeground, padding: 24 },
});
