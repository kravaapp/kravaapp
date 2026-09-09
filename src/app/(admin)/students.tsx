import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  Pill,
  initials,
} from "@/components/admin/AdminUi";
import {
  useAlunoActions,
  useAlunoDetails,
  useAlunos,
} from "@/hooks/alunos.hooks";
import { useCreateInvitation } from "@/hooks/auth.hooks";
import { createInvitationSchema } from "@/schemas/auth.schemas";
import { AlunoType } from "@/types/alunos.types";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
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

const levels = ["Todos", "Iniciante", "Intermediário", "Avançado", "Elite"];
const statuses = ["Todos", "Ativo", "Inativo", "Suspenso"];
const paymentMethods = ["Mensalista", "Gympass", "Totalpass"];
const nullable = (value: string) => value.trim() || null;
const tone = (value?: string | null) =>
  value?.toLowerCase() === "ativo"
    ? ("success" as const)
    : ["inativo", "suspenso"].includes(value?.toLowerCase() ?? "")
      ? ("danger" as const)
      : ("neutral" as const);

export default function AdminStudents() {
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [payment, setPayment] = useState("Todos");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const { alunos, isLoading, error } = useAlunos({
    search: search || undefined,
    level: level === "Todos" ? undefined : level,
    status: status === "Todos" ? undefined : status,
    paymentMethod: payment === "Todos" ? undefined : payment,
    page,
    pageSize: 20,
    sortBy: "userName",
    sortDirection: "asc",
  });
  const items = alunos?.items ?? [];
  useEffect(() => setPage(1), [search, level, status, payment]);

  return (
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <ScrollView keyboardShouldPersistTaps="handled">
        <AdminScreen>
          <View style={styles.toolbar}>
            <View style={styles.searchBox}>
              <Search size={17} color={COLORS.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar aluno..."
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.searchInput}
              />
            </View>
            <ActionButton
              label="Convidar aluno"
              icon={<Plus size={15} color="#fff" />}
              onPress={() => setInviting(true)}
            />
          </View>
          <Filter
            label="Status"
            values={statuses}
            selected={status}
            onSelect={setStatus}
          />
          <Filter
            label="Nível"
            values={levels}
            selected={level}
            onSelect={setLevel}
          />
          <Filter
            label="Pagamento"
            values={["Todos", ...paymentMethods]}
            selected={payment}
            onSelect={setPayment}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <AdminSkeleton key={index} height={92} radius={8} />
            ))
          ) : items.length === 0 ? (
            <AdminCard>
              <Text style={styles.empty}>Nenhum aluno encontrado.</Text>
            </AdminCard>
          ) : (
            items.map((student) => (
              <TouchableOpacity
                key={student.id}
                activeOpacity={0.75}
                onPress={() => {
                  setSelectedMethods(student.paymentMethods ?? []);
                  setSelectedId(student.id);
                }}
              >
                <AdminCard style={styles.studentCard}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initials(student.userName || "Aluno")}
                    </Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.name}>
                      {student.userName || "Aluno sem nome"}
                    </Text>
                    <Text style={styles.secondary}>
                      {student.userEmail || "Sem e-mail"} ·{" "}
                      {student.phone || "Sem telefone"}
                    </Text>
                    <View style={styles.pills}>
                      <Pill
                        label={student.status || "Sem status"}
                        tone={tone(student.status)}
                      />
                      <Pill
                        label={student.level || "Sem nível"}
                        tone="warning"
                      />
                      {(student.paymentMethods ?? []).map((method) => (
                        <Pill key={method} label={method} tone="info" />
                      ))}
                      {(student.modalities ?? []).map((modality) => (
                        <Pill key={modality} label={modality} tone="primary" />
                      ))}
                    </View>
                    <Text style={styles.secondary}>
                      {student.planoAtivo || "Sem plano ativo"} ·{" "}
                      {student.checkinsThisMonth} check-in(s) no mês
                    </Text>
                  </View>
                  <ChevronRight size={18} color={COLORS.mutedForeground} />
                </AdminCard>
              </TouchableOpacity>
            ))
          )}
          {(alunos?.totalPages ?? 1) > 1 && (
            <View style={styles.pagination}>
              <PageButton
                disabled={page <= 1}
                onPress={() => setPage(page - 1)}
                icon="left"
              />
              <Text style={styles.page}>
                Página {page} de {alunos?.totalPages}
              </Text>
              <PageButton
                disabled={page >= (alunos?.totalPages ?? 1)}
                onPress={() => setPage(page + 1)}
                icon="right"
              />
            </View>
          )}
        </AdminScreen>
      </ScrollView>
      <StudentModal
        id={selectedId}
        initialMethods={selectedMethods}
        onClose={() => setSelectedId(null)}
      />
      <InviteModal visible={inviting} onClose={() => setInviting(false)} />
    </SafeAreaView>
  );
}

function Filter({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View>
      <Text style={styles.filterLabel}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {values.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.filter, selected === value && styles.filterActive]}
          >
            <Text
              style={[
                styles.filterText,
                selected === value && styles.filterTextActive,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
function PageButton({
  disabled,
  onPress,
  icon,
}: {
  disabled: boolean;
  onPress: () => void;
  icon: "left" | "right";
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      {icon === "left" ? (
        <ChevronLeft size={18} color={COLORS.foreground} />
      ) : (
        <ChevronRight size={18} color={COLORS.foreground} />
      )}
    </TouchableOpacity>
  );
}

function StudentModal({
  id,
  initialMethods,
  onClose,
}: {
  id: string | null;
  initialMethods: string[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { aluno, history, isLoading, historyLoading, hasError } =
    useAlunoDetails(id);
  const {
    updateAluno,
    updateLevel,
    updateStatus,
    updatePaymentMethods,
    isSaving,
  } = useAlunoActions();
  const [form, setForm] = useState<AlunoType | null>(null);
  const [methods, setMethods] = useState<string[]>([]);
  useEffect(() => {
    if (aluno) {
      setForm(aluno);
      setMethods(initialMethods);
    }
  }, [aluno, initialMethods]);
  const save = async () => {
    if (!id || !form) return;
    try {
      await updateAluno({
        id,
        data: {
          cpf: form.cpf,
          birthDate: form.birthDate,
          phone: form.phone,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
          medicalNotes: form.medicalNotes,
          photoUrl: form.photoUrl,
          status: form.status,
          optOutReengagement: form.optOutReengagement,
          sex: form.sex,
        },
      });
      await updateLevel({ id, value: form.level });
      await updateStatus({ id, value: form.status });
      toast({ title: "Aluno atualizado!" });
    } catch {
      toast({
        title: "Não foi possível atualizar o aluno.",
        variant: "destructive",
      });
    }
  };
  const saveMethods = async () => {
    if (!id) return;
    try {
      await updatePaymentMethods({
        id,
        data: { paymentMethods: methods, partnerNote: null },
      });
      toast({ title: "Métodos de pagamento atualizados!" });
    } catch {
      toast({
        title: "Não foi possível atualizar os métodos.",
        variant: "destructive",
      });
    }
  };
  return (
    <Modal
      visible={!!id}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader
            title={aluno?.userName || "Detalhes do aluno"}
            onClose={onClose}
          />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            {isLoading ? (
              <AdminSkeleton height={360} radius={8} />
            ) : hasError || !form ? (
              <Text style={styles.error}>
                Não foi possível carregar o aluno.
              </Text>
            ) : (
              <>
                <Field
                  label="CPF"
                  value={form.cpf ?? ""}
                  onChange={(value) =>
                    setForm({ ...form, cpf: nullable(value) })
                  }
                />
                <Field
                  label="Data de nascimento"
                  value={form.birthDate ?? ""}
                  placeholder="AAAA-MM-DD"
                  onChange={(value) =>
                    setForm({ ...form, birthDate: nullable(value) })
                  }
                />
                <Field
                  label="Telefone"
                  value={form.phone ?? ""}
                  onChange={(value) =>
                    setForm({ ...form, phone: nullable(value) })
                  }
                />
                <Field
                  label="Contato de emergência"
                  value={form.emergencyContact ?? ""}
                  onChange={(value) =>
                    setForm({ ...form, emergencyContact: nullable(value) })
                  }
                />
                <Field
                  label="Telefone de emergência"
                  value={form.emergencyPhone ?? ""}
                  onChange={(value) =>
                    setForm({ ...form, emergencyPhone: nullable(value) })
                  }
                />
                <Field
                  label="Observações médicas"
                  value={form.medicalNotes ?? ""}
                  multiline
                  onChange={(value) =>
                    setForm({ ...form, medicalNotes: nullable(value) })
                  }
                />
                <Choice
                  label="Sexo"
                  values={["Masculino", "Feminino", "Prefiro não informar"]}
                  selected={form.sex}
                  onSelect={(value) => setForm({ ...form, sex: value })}
                />
                <Choice
                  label="Nível"
                  values={levels.slice(1)}
                  selected={form.level}
                  onSelect={(value) => setForm({ ...form, level: value })}
                />
                <Choice
                  label="Status"
                  values={statuses.slice(1)}
                  selected={form.status}
                  onSelect={(value) => setForm({ ...form, status: value })}
                />
                <View style={styles.switchRow}>
                  <View style={styles.grow}>
                    <Text style={styles.fieldLabel}>
                      Não receber reengajamento
                    </Text>
                    <Text style={styles.secondary}>
                      Desativa comunicações automáticas de retorno.
                    </Text>
                  </View>
                  <Switch
                    value={form.optOutReengagement}
                    onValueChange={(value) =>
                      setForm({ ...form, optOutReengagement: value })
                    }
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
                <ActionButton
                  label={isSaving ? "Salvando..." : "Salvar dados"}
                  icon={<Check size={15} color="#fff" />}
                  onPress={save}
                />
                <Text style={styles.sectionTitle}>Métodos de pagamento</Text>
                <View style={styles.choiceRow}>
                  {paymentMethods.map((method) => {
                    const active = methods.includes(method);
                    return (
                      <TouchableOpacity
                        key={method}
                        onPress={() =>
                          setMethods(
                            active
                              ? methods.filter((item) => item !== method)
                              : [...methods, method],
                          )
                        }
                        style={[styles.choice, active && styles.choiceActive]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            active && styles.choiceTextActive,
                          ]}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <ActionButton
                  label="Salvar métodos"
                  outline
                  onPress={saveMethods}
                />
                <Text style={styles.sectionTitle}>Histórico de check-ins</Text>
                {historyLoading ? (
                  <AdminSkeleton height={100} />
                ) : (history?.attendances ?? []).length === 0 ? (
                  <Text style={styles.empty}>Nenhum check-in registrado.</Text>
                ) : (
                  (history?.attendances ?? []).map((item) => (
                    <View key={item.id} style={styles.historyRow}>
                      <View style={styles.grow}>
                        <Text style={styles.name}>
                          {item.aulaName || "Aula"}
                        </Text>
                        <Text style={styles.secondary}>
                          {new Date(
                            `${item.aulaDate}T12:00:00`,
                          ).toLocaleDateString("pt-BR")}{" "}
                          · {item.startTime?.slice(0, 5) || "--:--"}
                        </Text>
                      </View>
                      <Pill label={item.method || "Check-in"} tone="success" />
                    </View>
                  ))
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function InviteModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { createInvitation, isLoading } = useCreateInvitation();
  const [email, setEmail] = useState("");
  const submit = async () => {
    if (isLoading) return;
    const invitation = createInvitationSchema.safeParse({ email, role: "Aluno" });
    if (!invitation.success) {
      toast({ title: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }
    try {
      await createInvitation(invitation.data);
      setEmail("");
      onClose();
      toast({ title: "Convite enviado ao aluno!" });
    } catch {
      toast({
        title: "Não foi possível enviar o convite.",
        variant: "destructive",
      });
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader title="Convidar aluno" onClose={onClose} />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label="E-mail do aluno *"
              value={email}
              onChange={setEmail}
              placeholder="aluno@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <ActionButton
              label={isLoading ? "Enviando..." : "Enviar convite"}
              onPress={submit}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.iconButton}>
        <X size={20} color={COLORS.foreground} />
      </TouchableOpacity>
    </View>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}
function Choice({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {values.map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => onSelect(value)}
            style={[styles.choice, selected === value && styles.choiceActive]}
          >
            <Text
              style={[
                styles.choiceText,
                selected === value && styles.choiceTextActive,
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  grow: { flex: 1 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  searchBox: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.foreground, fontSize: 14 },
  filterLabel: {
    color: COLORS.mutedForeground,
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 6,
  },
  filters: { gap: 7 },
  filter: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  filterActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  filterText: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    fontWeight: "600",
  },
  filterTextActive: { color: "#fff" },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.subOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.mainOrange, fontSize: 13, fontWeight: "800" },
  name: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  secondary: { color: COLORS.mutedForeground, fontSize: 11, lineHeight: 16 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginVertical: 5 },
  error: {
    color: COLORS.destructive,
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
  },
  empty: { textAlign: "center", color: COLORS.mutedForeground, padding: 18 },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  page: { color: COLORS.foreground, fontSize: 12, fontWeight: "600" },
  iconButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.35 },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "92%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.foreground, fontSize: 17, fontWeight: "700" },
  modalContent: { padding: 16, gap: 14, paddingBottom: 36 },
  field: { gap: 6 },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 11,
    color: COLORS.foreground,
    backgroundColor: "#fff",
  },
  textarea: { minHeight: 84, paddingTop: 10, textAlignVertical: "top" },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  choiceActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  choiceText: { color: COLORS.foreground, fontSize: 11, fontWeight: "600" },
  choiceTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
  sectionTitle: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  },
});

/* Plano e modalidades não possuem escrita nas rotas de alunos. */
