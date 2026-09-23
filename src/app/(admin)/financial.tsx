import ClientHeader, { COLORS } from "@/components/ClientHeader";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  Pill,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import {
  useFinancialScreen,
  useUpdateFinancialSettings,
} from "@/hooks/financial.hooks";
import {
  maskCurrency,
  parseCurrency,
  toCurrencyInput,
} from "@/utils/masks";
import { format } from "date-fns";
import {
  CreditCard,
  Handshake,
  Pencil,
  TrendingUp,
  Users,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
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
          color: COLORS.mainOrange,
        },
        {
          label: "Gympass",
          block: summary.gympass,
          Icon: CreditCard,
          color: COLORS.info,
        },
        {
          label: "Totalpass",
          block: summary.totalpass,
          Icon: CreditCard,
          color: COLORS.primary,
        },
        {
          label: "Avulsos",
          block: summary.avulso,
          Icon: TrendingUp,
          color: COLORS.warning,
        },
        {
          label: "Parceiros",
          block: summary.partner,
          Icon: Handshake,
          color: COLORS.success,
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
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <ScreenScrollView>
        <AdminScreen>
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
              : blocks.map(({ label, block, Icon, color }) => (
                  <AdminCard
                    key={label}
                    style={[styles.summary, { borderTopColor: color }]}
                  >
                    <Icon size={20} color={color} />
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
                  setValue={setGympass}
                  editing={editing === "gympass"}
                  onEdit={() => setEditing("gympass")}
                  onSave={() => saveTransfer("gympass")}
                  saving={isSaving}
                />
                <EditableTransfer
                  label="Totalpass"
                  value={totalpass}
                  setValue={setTotalpass}
                  editing={editing === "totalpass"}
                  onEdit={() => setEditing("totalpass")}
                  onSave={() => saveTransfer("totalpass")}
                  saving={isSaving}
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
      </ScreenScrollView>
    </SafeAreaView>
  );
}

function EditableTransfer({
  label,
  value,
  setValue,
  editing,
  onEdit,
  onSave,
  saving,
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <View style={styles.editRow}>
      <View style={styles.grow}>
        <Text style={styles.contractName}>Valor de repasse {label}</Text>
        {editing ? (
          <View style={styles.inputRow}>
            <Text>R$</Text>
            <TextInput
              value={value}
              onChangeText={(next) => setValue(maskCurrency(next))}
              keyboardType="number-pad"
              style={styles.input}
            />
            <Text style={styles.muted}>por check-in</Text>
          </View>
        ) : (
          <Text style={styles.muted}>
            {currency(parseCurrency(value) || 0)} por check-in
          </Text>
        )}
      </View>
      {editing ? (
        <ActionButton
          label={saving ? "Salvando..." : "Salvar"}
          onPress={onSave}
        />
      ) : (
        <TouchableOpacity onPress={onEdit} style={styles.editButton}>
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
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summary: { width: "48%", borderTopWidth: 4 },
  value: { fontSize: 19, fontWeight: "800", color: COLORS.foreground },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.foreground },
  muted: { color: COLORS.mutedForeground, fontSize: 11 },
  total: { backgroundColor: COLORS.navy, borderWidth: 0 },
  totalValue: { color: "#fff", fontSize: 24, fontWeight: "800" },
  totalText: { color: "rgba(255,255,255,.65)", fontSize: 12 },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  grow: { flex: 1, gap: 4 },
  contractName: { fontSize: 13, fontWeight: "700", color: COLORS.foreground },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    // Cabe "1.500,00" — largura antiga (75) cortava valores mascarados.
    width: 100,
    height: 34,
    paddingHorizontal: 8,
  },
  editButton: { padding: 8 },
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
