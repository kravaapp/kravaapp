import {
  ActionButton,
  AdminCard,
  AdminScreen,
  Pill,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import { adminContracts } from "@/data/adminMockData";
import {
  CreditCard,
  Dumbbell,
  Pencil,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const summaries = [
  {
    label: "Futevôlei",
    value: "R$ 4.760",
    desc: "Mensalistas",
    Icon: Trophy,
    color: COLORS.mainOrange,
  },
  {
    label: "Funcional",
    value: "R$ 3.080",
    desc: "Mensalistas",
    Icon: Dumbbell,
    color: COLORS.warning,
  },
  {
    label: "Gympass",
    value: "R$ 280",
    desc: "8 check-ins × R$35",
    Icon: CreditCard,
    color: COLORS.info,
  },
  {
    label: "Totalpass",
    value: "R$ 240",
    desc: "6 check-ins × R$40",
    Icon: CreditCard,
    color: COLORS.primary,
  },
];

export default function AdminFinancial() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("Todas");
  const [gympass, setGympass] = useState("35");
  const [totalpass, setTotalpass] = useState("40");
  const [editing, setEditing] = useState<string | null>(null);
  const contracts = adminContracts.filter(
    (item) => filter === "Todas" || item.modalities.includes(filter),
  );
  return (
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <ScrollView>
        <AdminScreen>
          <View style={styles.grid}>
            {summaries.map(({ label, value, desc, Icon, color }) => (
              <AdminCard
                key={label}
                style={[styles.summary, { borderTopColor: color }]}
              >
                <Icon size={20} color={color} />
                <Text style={styles.value}>{value}</Text>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.muted}>{desc}</Text>
              </AdminCard>
            ))}
          </View>
          <AdminCard style={styles.total}>
            <TrendingUp size={22} color="#fff" />
            <Text style={styles.totalValue}>R$ 8.360</Text>
            <Text style={styles.totalText}>Receita consolidada do mês</Text>
          </AdminCard>
          <AdminCard>
            <SectionTitle>Configuração de repasses</SectionTitle>
            <EditableTransfer
              label="Gympass"
              value={gympass}
              setValue={setGympass}
              editing={editing === "gympass"}
              onEdit={() => setEditing("gympass")}
              onSave={() => {
                setEditing(null);
                toast({ title: "Valor atualizado!" });
              }}
            />
            <EditableTransfer
              label="Totalpass"
              value={totalpass}
              setValue={setTotalpass}
              editing={editing === "totalpass"}
              onEdit={() => setEditing("totalpass")}
              onSave={() => {
                setEditing(null);
                toast({ title: "Valor atualizado!" });
              }}
            />
          </AdminCard>
          <AdminCard>
            <View style={styles.between}>
              <SectionTitle>Contratos</SectionTitle>
              <View style={styles.filters}>
                {["Todas", "Futevôlei", "Funcional"].map((item) => (
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
              </View>
            </View>
            {contracts.map((contract) => (
              <View key={contract.id} style={styles.contract}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(contract.student)}
                  </Text>
                </View>
                <View style={styles.grow}>
                  <Text style={styles.contractName}>{contract.student}</Text>
                  <Text style={styles.muted}>
                    {contract.plan} · {contract.modalities.join(" + ")}
                  </Text>
                  <View style={styles.badges}>
                    <Pill label={contract.type} tone="info" />
                    <Pill
                      label={contract.status}
                      tone={
                        contract.status === "Pago" ||
                        contract.status === "Ativo"
                          ? "success"
                          : contract.status === "Vencido"
                            ? "danger"
                            : "warning"
                      }
                    />
                  </View>
                </View>
                <View style={styles.amount}>
                  <Text style={styles.contractName}>{contract.value}</Text>
                  <Text style={styles.muted}>{contract.due}</Text>
                </View>
              </View>
            ))}
          </AdminCard>
        </AdminScreen>
      </ScrollView>
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
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
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
              onChangeText={setValue}
              keyboardType="numeric"
              style={styles.input}
            />
            <Text style={styles.muted}>por check-in</Text>
          </View>
        ) : (
          <Text style={styles.muted}>R$ {value},00 por check-in</Text>
        )}
      </View>
      {editing ? (
        <ActionButton label="Salvar" onPress={onSave} />
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
    width: 65,
    height: 34,
    paddingHorizontal: 8,
  },
  editButton: { padding: 8 },
  between: { gap: 10 },
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
  badges: { flexDirection: "row", gap: 5, marginTop: 3 },
  amount: { alignItems: "flex-end", gap: 3 },
});
