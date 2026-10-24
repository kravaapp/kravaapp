import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import ConfirmModal from "@/components/ConfirmModal";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  AdminPageHeader,
  Pill,
  ProgressBar,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import {
  useAttendance,
  useAulas,
  useCancelOcorrencia,
  useClassFormOptions,
  useCloseOcorrencia,
  useCreateAula,
  useDeleteAula,
  useMarkAttendance,
  useOcorrenciaTeacher,
  useProfessors,
  useSchedule,
  useSetOcorrenciaSubstitute,
  useTodayOccurrences,
  useUpdateAula,
} from "@/hooks/schedule.hooks";
import { normalizeApiError } from "@/routes/apiError";
import {
  AttendanceStudentType,
  AulaType,
  ScheduleOccurrenceType,
  TodayOccurrenceType,
} from "@/types/schedules.types";
import { maskInteger, maskTime } from "@/utils/masks";
import { addDays, format, isToday, subDays } from "date-fns";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/AppModal";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { partnerBookingLabel } from "@/utils/bookingSource";

type AnyOccurrenceItem = TodayOccurrenceType | ScheduleOccurrenceType;

const getModalityColor = (name?: string | null) => {
  if (!name) return COLORS.mainOrange;
  const n = name.toLowerCase();
  if (n.includes("crossfit") || n.includes("wod")) return "#10B981"; // verde esmeralda
  if (n.includes("funcional")) return "#0EA5E9"; // azul céu
  if (n.includes("muay") || n.includes("thai")) return "#F97316"; // laranja
  if (n.includes("jiu") || n.includes("bjj")) return "#8B5CF6"; // roxo
  if (n.includes("boxe") || n.includes("boxing")) return "#EF4444"; // vermelho
  if (n.includes("futevolei") || n.includes("volei")) return "#EAB308"; // amarelo
  if (n.includes("pilates") || n.includes("yoga")) return "#EC4899"; // rosa
  const palette = ["#F97316", "#10B981", "#8B5CF6", "#0EA5E9", "#EC4899", "#EAB308", "#14B8A6"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
};

const formatPtDate = (d: Date) => {
  const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const months = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const wd = weekdays[d.getDay()];
  const day = String(d.getDate()).padStart(2, "0");
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${wd}, ${day} ${month} ${year}`;
};

const formatMonthYear = (d: Date) => {
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[d.getMonth()]} de ${d.getFullYear()}`;
};

type Audience = "Mista" | "Masculina" | "Feminina";
const filters: ("Todos" | Audience)[] = [
  "Todos",
  "Mista",
  "Masculina",
  "Feminina",
];
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

type LevelOption = { label: string; value: string | null };

/*
 * label: exibido para o usuário · value: enviado na rota.
 * value null ("Nenhum") significa que a aula não restringe nível.
 */
const minLevelOptions: LevelOption[] = [
  { label: "Nenhum", value: null },
  { label: "Iniciante", value: "iniciante" },
  { label: "Intermediário", value: "intermediario" },
  { label: "Avançado", value: "avancado" },
];

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

/*
 * Converte o nível vindo da API para o `value` de `minLevelOptions`.
 * Aceita a grafia com ou sem acento ("Intermediário" → "intermediario").
 * Qualquer valor desconhecido cai em null, que é o "Nenhum".
 */
const LEVEL_ALIASES: Record<string, string> = {
  iniciante: "iniciante",
  intermediario: "intermediario",
  "intermediário": "intermediario",
  avancado: "avancado",
  "avançado": "avancado",
};

/** Nível do aluno e, quando a aula foi reservada por parceiro, o selo dele (a recepção valida o check-in no app do parceiro). */
const StudentMeta = ({ level, paymentMethod }: { level?: string | null; paymentMethod?: string | null }) => {
  const partner = partnerBookingLabel(paymentMethod);
  if (!level && !partner) return null;
  return (
    <View style={styles.studentMetaRow}>
      {level ? <Text style={styles.studentSubText}>{level}</Text> : null}
      {partner ? <Pill label={partner} tone="info" /> : null}
    </View>
  );
};

const levelValue = (value?: string | null): string | null =>
  LEVEL_ALIASES[value?.trim().toLocaleLowerCase("pt-BR") ?? ""] ?? null;

const publicGenderValue = (audience: Audience | null) => {
  if (audience === "Feminina") return "F";
  if (audience === "Masculina") return "M";
  if (audience === "Mista") return "Mixed";
  return null;
};

const missingClassFields = ({
  modalidadeId,
  professorId,
  daysOfWeek,
  startTime,
  endTime,
  capacity,
}: {
  modalidadeId: string;
  professorId: string;
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  capacity: string;
}) => {
  const maxCapacity = Number(capacity);
  return [
    !modalidadeId && "Modalidade",
    !professorId && "Professor",
    (daysOfWeek.length === 0 || daysOfWeek.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) && "Dias da semana",
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
  const [selected, setSelected] = useState<AnyOccurrenceItem | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [newClass, setNewClass] = useState(false);
  const [editingClass, setEditingClass] = useState<AulaType | null>(null);
  const [classToDelete, setClassToDelete] = useState<AulaType | null>(null);

  const selectedDateStr = useMemo(
    () => format(selectedDate, "yyyy-MM-dd"),
    [selectedDate],
  );
  const isSelectedDateToday = isToday(selectedDate);

  const weekDays = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = addDays(selectedDate, diffToMonday);
    return Array.from({ length: 7 }).map((_, index) => addDays(monday, index));
  }, [selectedDate]);

  const refresh = useScreenRefresh([
    ["today-occurrences"],
    ["schedule"],
    ["aulas", "active"],
  ]);

  const { deleteAula, isLoading: isDeleting } = useDeleteAula();
  const {
    todayOccurrences = [],
    isLoading: loadingToday,
    error: todayError,
  } = useTodayOccurrences();

  const {
    schedule: daySchedule,
    isLoading: loadingSchedule,
    error: scheduleError,
  } = useSchedule({
    startDate: selectedDateStr,
    endDate: selectedDateStr,
    page: 1,
    pageSize: 100,
  }, { live: true });

  const { aulas, isLoading: loadingAulas, error: aulasError } = useAulas();
  const aulasById = useMemo(
    () => new Map(aulas.map((aula) => [aula.id, aula])),
    [aulas],
  );

  const currentOccurrences: AnyOccurrenceItem[] = useMemo(() => {
    if (isSelectedDateToday && todayOccurrences.length > 0) {
      return todayOccurrences;
    }
    return daySchedule?.items ?? [];
  }, [isSelectedDateToday, todayOccurrences, daySchedule]);

  const loadingOccurrences = isSelectedDateToday
    ? loadingToday && !todayOccurrences.length
    : loadingSchedule;
  const occurrencesError = isSelectedDateToday ? todayError : scheduleError;

  const visibleClasses = useMemo(() => {
    return currentOccurrences.filter((item: AnyOccurrenceItem) => {
      const audience = audienceLabel(
        aulasById.get(item.aulaId)?.publicGender ||
          (item as any).publicGender,
      );
      return filter === "Todos" || audience === filter;
    });
  }, [currentOccurrences, aulasById, filter]);

  const handleDeleteClass = (item: AulaType) => {
    setClassToDelete(item);
  };

  const confirmDeleteClass = async () => {
    if (!classToDelete) return;
    try {
      await deleteAula(classToDelete.id);
      toast({ title: "Aula excluída com sucesso!" });
      setClassToDelete(null);
    } catch (requestError) {
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível excluir a aula.",
        ).description,
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ClientHeader />
      <RefreshableScrollView {...refresh}>
        <AdminScreen>
          <View style={styles.pageHeaderRow}>
            <View style={styles.grow}>
              <AdminPageHeader
                title="Grade & Aulas"
                subtitle="Ocorrências, reservas e lista de espera"
              />
            </View>
            <ActionButton
              label="Nova aula"
              icon={<Plus size={15} color="#fff" />}
              onPress={() => setNewClass(true)}
            />
          </View>

          <View style={styles.segment}>
            <TouchableOpacity
              onPress={() => setView("today")}
              style={[
                styles.segmentButton,
                view === "today" && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  view === "today" && styles.segmentTextActive,
                ]}
              >
                Ocorrências
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setView("week")}
              style={[
                styles.segmentButton,
                view === "week" && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  view === "week" && styles.segmentTextActive,
                ]}
              >
                Grade semanal
              </Text>
            </TouchableOpacity>
          </View>

          {view === "today" ? (
            <>
              {/* Navegador de Semana / Fita de 7 Dias */}
              <View style={styles.weekCalendarContainer}>
                {/* Cabeçalho da Semana: Mês/Ano + Botão Hoje + Setas de Navegação */}
                <View style={styles.weekCalendarHeader}>
                  <View style={styles.weekHeaderTitleGroup}>
                    <Calendar size={15} color={COLORS.mainOrange} />
                    <Text style={styles.weekHeaderTitle}>
                      {formatMonthYear(selectedDate)}
                    </Text>
                  </View>

                  <View style={styles.weekHeaderActions}>
                    {!isSelectedDateToday && (
                      <TouchableOpacity
                        style={styles.todayQuickButton}
                        onPress={() => setSelectedDate(new Date())}
                        activeOpacity={0.7}
                      >
                        <RotateCcw size={12} color={COLORS.mainOrange} />
                        <Text style={styles.todayQuickText}>Hoje</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.weekNavArrows}>
                      <TouchableOpacity
                        style={styles.weekArrowButton}
                        onPress={() => setSelectedDate((prev) => subDays(prev, 7))}
                        accessibilityLabel="Semana anterior"
                        activeOpacity={0.7}
                      >
                        <ChevronLeft size={16} color={COLORS.foreground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.weekArrowButton}
                        onPress={() => setSelectedDate((prev) => addDays(prev, 7))}
                        accessibilityLabel="Próxima semana"
                        activeOpacity={0.7}
                      >
                        <ChevronRight size={16} color={COLORS.foreground} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Fita de 7 Dias (Seg a Dom) */}
                <View style={styles.weekDaysRow}>
                  {weekDays.map((day) => {
                    const isSelected =
                      day.toDateString() === selectedDate.toDateString();
                    const isDayToday = isToday(day);
                    const dayName = [
                      "DOM",
                      "SEG",
                      "TER",
                      "QUA",
                      "QUI",
                      "SEX",
                      "SÁB",
                    ][day.getDay()];
                    const dayNum = day.getDate();

                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.dayPill,
                          isSelected && styles.dayPillActive,
                          isDayToday && !isSelected && styles.dayPillToday,
                        ]}
                        onPress={() => setSelectedDate(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayPillName,
                            isSelected && styles.dayPillNameActive,
                          ]}
                        >
                          {dayName}
                        </Text>
                        <Text
                          style={[
                            styles.dayPillNum,
                            isSelected && styles.dayPillNumActive,
                          ]}
                        >
                          {dayNum}
                        </Text>
                        {isDayToday && (
                          <View
                            style={[
                              styles.todayDot,
                              isSelected && styles.todayDotActive,
                            ]}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Filtros de Público */}
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

              {loadingOccurrences && (
                <>
                  <AdminSkeleton width="100%" height={90} radius={14} />
                  <AdminSkeleton width="100%" height={90} radius={14} />
                  <AdminSkeleton width="100%" height={90} radius={14} />
                </>
              )}

              {occurrencesError && (
                <Text style={styles.empty}>{occurrencesError}</Text>
              )}

              {!loadingOccurrences &&
                !occurrencesError &&
                visibleClasses.length === 0 && (
                  <Text style={styles.empty}>
                    Nenhuma aula encontrada para este dia.
                  </Text>
                )}

              {/* Listagem de Ocorrências (Print 1) */}
              {visibleClasses.map((item) => {
                const pct =
                  item.maxCapacity > 0
                    ? (item.confirmedCount / item.maxCapacity) * 100
                    : 0;
                const modTitle =
                  (item as any).modalidadeName ||
                  (item as any).modalityName ||
                  item.aulaName ||
                  "Aula";
                const modColor = getModalityColor(modTitle);
                const isFull =
                  item.maxCapacity > 0 &&
                  item.confirmedCount >= item.maxCapacity;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.occurrenceCard}
                    onPress={() => setSelected(item)}
                    activeOpacity={0.7}
                  >
                    {/* Horário */}
                    <View style={styles.timeColumn}>
                      <Text style={styles.timeTextStart}>
                        {item.startTime?.slice(0, 5)}
                      </Text>
                      <Text style={styles.timeTextEnd}>
                        {item.endTime?.slice(0, 5)}
                      </Text>
                    </View>

                    {/* Faixa vertical da modalidade */}
                    <View
                      style={[
                        styles.modalityBar,
                        { backgroundColor: modColor },
                      ]}
                    />

                    {/* Informações da Aula */}
                    <View style={styles.occurrenceDetails}>
                      <View style={styles.occurrenceTitleRow}>
                        <Text style={styles.occurrenceTitle} numberOfLines={1}>
                          {modTitle}
                        </Text>
                        {item.waitlistCount > 0 && (
                          <View style={styles.waitlistTag}>
                            <Text style={styles.waitlistTagText}>
                              +{item.waitlistCount} ESPERA
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        style={styles.occurrenceProfessor}
                        numberOfLines={1}
                      >
                        {item.professorName}
                      </Text>
                    </View>

                    {/* Lado Direito: Capacidade, Status e Chevron */}
                    <View style={styles.occurrenceRight}>
                      <View style={styles.capacityBlock}>
                        <Text style={styles.capacityNumbers}>
                          <Text
                            style={
                              isFull
                                ? styles.capacityNumberFull
                                : styles.capacityNumberNormal
                            }
                          >
                            {item.confirmedCount}
                          </Text>
                          {" / "}
                          {item.maxCapacity}
                        </Text>
                        <View style={styles.miniProgressTrack}>
                          <View
                            style={[
                              styles.miniProgressFill,
                              {
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: isFull
                                  ? "#EA580C"
                                  : modColor,
                              },
                            ]}
                          />
                        </View>
                      </View>

                      <Pill
                        label={item.status}
                        tone={statusTone(item.status)}
                      />
                      <ChevronRight size={18} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          ) : (
            /* Aba Grade Semanal Polida (Refatoração dos botões grandes) */
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
                      {dayClasses.map((item) => {
                        const modTitle =
                          item.modalidadeName || item.name || "Aula";
                        const modColor = getModalityColor(modTitle);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.weekSlotCard}
                            onPress={() => setEditingClass(item)}
                            activeOpacity={0.8}
                          >
                            <View
                              style={[
                                styles.weekSlotBar,
                                { backgroundColor: modColor },
                              ]}
                            />
                            <View style={styles.weekSlotMain}>
                              <View style={styles.weekSlotTopRow}>
                                <Text
                                  style={styles.weekSlotTitle}
                                  numberOfLines={1}
                                >
                                  {item.startTime?.slice(0, 5)} -{" "}
                                  {item.endTime?.slice(0, 5)} · {modTitle}
                                </Text>
                                <View style={styles.weekSlotCapacityBadge}>
                                  <Users size={11} color="#6B7280" />
                                  <Text style={styles.weekSlotCapacityText}>
                                    {item.maxCapacity}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={styles.weekSlotSub}
                                numberOfLines={1}
                              >
                                {item.professorName}
                                {item.minLevel ? ` · ${item.minLevel}` : ""}
                                {item.publicGender
                                  ? ` · ${audienceLabel(item.publicGender) ?? item.publicGender}`
                                  : ""}
                              </Text>
                            </View>
                            <View style={styles.weekSlotActions}>
                              <TouchableOpacity
                                style={styles.weekActionIconBtn}
                                onPress={() => setEditingClass(item)}
                                accessibilityLabel="Editar aula"
                              >
                                <Pencil size={15} color={COLORS.foreground} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[
                                  styles.weekActionIconBtn,
                                  styles.weekActionDeleteBtn,
                                ]}
                                onPress={() => handleDeleteClass(item)}
                                accessibilityLabel="Excluir aula"
                              >
                                <Trash2
                                  size={15}
                                  color={COLORS.destructive}
                                />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </AdminCard>
          )}
        </AdminScreen>
      </RefreshableScrollView>

      {/* Modal de Detalhes da Aula (Print 2) */}
      {selected ? (
        <ClassModal
          item={selected}
          onClose={() => setSelected(null)}
          onEditRecurring={(aula: AulaType) => setEditingClass(aula)}
          aulaTemplate={aulasById.get(selected.aulaId) ?? null}
        />
      ) : null}

      <NewClassModal
        visible={newClass}
        onClose={() => setNewClass(false)}
        onSuccess={(count) => {
          setNewClass(false);
          toast({
            title:
              count === 1
                ? "Aula criada com sucesso!"
                : `${count} aulas criadas com sucesso!`,
          });
        }}
        onError={(message) => {
          setNewClass(false);
          toast({ title: message, variant: "destructive" });
        }}
      />
      <EditClassModal
        item={editingClass}
        onClose={() => setEditingClass(null)}
        onSuccess={() => {
          setEditingClass(null);
          toast({ title: "Aula atualizada com sucesso!" });
        }}
        onError={(message) => {
          setEditingClass(null);
          toast({ title: message, variant: "destructive" });
        }}
      />
      <ConfirmModal
        visible={!!classToDelete}
        title="Excluir aula?"
        message="As ocorrências e reservas futuras desta aula serão canceladas e os alunos serão notificados."
        confirmText="Excluir aula"
        cancelText="Voltar"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={confirmDeleteClass}
        onClose={() => setClassToDelete(null)}
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
  onSuccess: (count: number) => void;
  onError: (message: string) => void;
}) {
  const modalRefresh = useScreenRefresh([["modalidades", "active"], ["professors", "active"]]);
  const { modalidades, professors, isLoading, error } = useClassFormOptions();
  const { createAula, isLoading: isCreating } = useCreateAula();
  const [modalidadeId, setModalidadeId] = useState("");
  const [professorId, setProfessorId] = useState("");
  const [name, setName] = useState("");
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [capacity, setCapacity] = useState("");
  const [publicGender, setPublicGender] = useState<Audience | null>(null);
  const [minLevel, setMinLevel] = useState<string | null>(null);
  const [allowTrial, setAllowTrial] = useState(true);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [validationMessage, setValidationMessage] = useState("");
  const submitting = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setModalidadeId("");
    setProfessorId(professors.length > 0 ? professors[0].userId : "");
    setName("");
    setDaysOfWeek([]);
    setStartTime("");
    setEndTime("");
    setCapacity("");
    setPublicGender(null);
    setMinLevel(null);
    setAllowTrial(true);
    setNotifyStudents(true);
    setValidationMessage("");
  }, [visible, professors]);

  useEffect(() => {
    if (visible && !professorId && professors.length > 0) {
      setProfessorId(professors[0].userId);
    }
  }, [visible, professors, professorId]);

  useEffect(() => {
    setValidationMessage("");
  }, [modalidadeId, professorId, daysOfWeek, startTime, endTime, capacity]);

  const close = () => {
    if (!submitting.current) onClose();
  };

  const submit = async () => {
    if (submitting.current || isCreating) return;
    const maxCapacity = Number(capacity);
    const missingFields = missingClassFields({ modalidadeId, professorId, daysOfWeek, startTime, endTime, capacity });
    if (missingFields.length) {
      setValidationMessage(`Preencha: ${missingFields.join(", ")}.`);
      return;
    }
    submitting.current = true;
    try {
      await createAula({
        modalidadeId,
        professorId,
        name: name.trim() || null,
        daysOfWeek,
        startTime,
        endTime,
        maxCapacity,
        allowTrial,
        minLevel,
        publicGender: publicGenderValue(publicGender),
        waitlistTimeoutMinutes: null,
        notifyStudents,
      });
      onSuccess(daysOfWeek.length);
    } catch (requestError) {
      onError(
        normalizeApiError(requestError, "Não foi possível criar a aula.")
          .description,
      );
    } finally {
      submitting.current = false;
    }
  };

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={close}
    >
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.rowBetween}>
              <SectionTitle>Nova aula</SectionTitle>
              <TouchableOpacity onPress={close} disabled={isCreating}>
                <X color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <RefreshableScrollView {...modalRefresh}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                      label:
                        item.role === "Admin"
                          ? `${item.name || item.email} (Admin)`
                          : item.role === "Instrutor"
                            ? `${item.name || item.email} (Instrutor)`
                            : item.name || item.email || "Professor",
                    }))}
                    value={professorId}
                    onChange={setProfessorId}
                    emptyMessage="Nenhum professor ou instrutor disponível no CT."
                  />
                  <Text style={styles.label}>Nome da aula (opcional)</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Treino avançado"
                    style={styles.input}
                  />
                  <Text style={styles.label}>Dias da semana</Text>
                  <Text style={styles.muted}>Selecione um ou mais dias. Uma aula será criada na grade para cada dia selecionado.</Text>
                  <View style={styles.options}>
                    {dayLabels.map((day, index) => (
                      <Option
                        key={day}
                        label={day}
                        active={daysOfWeek.includes(index)}
                        multiple
                        disabled={isCreating}
                        onPress={() => setDaysOfWeek((previous) =>
                          previous.includes(index)
                            ? previous.filter((day) => day !== index)
                            : [...previous, index].sort((a, b) => a - b),
                        )}
                      />
                    ))}
                  </View>
                  <View style={styles.fieldsRow}>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Início</Text>
                      <TextInput
                        value={startTime}
                        onChangeText={(value) => setStartTime(maskTime(value))}
                        placeholder="18:00"
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Fim</Text>
                      <TextInput
                        value={endTime}
                        onChangeText={(value) => setEndTime(maskTime(value))}
                        placeholder="19:00"
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Capacidade</Text>
                      <TextInput
                        value={capacity}
                        onChangeText={(value) => setCapacity(maskInteger(value))}
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
                  <Text style={styles.label}>Nível mínimo</Text>
                  <View style={styles.options}>
                    {minLevelOptions.map((option) => (
                      <Option
                        key={option.label}
                        label={option.label}
                        active={minLevel === option.value}
                        onPress={() => setMinLevel(option.value)}
                      />
                    ))}
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Permitir aula experimental</Text>
                    <Switch value={allowTrial} onValueChange={setAllowTrial} />
                  </View>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.label}>Avisar alunos sobre a aula nova</Text>
                      <Text style={styles.muted}>
                        Quem pode reservar recebe no sino e no celular. Desligue ao montar a grade do CT.
                      </Text>
                    </View>
                    <Switch
                      value={notifyStudents}
                      onValueChange={setNotifyStudents}
                      accessibilityLabel="Avisar alunos sobre a aula nova"
                    />
                  </View>
                  <ActionButton
                    label={isCreating ? "Criando..." : daysOfWeek.length > 1 ? `Criar ${daysOfWeek.length} aulas` : "Criar aula"}
                    onPress={submit}
                    disabled={isCreating}
                  />
                </View>
              )}
            </RefreshableScrollView>
          </View>
        </View>
      </KeyboardAvoider>
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
  const modalRefresh = useScreenRefresh([["modalidades", "active"], ["professors", "active"]]);
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
  const [minLevel, setMinLevel] = useState<string | null>(null);
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
    setMinLevel(levelValue(item.minLevel));
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
          minLevel,
          publicGender: publicGenderValue(publicGender),
          waitlistTimeoutMinutes: item.waitlistTimeoutMinutes,
        },
      });
      onSuccess();
    } catch (requestError) {
      onError(
        normalizeApiError(requestError, "Não foi possível atualizar a aula.")
          .description,
      );
    }
  };

  const submit = () => {
    if (isUpdating) return;
    const maxCapacity = Number(capacity);
    const missingFields = missingClassFields({ modalidadeId, professorId, daysOfWeek: dayOfWeek === null ? [] : [dayOfWeek], startTime, endTime, capacity });
    if (missingFields.length) {
      setValidationMessage(`Preencha: ${missingFields.join(", ")}.`);
      return;
    }

    void save();
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoider>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.rowBetween}>
              <SectionTitle>Editar aula</SectionTitle>
              <TouchableOpacity onPress={onClose}>
                <X color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <RefreshableScrollView {...modalRefresh}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
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
                      label:
                        option.role === "Admin"
                          ? `${option.name || option.email} (Admin)`
                          : option.role === "Instrutor"
                            ? `${option.name || option.email} (Instrutor)`
                            : option.name || option.email || "Professor",
                    }))}
                    value={professorId}
                    onChange={setProfessorId}
                    emptyMessage="Nenhum professor ou instrutor disponível no CT."
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
                      <TextInput
                        value={startTime}
                        onChangeText={(value) => setStartTime(maskTime(value))}
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Fim</Text>
                      <TextInput
                        value={endTime}
                        onChangeText={(value) => setEndTime(maskTime(value))}
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.label}>Capacidade</Text>
                      <TextInput
                        value={capacity}
                        onChangeText={(value) => setCapacity(maskInteger(value))}
                        style={styles.input}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>
                  <Text style={styles.label}>Público</Text>
                  <View style={styles.options}>
                    {filters.slice(1).map((option) => (
                      <Option key={option} label={option} active={publicGender === option} onPress={() => setPublicGender(option as Audience)} />
                    ))}
                  </View>
                  <Text style={styles.label}>Nível mínimo</Text>
                  <View style={styles.options}>
                    {minLevelOptions.map((option) => (
                      <Option
                        key={option.label}
                        label={option.label}
                        active={minLevel === option.value}
                        onPress={() => setMinLevel(option.value)}
                      />
                    ))}
                  </View>
                  <View style={styles.rowBetween}>
                    <Text style={styles.label}>Permitir aula experimental</Text>
                    <Switch value={allowTrial} onValueChange={setAllowTrial} />
                  </View>
                  <ActionButton label={isUpdating ? "Salvando..." : "Salvar alterações"} onPress={submit} />
                </View>
              )}
            </RefreshableScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function OptionField({
  label,
  options,
  value,
  onChange,
  emptyMessage,
}: {
  label: string;
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  emptyMessage?: string;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {options.length === 0 ? (
        <Text style={styles.muted}>{emptyMessage || "Nenhuma opção disponível."}</Text>
      ) : (
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
      )}
    </View>
  );
}

function Option({
  label,
  active,
  onPress,
  multiple = false,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  multiple?: boolean;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={multiple ? "checkbox" : "button"}
      accessibilityState={multiple ? { checked: active, disabled } : { selected: active, disabled }}
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
  onEditRecurring,
  aulaTemplate,
}: {
  item: AnyOccurrenceItem | null;
  onClose: () => void;
  onEditRecurring?: (aula: AulaType) => void;
  aulaTemplate?: AulaType | null;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"confirmed" | "waitlist">("confirmed");
  const modalRefresh = useScreenRefresh([["attendance", item?.id]], {
    enabled: !!item,
  });

  const {
    attendance: confirmedData,
    isLoading: loadingConfirmed,
    error: confirmedError,
    refetch: refetchConfirmed,
  } = useAttendance({
    ocorrenciaId: item?.id ?? "",
    status: "Confirmado",
  });

  const {
    attendance: waitlistData,
    isLoading: loadingWaitlist,
    error: waitlistError,
    refetch: refetchWaitlist,
  } = useAttendance({
    ocorrenciaId: item?.id ?? "",
    status: "FilaEspera",
  });

  const { markAttendance } = useMarkAttendance();
  const { closeOcorrencia, isLoading: isClosing } = useCloseOcorrencia();
  const { cancelOcorrencia, isLoading: isCancelling } = useCancelOcorrencia();
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const { teacher } = useOcorrenciaTeacher(item?.id);
  const { professors } = useProfessors();
  const { setSubstitute, isLoading: isSavingSubstitute } = useSetOcorrenciaSubstitute();

  // Titular primeiro, marcado; quem não está mais na lista de professores continua aparecendo.
  const teacherOptions = useMemo(() => {
    if (!teacher) return [];
    const others = professors
      .filter((p) => p.userId !== teacher.professorId)
      .map((p) => ({ id: p.userId, label: p.name || p.email || "Professor" }));
    if (teacher.substituteId && !others.some((o) => o.id === teacher.substituteId)) {
      others.push({ id: teacher.substituteId, label: teacher.substituteName || "Substituto" });
    }
    return [{ id: teacher.professorId, label: `${teacher.professorName} (titular)` }, ...others];
  }, [teacher, professors]);

  const rawConfirmed = confirmedData?.lista ?? [];
  const confirmedStudents = useMemo(() => {
    return rawConfirmed.filter(
      (s: AttendanceStudentType) => s.status !== "Waitlist",
    );
  }, [rawConfirmed]);

  const rawWaitlist = waitlistData?.lista ?? [];
  const waitlistStudents = useMemo(() => {
    if (!item?.waitlistCount || item.waitlistCount === 0) return [];
    return rawWaitlist.filter(
      (s: AttendanceStudentType) => s.status === "Waitlist",
    );
  }, [rawWaitlist, item?.waitlistCount]);

  if (!item) return null;

  const checkInsCount = confirmedData?.presentCount ?? 0;
  const isCancelled = item.status === "Cancelada";
  const isClassClosed =
    item.status === "Encerrada" || item.status === "Concluida" || isCancelled;

  const handleToggleCheckIn = async (student: AttendanceStudentType) => {
    if (savingBookingId || !student.bookingId) return;
    const isCurrentlyPresent = student.status === "Present";
    setSavingBookingId(student.bookingId);

    try {
      await markAttendance({
        bookingId: student.bookingId,
        present: !isCurrentlyPresent,
      });
      toast({
        title: !isCurrentlyPresent
          ? `Check-in de ${student.studentName} confirmado!`
          : `Check-in de ${student.studentName} desfeito.`,
      });
      refetchConfirmed();
    } catch (err: any) {
      toast({
        title:
          err?.data?.detail ||
          err?.message ||
          "Não foi possível registrar o check-in.",
        variant: "destructive",
      });
    } finally {
      setSavingBookingId(null);
    }
  };

  const [confirmCloseModal, setConfirmCloseModal] = useState(false);

  const handleCloseClass = () => {
    setConfirmCloseModal(true);
  };

  const confirmCloseAction = async () => {
    try {
      await closeOcorrencia(item.id);
      toast({ title: "Aula encerrada com sucesso!" });
      setConfirmCloseModal(false);
      onClose();
    } catch (err: any) {
      toast({
        title:
          err?.data?.detail ||
          err?.message ||
          "Não foi possível encerrar a aula.",
        variant: "destructive",
      });
    }
  };

  const handleChooseTeacher = async (professorId: string) => {
    if (!teacher || isSavingSubstitute) return;
    if (professorId === (teacher.substituteId ?? teacher.professorId)) return;
    const backToTitular = professorId === teacher.professorId;
    try {
      const updated = await setSubstitute({
        ocorrenciaId: item.id,
        professorId: backToTitular ? null : professorId,
      });
      toast({
        title: backToTitular
          ? `A aula voltou para ${updated.professorName}.`
          : `${updated.substituteName} vai cobrir esta aula.`,
        description: backToTitular ? undefined : "Avisamos no app; a chamada fica com quem cobre.",
      });
    } catch (err: any) {
      toast({
        title: err?.data?.detail || err?.message || "Não foi possível trocar o professor.",
        variant: "destructive",
      });
    }
  };

  const handleCancelAction = async () => {
    try {
      await cancelOcorrencia({ ocorrenciaId: item.id, reason: cancelReason });
      toast({
        title: "Aula cancelada com sucesso!",
        description: "Os check-ins não foram debitados e os alunos foram notificados.",
      });
      setCancelModalVisible(false);
      setCancelReason("");
      onClose();
    } catch (err: any) {
      toast({
        title:
          err?.data?.detail ||
          err?.message ||
          "Não foi possível cancelar a aula.",
        variant: "destructive",
      });
    }
  };

  const modTitle =
    (item as any).modalidadeName ||
    (item as any).modalityName ||
    item.aulaName ||
    "Aula";

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.modalHeaderRow}>
            <View style={styles.grow}>
              <Text style={styles.modalHeaderTitle}>{modTitle}</Text>
              <Text style={styles.modalHeaderSubtitle}>
                {teacher?.substituteName ?? teacher?.professorName ?? item.professorName} · {item.startTime?.slice(0, 5)} -{" "}
                {item.endTime?.slice(0, 5)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <X size={20} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>

          {/* 4 Cards de Métricas (Print 2) */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>CAPACIDADE</Text>
              <Text style={styles.kpiBoxValue}>{item.maxCapacity}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>CONFIRMADOS</Text>
              <Text style={styles.kpiBoxValue}>{item.confirmedCount}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>CHECK-INS</Text>
              <Text style={styles.kpiBoxValue}>{checkInsCount}</Text>
            </View>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>LISTA ESPERA</Text>
              <Text style={styles.kpiBoxValue}>{item.waitlistCount}</Text>
            </View>
          </View>

          {/* Professor do dia: troca só esta aula (substituto), sem mexer na grade */}
          {!isClassClosed && teacherOptions.length > 0 && teacher && (
            <View style={styles.substituteSection}>
              <OptionField
                label="Professor do dia"
                options={teacherOptions}
                value={teacher.substituteId ?? teacher.professorId}
                onChange={handleChooseTeacher}
              />
              <Text style={styles.muted}>
                {isSavingSubstitute
                  ? "Salvando..."
                  : "Vale só para esta aula. Quem cobrir recebe o aviso e faz a chamada."}
              </Text>
            </View>
          )}

          {/* Tabs: Confirmados / Espera */}
          <View style={styles.segment}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "confirmed" && styles.segmentActive,
              ]}
              onPress={() => setTab("confirmed")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "confirmed" && styles.segmentTextActive,
                ]}
              >
                Confirmados ({confirmedStudents.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                tab === "waitlist" && styles.segmentActive,
              ]}
              onPress={() => setTab("waitlist")}
            >
              <Text
                style={[
                  styles.segmentText,
                  tab === "waitlist" && styles.segmentTextActive,
                ]}
              >
                Lista de Espera ({waitlistStudents.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista de Alunos */}
          <RefreshableScrollView {...modalRefresh} style={styles.peopleList}>
            {tab === "confirmed" ? (
              loadingConfirmed ? (
                <AdminSkeleton width="100%" height={160} radius={12} />
              ) : confirmedError ? (
                <Text style={styles.empty}>{confirmedError}</Text>
              ) : confirmedStudents.length > 0 ? (
                confirmedStudents.map((student: AttendanceStudentType, index: number) => {
                  const isPresent = student.status === "Present";
                  const isSavingThis = savingBookingId === student.bookingId;
                  return (
                    <View
                      key={
                        student.bookingId ||
                        `${student.studentName}-${index}`
                      }
                      style={styles.studentCardRow}
                    >
                      <View style={styles.studentAvatar}>
                        <Text style={styles.studentAvatarText}>
                          {initials(student.studentName || "Aluno")}
                        </Text>
                      </View>
                      <View style={styles.grow}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {student.studentName || "Aluno"}
                        </Text>
                        <StudentMeta level={student.level} paymentMethod={student.paymentMethod} />
                      </View>

                      {/* Botão / Badge de Check-in (Print 2) */}
                      {isPresent ? (
                        <TouchableOpacity
                          style={styles.checkedInBadge}
                          onPress={() => handleToggleCheckIn(student)}
                          disabled={isSavingThis || isClassClosed}
                          activeOpacity={0.7}
                        >
                          <Check size={13} color="#10B981" />
                          <Text style={styles.checkedInBadgeText}>
                            CONFIRMADO
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.pendingCheckInBtn}
                          onPress={() => handleToggleCheckIn(student)}
                          disabled={isSavingThis || isClassClosed}
                          activeOpacity={0.7}
                        >
                          <View style={styles.pendingCheckInDot} />
                          <Text style={styles.pendingCheckInBtnText}>
                            {isSavingThis ? "..." : "CHECK-IN"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              ) : (
                <Text style={styles.empty}>
                  Nenhum aluno confirmado nesta aula.
                </Text>
              )
            ) : loadingWaitlist ? (
              <AdminSkeleton width="100%" height={160} radius={12} />
            ) : waitlistError ? (
              <Text style={styles.empty}>{waitlistError}</Text>
            ) : waitlistStudents.length > 0 ? (
              waitlistStudents.map((student: AttendanceStudentType, index: number) => (
                <View
                  key={
                    student.bookingId || `${student.studentName}-${index}`
                  }
                  style={styles.studentCardRow}
                >
                  <View style={styles.waitlistPosBadge}>
                    <Text style={styles.waitlistPosText}>{index + 1}</Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.studentName} numberOfLines={1}>
                      {student.studentName || "Aluno"}
                    </Text>
                    <StudentMeta level={student.level} paymentMethod={student.paymentMethod} />
                  </View>
                  <Text style={styles.waitlistStatusLabel}>
                    Aguardando vaga
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.empty}>
                Nenhum aluno na lista de espera.
              </Text>
            )}
          </RefreshableScrollView>

          {/* Rodapé Redesenhado com Ações da Aula */}
          <View style={styles.modalFooterContainer}>
            {isCancelled ? (
              <View style={styles.modalCancelledBanner}>
                <Text style={styles.modalCancelledBannerText}>Esta aula está cancelada</Text>
              </View>
            ) : (
              <>
                {/* Linha de Ações Secundárias: Editar Grade e Cancelar Aula */}
                <View style={styles.modalSecondaryActionsRow}>
                  {aulaTemplate && onEditRecurring && (
                    <TouchableOpacity
                      style={styles.modalSecondaryBtnOrange}
                      onPress={() => {
                        onClose();
                        onEditRecurring(aulaTemplate);
                      }}
                      activeOpacity={0.7}
                    >
                      <Pencil size={14} color="#EA580C" />
                      <Text style={styles.modalSecondaryBtnOrangeText}>Editar grade</Text>
                    </TouchableOpacity>
                  )}

                  {!isClassClosed && (
                    <TouchableOpacity
                      style={[
                        styles.modalSecondaryBtnRed,
                        isCancelling && styles.modalCloseClassBtnDisabled,
                      ]}
                      onPress={() => setCancelModalVisible(true)}
                      disabled={isCancelling || isClosing}
                      activeOpacity={0.7}
                    >
                      <X size={15} color="#DC2626" />
                      <Text style={styles.modalSecondaryBtnRedText}>
                        {isCancelling ? "Cancelando..." : "Cancelar aula"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Linha de Ação Principal: Encerrar Aula */}
                {!isClassClosed && (
                  <TouchableOpacity
                    style={[
                      styles.modalPrimaryActionBtn,
                      isClosing && styles.modalCloseClassBtnDisabled,
                    ]}
                    onPress={handleCloseClass}
                    disabled={isClosing || isCancelling}
                    activeOpacity={0.8}
                  >
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalPrimaryActionBtnText}>
                      {isClosing ? "Encerrando..." : "Encerrar aula"}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </View>
      <ConfirmModal
        visible={confirmCloseModal}
        title="Encerrar aula?"
        message="Deseja encerrar a chamada desta aula agora? Alunos sem check-in serão marcados como ausentes."
        confirmText="Encerrar aula"
        cancelText="Voltar"
        variant="destructive"
        isLoading={isClosing}
        onConfirm={confirmCloseAction}
        onClose={() => setConfirmCloseModal(false)}
      />
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCancelModalVisible(false);
          setCancelReason("");
        }}
      >
        <View style={styles.cancelOverlay}>
          <View style={styles.cancelContent}>
            <Text style={styles.cancelTitle}>Cancelar ocorrência da aula?</Text>
            <Text style={styles.cancelSubtitle}>
              Os check-ins dos alunos inscritos não serão debitados e os alunos receberão uma notificação.
            </Text>
            <View style={{ gap: 6, marginVertical: 12 }}>
              <Text style={styles.inputLabel}>Motivo do cancelamento (opcional)</Text>
              <TextInput
                style={styles.cancelInput}
                placeholder="Ex: Chuva, professor indisposto..."
                placeholderTextColor="#9ca3af"
                value={cancelReason}
                onChangeText={setCancelReason}
              />
            </View>
            <Text style={styles.cancelWarning}>Esta ação não pode ser desfeita.</Text>
            <View style={styles.cancelActionsRow}>
              <TouchableOpacity
                style={styles.cancelVoltarBtn}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason("");
                }}
                disabled={isCancelling}
              >
                <Text style={styles.cancelVoltarText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelConfirmBtn,
                  isCancelling && styles.modalCloseClassBtnDisabled,
                ]}
                onPress={handleCancelAction}
                disabled={isCancelling}
              >
                <Text style={styles.cancelConfirmText}>
                  {isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  pageHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  grow: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  title: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  muted: { color: COLORS.mutedForeground, fontSize: 12 },
  segment: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E8EB",
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  segmentActive: { borderBottomColor: COLORS.mainOrange },
  segmentText: { fontSize: 13, fontWeight: "700", color: COLORS.mutedForeground },
  segmentTextActive: { color: COLORS.mainOrange },

  /* Navegador de Semana / Fita de 7 Dias */
  weekCalendarContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  weekCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  weekHeaderTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  weekHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  weekHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  todayQuickButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF2E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  todayQuickText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.mainOrange,
  },
  weekNavArrows: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  weekArrowButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  weekDaysRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "transparent",
  },
  dayPillActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
    shadowColor: COLORS.mainOrange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  dayPillToday: {
    borderColor: "#FED7AA",
    backgroundColor: "#FFFBF7",
  },
  dayPillName: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 2,
  },
  dayPillNameActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayPillNum: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  dayPillNumActive: {
    color: "#FFFFFF",
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.mainOrange,
    marginTop: 3,
  },
  todayDotActive: {
    backgroundColor: "#FFFFFF",
  },

  /* Filtros de Público */
  filters: { gap: 8, marginBottom: 12 },
  filter: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 9,
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

  /* Card de Ocorrência (Print 1) */
  occurrenceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 9,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  timeColumn: {
    width: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  timeTextStart: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  timeTextEnd: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  modalityBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
    marginHorizontal: 10,
  },
  occurrenceDetails: {
    flex: 1,
    justifyContent: "center",
  },
  occurrenceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  occurrenceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  waitlistTag: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  waitlistTagText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
  },
  substituteSection: {
    gap: 6,
    marginBottom: 16,
  },
  occurrenceProfessor: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  occurrenceRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  capacityBlock: {
    alignItems: "flex-end",
    minWidth: 54,
  },
  capacityNumbers: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.mutedForeground,
  },
  capacityNumberNormal: {
    color: COLORS.foreground,
    fontWeight: "800",
  },
  capacityNumberFull: {
    color: "#EA580C",
    fontWeight: "800",
  },
  miniProgressTrack: {
    width: 48,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    marginTop: 3,
    overflow: "hidden",
  },
  miniProgressFill: {
    height: 4,
    borderRadius: 2,
  },

  /* Grade Semanal Polida (Refatoração dos botões grandes do Print 3) */
  weekRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    marginTop: 4,
  },
  day: { width: 34, fontWeight: "800", color: COLORS.foreground, paddingTop: 4 },
  weekSlotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FAFBFD",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  weekSlotBar: {
    width: 4,
    height: 36,
    borderRadius: 2,
    marginRight: 10,
  },
  weekSlotMain: { flex: 1 },
  weekSlotTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  weekSlotTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
    flex: 1,
  },
  weekSlotCapacityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  weekSlotCapacityText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  weekSlotSub: {
    fontSize: 11,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  weekSlotActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  weekActionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  weekActionDeleteBtn: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },

  /* Modal de Detalhes da Aula (Print 2) */
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
    maxHeight: "90%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 4,
  },

  /* 4 KPI Cards (Print 2) */
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 4,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  kpiBoxLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.3,
    marginBottom: 4,
    textAlign: "center",
  },
  kpiBoxValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  /* Listagem de Alunos no Modal */
  peopleList: { maxHeight: 300 },
  studentCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginBottom: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFF0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    color: COLORS.mainOrange,
    fontSize: 11,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  studentSubText: {
    fontSize: 11,
    color: COLORS.mutedForeground,
  },
  studentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 2,
  },
  checkedInBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  checkedInBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  pendingCheckInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  pendingCheckInDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563EB",
  },
  pendingCheckInBtnText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563EB",
  },
  waitlistPosBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  waitlistPosText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  waitlistStatusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
  },

  /* Rodapé do Modal Redesenhado */
  modalFooterContainer: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalSecondaryActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  modalSecondaryBtnOrange: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFF2E9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  modalSecondaryBtnOrangeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#EA580C",
  },
  modalSecondaryBtnRed: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  modalSecondaryBtnRedText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  modalPrimaryActionBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.mainOrange,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalPrimaryActionBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalCloseClassBtnDisabled: {
    backgroundColor: "#9CA3AF",
  },
  modalCancelledBanner: {
    backgroundColor: "#FEE2E2",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  modalCancelledBannerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  cancelOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  cancelContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 420,
  },
  cancelTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 6,
  },
  cancelSubtitle: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },
  cancelWarning: {
    fontSize: 12,
    color: COLORS.destructive,
    fontWeight: "600",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  cancelInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.foreground,
  },
  cancelActionsRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancelVoltarBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelVoltarText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  cancelConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.destructive,
  },
  cancelConfirmText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },

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
    minHeight: 46,
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
