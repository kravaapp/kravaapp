import {
  ActionButton,
  AdminCard,
  AdminScreen,
  Pill,
  SectionTitle,
} from "@/components/admin/AdminUi";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import { bookingRules } from "@/data/adminMockData";
import {
  Check,
  Clock,
  DollarSign,
  Dumbbell,
  Pencil,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react-native";
import { ReactNode, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SettingKey =
  | "deadline"
  | "gympass"
  | "totalpass"
  | "futevoleiCapacity"
  | "functionalCapacity"
  | "futevoleiPrice"
  | "functionalPrice";

export default function AdminSettings() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<SettingKey | null>(null);
  const [values, setValues] = useState<Record<SettingKey, string>>({
    deadline: "1",
    gympass: "3",
    totalpass: "12",
    futevoleiCapacity: "14",
    functionalCapacity: "14",
    futevoleiPrice: "35",
    functionalPrice: "25",
  });
  const [penalty, setPenalty] = useState(true);
  const [singleClass, setSingleClass] = useState(true);
  const [payments, setPayments] = useState({
    pix: true,
    card: true,
    inPerson: true,
  });
  const update = (key: SettingKey, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));
  const save = () => {
    setEditing(null);
    toast({ title: "Configuração atualizada!" });
  };
  return (
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <ScrollView>
        <AdminScreen>
          <SettingsCard
            icon={<Clock color={COLORS.mainOrange} size={20} />}
            title="Regras de agendamento"
            action={
              <ActionButton
                label="Adicionar"
                icon={<Plus size={14} color="#fff" />}
                onPress={() =>
                  toast({ title: "Funcionalidade em desenvolvimento" })
                }
              />
            }
          >
            {bookingRules.map((rule) => (
              <View key={rule.id} style={styles.rule}>
                <Text style={styles.itemTitle}>{rule.description}</Text>
                <Pill label="Ativa" tone="success" />
              </View>
            ))}
          </SettingsCard>
          <SettingsCard
            icon={<DollarSign color={COLORS.success} size={20} />}
            title="Aula avulsa"
            action={
              <Switch
                value={singleClass}
                onValueChange={setSingleClass}
                trackColor={{ true: COLORS.mainOrange }}
              />
            }
          >
            {singleClass && (
              <>
                <Text style={styles.muted}>
                  Qualquer aluno pode pagar avulso, independente do plano.
                </Text>
                <EditableRow
                  label="Futevôlei"
                  value={values.futevoleiPrice}
                  suffix="reais por aula"
                  editing={editing === "futevoleiPrice"}
                  onEdit={() => setEditing("futevoleiPrice")}
                  onChange={(v) => update("futevoleiPrice", v)}
                  onSave={save}
                />
                <EditableRow
                  label="Funcional"
                  value={values.functionalPrice}
                  suffix="reais por aula"
                  editing={editing === "functionalPrice"}
                  onEdit={() => setEditing("functionalPrice")}
                  onChange={(v) => update("functionalPrice", v)}
                  onSave={save}
                />
                <Text style={styles.subheading}>OPÇÕES DE PAGAMENTO</Text>
                <CheckRow
                  label="Pix"
                  value={payments.pix}
                  onPress={() => setPayments((p) => ({ ...p, pix: !p.pix }))}
                />
                <CheckRow
                  label="Cartão de crédito/débito (via app)"
                  value={payments.card}
                  onPress={() => setPayments((p) => ({ ...p, card: !p.card }))}
                />
                <CheckRow
                  label="Pagamento presencial"
                  value={payments.inPerson}
                  onPress={() =>
                    setPayments((p) => ({ ...p, inPerson: !p.inPerson }))
                  }
                />
              </>
            )}
          </SettingsCard>
          <SettingsCard
            icon={<ShieldAlert color={COLORS.destructive} size={20} />}
            title="Regras de cancelamento"
          >
            <EditableRow
              label="Prazo mínimo para cancelamento"
              value={values.deadline}
              suffix="hora(s) antes da aula"
              editing={editing === "deadline"}
              onEdit={() => setEditing("deadline")}
              onChange={(v) => update("deadline", v)}
              onSave={save}
            />
            <View style={styles.rule}>
              <View style={styles.grow}>
                <Text style={styles.itemTitle}>
                  Penalidade por falta não cancelada
                </Text>
                <Text style={styles.muted}>Bloquear agendamentos por 48h</Text>
              </View>
              <Switch
                value={penalty}
                onValueChange={setPenalty}
                trackColor={{ true: COLORS.mainOrange }}
              />
            </View>
          </SettingsCard>
          <SettingsCard
            icon={<Users color={COLORS.info} size={20} />}
            title="Limites de check-in por parceiro"
          >
            <EditableRow
              label="Gympass"
              value={values.gympass}
              suffix="check-ins por semana"
              editing={editing === "gympass"}
              onEdit={() => setEditing("gympass")}
              onChange={(v) => update("gympass", v)}
              onSave={save}
            />
            <EditableRow
              label="Totalpass"
              value={values.totalpass}
              suffix="check-ins por mês"
              editing={editing === "totalpass"}
              onEdit={() => setEditing("totalpass")}
              onChange={(v) => update("totalpass", v)}
              onSave={save}
            />
            <Text style={styles.info}>
              ⓘ Estas configurações se aplicam a todos os alunos parceiros.
            </Text>
          </SettingsCard>
          <SettingsCard
            icon={<Dumbbell color={COLORS.warning} size={20} />}
            title="Capacidade padrão das aulas"
          >
            <EditableRow
              label="Futevôlei"
              value={values.futevoleiCapacity}
              suffix="alunos por turma"
              editing={editing === "futevoleiCapacity"}
              onEdit={() => setEditing("futevoleiCapacity")}
              onChange={(v) => update("futevoleiCapacity", v)}
              onSave={save}
            />
            <EditableRow
              label="Funcional"
              value={values.functionalCapacity}
              suffix="alunos por turma"
              editing={editing === "functionalCapacity"}
              onEdit={() => setEditing("functionalCapacity")}
              onChange={(v) => update("functionalCapacity", v)}
              onSave={save}
            />
          </SettingsCard>
        </AdminScreen>
      </ScrollView>
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
}: {
  label: string;
  value: string;
  suffix: string;
  editing: boolean;
  onEdit: () => void;
  onChange: (v: string) => void;
  onSave: () => void;
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
          label="Salvar"
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
function CheckRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.checkRow} onPress={onPress}>
      <View style={[styles.checkbox, value && styles.checked]}>
        {value && <Check size={14} color="#fff" />}
      </View>
      <Text style={styles.itemTitle}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
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
    width: 64,
    height: 34,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    backgroundColor: "#fff",
  },
  edit: { padding: 8 },
  subheading: {
    color: COLORS.mutedForeground,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "#f8fafc",
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outline,
    alignItems: "center",
    justifyContent: "center",
  },
  checked: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  info: {
    color: COLORS.info,
    fontSize: 11,
    lineHeight: 17,
    backgroundColor: COLORS.infoSurface,
    padding: 11,
    borderRadius: 10,
  },
});
