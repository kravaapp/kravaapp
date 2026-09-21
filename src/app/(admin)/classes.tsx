import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  Pill,
  ProgressBar,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import {
  useAttendance,
  useAulas,
  useClassFormOptions,
  useCreateAula,
  useDeleteAula,
  useTodayOccurrences,
  useUpdateAula,
} from "@/hooks/schedule.hooks";
import { AulaType, TodayOccurrenceType } from "@/types/schedules.types";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

type Audience = "Mista" | "Masculina" | "Feminina";
const filters: ("Todos" | Audience)[] = [
  "Todos",
  "Mista",
  "Masculina",
  "Feminina",
];
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const audienceLabel = (value?: string | null): Audience | null => {
  const normalized = value?.toLocaleLowerCase("pt-BR");
  if (normalized === "mixed" || normalized === "mista" || normalized === "misto")
    return "Mista";
  if (normalized === "m" || normalized === "masculina" || normalized === "masculino")
    return "Masculina";
  if (normalized === "f" || normalized === "feminina" || normalized === "feminino")
    return "Feminina";
  return null;
};

const publicGenderValue = (audience: Audience | null) => {
  if (audience === "Feminina") return "F";
  if (audience === "Masculina") return "M";
  if (audience === "Mista") return "Mixed";
  return null;
};

const missingClassFields = ({
  modalidadeId,
  professorId,
  dayOfWeek,
  startTime,
  endTime,
  capacity,
}: {
  modalidadeId: string;
  professorId: string;
  dayOfWeek: number | null;
  startTime: string;
  endTime: string;
  capacity: string;
}) => {
  const maxCapacity = Number(capacity);
  return [
    !modalidadeId && "Modalidade",
    !professorId && "Professor",
    dayOfWeek === null && "Dia da semana",
    !/^\d{2}:\d{2}$/.test(startTime) && "Horário de início",
    !/^\d{2}:\d{2}$/.test(endTime) && "Horário de fim",
    (!Number.isInteger(maxCapacity) || maxCapacity <= 0) && "Capacidade",
  ].filter(Boolean) as string[];
};

const statusTone = (status: string) => {
  if (status === "Em andamento") return "success" as const;
  if (status === "Encerrada" || status === "Concluida")
    return "neutral" as const;
  return "info" as const;
};

export default function AdminClasses() {
  const { toast } = useToast();
  const [view, setView] = useState<"today" | "week">("today");
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [selected, setSelected] = useState<TodayOccurrenceType | null>(null);
  const [newClass, setNewClass] = useState(false);
  const [editingClass, setEditingClass] = useState<AulaType | null>(null);
  const { deleteAula, isLoading: isDeleting } = useDeleteAula();
  const {
    todayOccurrences = [],
    isLoading: loadingToday,
    error: todayError,
  } = useTodayOccurrences();
  const { aulas, isLoading: loadingAulas, error: aulasError } = useAulas();
  const aulasById = useMemo(
    () => new Map(aulas.map((aula) => [aula.id, aula])),
    [aulas],
  );
  const visibleClasses = todayOccurrences.filter((item) => {
    const audience = audienceLabel(aulasById.get(item.aulaId)?.publicGender);
    return filter === "Todos" || audience === filter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader />
      <ScrollView>
        <AdminScreen>
          <View style={styles.segment}>
            <TouchableOpacity
              onPress={() => setView("today")}
              style={[
                styles.segmentButton,
                view === "today" && styles.segmentActive,
              ]}
            >
              <Text style={styles.segmentText}>Hoje</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setView("week")}
              style={[
                styles.segmentButton,
                view === "week" && styles.segmentActive,
              ]}
            >
              <Text style={styles.segmentText}>Grade semanal</Text>
            </TouchableOpacity>
          </View>

          {view === "today" ? (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                {filters.map((item) => (
                  <TouchableOpacity
                    key={item}
                    onPress={() => setFilter(item)}
                    style={[
                      styles.filter,
                      filter === item && styles.filterActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        filter === item && styles.filterTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {loadingToday && (
                <>
                  <AdminSkeleton width="100%" height={180} radius={12} />
                  <AdminSkeleton width="100%" height={180} radius={12} />
                </>
              )}
              {todayError && <Text style={styles.empty}>{todayError}</Text>}
              {!loadingToday && !todayError && visibleClasses.length === 0 && (
                <Text style={styles.empty}>Nenhuma aula encontrada hoje.</Text>
              )}
              {visibleClasses.map((item) => {
                const pct =
                  item.maxCapacity > 0
                    ? (item.confirmedCount / item.maxCapacity) * 100
                    : 0;
                const audience = audienceLabel(
                  aulasById.get(item.aulaId)?.publicGender,
                );
                return (
                  <AdminCard key={item.id}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.time}>
                        {item.startTime?.slice(0, 5)}
                      </Text>
                      <Pill
                        label={item.status}
                        tone={statusTone(item.status)}
                      />
                    </View>
                    <View style={styles.row}>
                      <Text style={styles.title}>{item.modalidadeName}</Text>
                      {audience && <Pill label={audience} tone="primary" />}
                    </View>
                    <Text style={styles.muted}>{item.professorName}</Text>
                    <View style={styles.row}>
                      <ProgressBar value={pct} />
                      <Text style={styles.count}>
                        {item.confirmedCount}/{item.maxCapacity}
                      </Text>
                    </View>
                    <View style={styles.rowBetween}>
                      {item.waitlistCount ? (
                        <Pill
                          label={`${item.waitlistCount} na espera`}
                          tone="warning"
                        />
                      ) : (
                        <Text style={styles.muted}>Sem lista de espera</Text>
                      )}
                      <ActionButton
                        outline
                        label="Ver lista"
                        onPress={() => setSelected(item)}
                      />
                    </View>
                  </AdminCard>
                );
              })}
            </>
          ) : (
            <AdminCard>
              <SectionTitle>Grade semanal</SectionTitle>
              {loadingAulas && (
                <AdminSkeleton width="100%" height={280} radius={12} />
              )}
              {aulasError && <Text style={styles.empty}>{aulasError}</Text>}
              {!loadingAulas && !aulasError && aulas.length === 0 && (
                <Text style={styles.empty}>Nenhuma aula cadastrada.</Text>
              )}
              {dayLabels.map((day, dayOfWeek) => {
                const dayClasses = aulas.filter(
                  (item) => item.dayOfWeek === dayOfWeek,
                );
                if (dayClasses.length === 0) return null;
                return (
                  <View key={day} style={styles.weekRow}>
                    <Text style={styles.day}>{day}</Text>
                    <View style={styles.grow}>
                      {dayClasses.map((item) => (
                        <View key={item.id} style={styles.slot}>
                          <Text style={styles.slotTitle}>
                            {item.startTime?.slice(0, 5)} ·{" "}
                            {item.modalidadeName || item.name}
                          </Text>
                          <Text style={styles.muted}>
                            {item.professorName} · capacidade {item.maxCapacity}
                          </Text>
                          <View style={styles.slotActions}>
                            <ActionButton
                              outline
                              label="Editar"
                              icon={<Pencil size={14} color={COLORS.foreground} />}
                              onPress={() => setEditingClass(item)}
                            />
                            <ActionButton
                              outline
                              label={isDeleting ? "Excluindo..." : "Excluir"}
                              icon={<Trash2 size={14} color={COLORS.destructive} />}
                              onPress={() => {
                                Alert.alert(
                                  "Excluir aula?",
                                  "As ocorrências e reservas futuras desta aula serão canceladas e os alunos serão notificados.",
                                  [
                                    { text: "Voltar", style: "cancel" },
                                    {
                                      text: "Excluir aula",
                                      style: "destructive",
                                      onPress: async () => {
                                        try {
                                          await deleteAula(item.id);
                                          toast({ title: "Aula excluída com sucesso!" });
                                        } catch (requestError) {
                                          toast({
                                            title: requestError instanceof Error ? requestError.message : "Não foi possível excluir a aula.",
                                            variant: "destructive",
                                          });
                                        }
                                      },
                                    },
                                  ],
                                );
                              }}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}
            </AdminCard>
          )}
        </AdminScreen>
      </ScrollView>
      <TouchableOpacity style={styles.fab} onPress={() => setNewClass(true)}>
        <Plus size={25} color="#fff" />
      </TouchableOpacity>
      <ClassModal item={selected} onClose={() => setSelected(null)} />
      <NewClassModal
        visible={newClass}
        onClose={() => setNewClass(false)}
        onSuccess={() => {
          setNewClass(false);
          toast({ title: "Aula criada com sucesso!" });
        }}
        onError={(message) => toast({ title: message, variant: "destructive" })}
      />
      <EditClassModal
        item={editingClass}
        onClose={() => setEditingClass(null)}
        onSuccess={() => {
          setEditingClass(null);
          toast({ title: "Aula atualizada com sucesso!" });
        }}
        onError={(message) => toast({ title: message, variant: "destructive" })}
      />
    </SafeAreaView>
  );
}

function NewClassModal({
  visible,
  onClose,
  onSuccess,
  onError,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { modalidades, professors, isLoading, error } = useClassFormOptions();
  const { createAula, isLoading: isCreating } = useCreateAula();
  const [modalidadeId, setModalidadeId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [publicGender, setPublicGender] = useState<Audience | null>(null);
  const [allowTrial, setAllowTrial] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    setValidationMessage("");
  }, [modalidadeId, professorId, dayOfWeek, startTime, endTime, capacity]);

  const submit = async () => {
    const maxCapacity = Number(capacity);
    const missingFields = missingClassFields({ modalidadeId, professorId, dayOfWeek, startTime, endTime, capacity });
    if (missingFields.length) {
      setValidationMessage(`Preencha: ${missingFields.join(", ")}.`);
      return;
    }
    try {
      await createAula({
        modalidadeId,
        professorId,
        name: name.trim() || null,
        dayOfWeek: dayOfWeek!,
        startTime,
        endTime,
        maxCapacity,
        allowTrial,
        minLevel: null,
        publicGender: publicGenderValue(publicGender),
        waitlistTimeoutMinutes: null,
      });
      onSuccess();
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível criar a aula.";
      onError(message);
    }
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
          <View style={styles.rowBetween}>
            <SectionTitle>Nova aula</SectionTitle>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <AdminSkeleton width="100%" height={260} radius={12} />
            ) : error ? (
              <Text style={styles.empty}>
                Não foi possível carregar modalidades e professores.
              </Text>
            ) : (
              <View style={styles.form}>
                {validationMessage ? <Text style={styles.validationError}>{validationMessage}</Text> : null}
                <OptionField
                  label="Modalidade"
                  options={modalidades.map((item) => ({
                    id: item.id,
                    label: item.name || "Modalidade",
                  }))}
                  value={modalidadeId}
                  onChange={setModalidadeId}
                />
                <OptionField
                  label="Professor"
                  options={professors.map((item) => ({
                    id: item.userId,
                    label: item.name || item.email || "Professor",
                  }))}
                  value={professorId}
                  onChange={setProfessorId}
                />
                <Text style={styles.label}>Nome da aula (opcional)</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Ex.: Treino avançado"
                  style={styles.input}
                />
                <Text style={styles.label}>Dia da semana</Text>
                <View style={styles.options}>
                  {dayLabels.map((day, index) => (
                    <Option
                      key={day}
                      label={day}
                      active={dayOfWeek === index}
                      onPress={() => setDayOfWeek(index)}
                    />
                  ))}
                </View>
                <View style={styles.fieldsRow}>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Início</Text>
                    <TextInput
                      value={startTime}
                      onChangeText={setStartTime}
                      placeholder="18:00"
                      style={styles.input}
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Fim</Text>
                    <TextInput
                      value={endTime}
                      onChangeText={setEndTime}
                      placeholder="19:00"
                      style={styles.input}
                      maxLength={5}
                    />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Capacidade</Text>
                    <TextInput
                      value={capacity}
                      onChangeText={setCapacity}
                      placeholder="14"
                      style={styles.input}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <Text style={styles.label}>Público</Text>
                <View style={styles.options}>
                  {filters.slice(1).map((item) => (
                    <Option
                      key={item}
                      label={item}
                      active={publicGender === item}
                      onPress={() => setPublicGender(item as Audience)}
                    />
                  ))}
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Permitir aula experimental</Text>
                  <Switch value={allowTrial} onValueChange={setAllowTrial} />
                </View>
                <ActionButton
                  label={isCreating ? "Criando..." : "Criar aula"}
                  onPress={submit}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function EditClassModal({
  item,
  onClose,
  onSuccess,
  onError,
}: {
  item: AulaType | null;
  onClose: () => void;
  onSuccess: () => void;
  onError: (message: string) => void;
}) {
  const { modalidades, professors, isLoading, error } = useClassFormOptions();
  const { updateAula, isLoading: isUpdating } = useUpdateAula();
  const [modalidadeId, setModalidadeId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [name, setName] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [publicGender, setPublicGender] = useState<Audience | null>(null);
  const [allowTrial, setAllowTrial] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!item) return;
    setModalidadeId(item.modalidadeId);
    setProfessorId(item.professorId);
    setName(item.name || "");
    setDayOfWeek(item.dayOfWeek);
    setStartTime(item.startTime?.slice(0, 5) || "");
    setEndTime(item.endTime?.slice(0, 5) || "");
    setCapacity(String(item.maxCapacity));
    setPublicGender(audienceLabel(item.publicGender));
    setAllowTrial(item.allowTrial);
  }, [item]);

  useEffect(() => {
    setValidationMessage("");
  }, [modalidadeId, professorId, dayOfWeek, startTime, endTime, capacity]);

  if (!item) return null;

  const save = async () => {
    const maxCapacity = Number(capacity);
    try {
      await updateAula({
        id: item.id,
        params: {
          modalidadeId,
          professorId,
          name: name.trim() || null,
          dayOfWeek: dayOfWeek!,
          startTime,
          endTime,
          maxCapacity,
          allowTrial,
          minLevel: item.minLevel,
          publicGender: publicGenderValue(publicGender),
          waitlistTimeoutMinutes: item.waitlistTimeoutMinutes,
        },
      });
      onSuccess();
    } catch (requestError) {
      onError(
        requestError instanceof Error
          ? requestError.message
          : "Não foi possível atualizar a aula.",
      );
    }
  };

  const submit = () => {
    if (isUpdating) return;
    const maxCapacity = Number(capacity);
    const missingFields = missingClassFields({ modalidadeId, professorId, dayOfWeek, startTime, endTime, capacity });
    if (missingFields.length) {
      setValidationMessage(`Preencha: ${missingFields.join(", ")}.`);
      return;
    }

    void save();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <SectionTitle>Editar aula</SectionTitle>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <AdminSkeleton width="100%" height={260} radius={12} />
            ) : error ? (
              <Text style={styles.empty}>
                Não foi possível carregar modalidades e professores.
              </Text>
            ) : (
              <View style={styles.form}>
                {validationMessage ? <Text style={styles.validationError}>{validationMessage}</Text> : null}
                <OptionField
                  label="Modalidade"
                  options={modalidades.map((option) => ({
                    id: option.id,
                    label: option.name || "Modalidade",
                  }))}
                  value={modalidadeId}
                  onChange={setModalidadeId}
                />
                <OptionField
                  label="Professor"
                  options={professors.map((option) => ({
                    id: option.userId,
                    label: option.name || option.email || "Professor",
                  }))}
                  value={professorId}
                  onChange={setProfessorId}
                />
                <Text style={styles.label}>Nome da aula (opcional)</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} />
                <Text style={styles.label}>Dia da semana</Text>
                <View style={styles.options}>
                  {dayLabels.map((day, index) => (
                    <Option key={day} label={day} active={dayOfWeek === index} onPress={() => setDayOfWeek(index)} />
                  ))}
                </View>
                <View style={styles.fieldsRow}>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Início</Text>
                    <TextInput value={startTime} onChangeText={setStartTime} style={styles.input} maxLength={5} />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Fim</Text>
                    <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} maxLength={5} />
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Capacidade</Text>
                    <TextInput value={capacity} onChangeText={setCapacity} style={styles.input} keyboardType="number-pad" />
                  </View>
                </View>
                <Text style={styles.label}>Público</Text>
                <View style={styles.options}>
                  {filters.slice(1).map((option) => (
                    <Option key={option} label={option} active={publicGender === option} onPress={() => setPublicGender(option as Audience)} />
                  ))}
                </View>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Permitir aula experimental</Text>
                  <Switch value={allowTrial} onValueChange={setAllowTrial} />
                </View>
                <ActionButton label={isUpdating ? "Salvando..." : "Salvar alterações"} onPress={submit} />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OptionField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.options}>
        {options.map((item) => (
          <Option
            key={item.id}
            label={item.label}
            active={value === item.id}
            onPress={() => onChange(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

function Option({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.option, active && styles.optionActive]}
    >
      <Text style={[styles.optionText, active && styles.optionTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ClassModal({
  item,
  onClose,
}: {
  item: TodayOccurrenceType | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"confirmed" | "waitlist">("confirmed");
  const { attendance, isLoading, error } = useAttendance({
    ocorrenciaId: item?.id ?? "",
    status: tab === "confirmed" ? "Confirmado" : "FilaEspera",
  });
  if (!item) return null;
  const students = attendance?.lista ?? [];
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.rowBetween}>
            <SectionTitle>
              {item.startTime?.slice(0, 5)} · {item.modalidadeName}
            </SectionTitle>
            <TouchableOpacity onPress={onClose}>
              <X color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "confirmed" && styles.segmentActive,
              ]}
              onPress={() => setTab("confirmed")}
            >
              <Text style={styles.segmentText}>
                Confirmados ({item.confirmedCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "waitlist" && styles.segmentActive,
              ]}
              onPress={() => setTab("waitlist")}
            >
              <Text style={styles.segmentText}>
                Espera ({item.waitlistCount})
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.peopleList}>
            {isLoading ? (
              <AdminSkeleton width="100%" height={160} radius={12} />
            ) : error ? (
              <Text style={styles.empty}>{error}</Text>
            ) : students.length ? (
              students.map((student, index) => (
                <View
                  key={student.bookingId || `${student.studentName}-${index}`}
                  style={styles.person}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {initials(student.studentName || "Aluno")}
                    </Text>
                  </View>
                  <Text style={[styles.title, styles.grow]}>
                    {student.studentName || "Aluno"}
                  </Text>
                  {tab === "confirmed" ? (
                    <Check size={16} color={COLORS.success} />
                  ) : (
                    <Pill label={`#${index + 1}`} tone="warning" />
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                {tab === "confirmed"
                  ? "Nenhum aluno confirmado"
                  : "Nenhum aluno na lista de espera"}
              </Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  segment: {
    flexDirection: "row",
    backgroundColor: "#eef0f3",
    borderRadius: 12,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentActive: { backgroundColor: COLORS.white },
  segmentText: { fontSize: 12, fontWeight: "700", color: COLORS.foreground },
  filters: { gap: 8 },
  filter: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    backgroundColor: COLORS.white,
  },
  filterActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  filterText: {
    color: COLORS.mutedForeground,
    fontWeight: "600",
    fontSize: 12,
  },
  filterTextActive: { color: COLORS.white },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  time: { color: COLORS.mainOrange, fontSize: 24, fontWeight: "800" },
  title: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 12 },
  count: { fontSize: 12, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },
  weekRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  day: { width: 34, fontWeight: "800", color: COLORS.foreground },
  grow: { flex: 1 },
  slot: {
    backgroundColor: COLORS.subOrange,
    borderRadius: 10,
    padding: 9,
    marginBottom: 6,
  },
  slotTitle: { color: COLORS.mainOrange, fontSize: 12, fontWeight: "700" },
  slotActions: { flexDirection: "row", gap: 8, marginTop: 8 },
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
    gap: 14,
    maxHeight: "88%",
  },
  peopleList: { maxHeight: 320 },
  person: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    marginBottom: 5,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.successSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#15803d", fontSize: 10, fontWeight: "800" },
  empty: { textAlign: "center", color: COLORS.mutedForeground, padding: 24 },
  validationError: {
    color: COLORS.destructive,
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    fontWeight: "600",
  },
  form: { gap: 12 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    color: COLORS.foreground,
  },
  fieldsRow: { flexDirection: "row", gap: 8 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  optionActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  optionText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "600",
  },
  optionTextActive: { color: COLORS.white },
});
