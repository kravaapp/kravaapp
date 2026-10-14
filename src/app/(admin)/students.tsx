import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  AdminPageHeader,
  Pill,
  initials,
} from "@/components/admin/AdminUi";
import {
  useAlunoActions,
  useAlunoDetails,
  useAlunos,
} from "@/hooks/alunos.hooks";
import { useCreateInvitation } from "@/hooks/auth.hooks";
import { useCreateContract } from "@/hooks/contracts.hooks";
import { usePlans } from "@/hooks/plans.hooks";
import { useProfessors, useRemoveProfessor } from "@/hooks/schedule.hooks";
import { normalizeApiError } from "@/routes/apiError";
import {
  useCancelCtInvitation,
  useCtInvitations,
  useJoinRequestActions,
  usePendingJoinRequests,
} from "@/hooks/tenant.hooks";
import { createInvitationSchema } from "@/schemas/auth.schemas";
import { AlunoType } from "@/types/alunos.types";
import {
  maskCpf,
  maskDate,
  maskPhone,
  toDateInput,
  toIsoDate,
  todayInput,
} from "@/utils/masks";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "@/components/AppModal";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

type Option = { label: string; value: string };

/* label: exibido para o usuário · value: enviado na rota */
const levels: Option[] = [
  { label: "Iniciante", value: "Iniciante" },
  { label: "Intermediário", value: "Intermediario" },
  { label: "Avançado", value: "Avançado" },
];
const statuses: Option[] = [
  { label: "Ativo", value: "Ativo" },
  { label: "Inativo", value: "Inativo" },
  { label: "Trial", value: "Trial" },
  { label: "Suspenso", value: "Suspenso" },
  { label: "Bloqueado", value: "Bloqueado" },
];
const paymentMethods: Option[] = [
  { label: "Pix", value: "Pix" },
  { label: "Cartão de Crédito", value: "CartaoCredito" },
  { label: "Boleto", value: "Boleto" },
  { label: "Gympass", value: "Gympass" },
  { label: "Totalpass", value: "Totalpass" },
  { label: "Dinheiro", value: "Dinheiro" },
  { label: "Avulso", value: "Avulto" },
  { label: "Patrocínio", value: "Partner" },
];
const sexes: Option[] = [
  { label: "Masculino", value: "M" },
  { label: "Feminino", value: "F" },
];
/* Opção "Todos": value vazio significa "sem filtro" na rota. */
const ALL: Option = { label: "Todos", value: "" };
const nullable = (value: string) => value.trim() || null;
const tone = (value?: string | null) =>
  value?.toLowerCase() === "ativo"
    ? ("success" as const)
    : ["inativo", "suspenso"].includes(value?.toLowerCase() ?? "")
      ? ("danger" as const)
      : ("neutral" as const);

export default function AdminStudents() {
  const [section, setSection] = useState<"students" | "teachers" | "requests">("students");
  const refresh = useScreenRefresh([
    ["alunos"],
    ["professors", "active"],
    ["tenant-join-requests"],
    ["tenant-invitations"],
  ]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftLevel, setDraftLevel] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftPayment, setDraftPayment] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [invitingTeacher, setInvitingTeacher] = useState(false);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const {
    professors,
    isLoading: professorsLoading,
    error: professorsError,
    refetch: refetchProfessors,
  } = useProfessors();
  const {
    invitations: teacherInvitations,
    isLoading: teacherInvitationsLoading,
    error: teacherInvitationsError,
    refetch: refetchTeacherInvitations,
  } = useCtInvitations("Professor");
  const { cancelInvitation } = useCancelCtInvitation();
  const { removeProfessor } = useRemoveProfessor();
  const [removingTeacherId, setRemovingTeacherId] = useState<string | null>(null);

  const handleDeleteTeacher = (teacher: (typeof professors)[number]) => {
    Alert.alert(
      "Desvincular professor",
      `Deseja desvincular o professor "${teacher.name || teacher.email}" deste Centro de Treinamento?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingTeacherId(teacher.userId);
              await removeProfessor(teacher.userId);
              toast({ title: "Professor desvinculado com sucesso!" });
            } catch (err) {
              const errInfo = normalizeApiError(
                err,
                "Não foi possível desvincular o professor.",
              );
              toast({
                title: "Não foi possível desvincular o professor",
                description: errInfo.description,
                variant: "destructive",
              });
            } finally {
              setRemovingTeacherId(null);
            }
          },
        },
      ]
    );
  };
  const {
    requests: joinRequests,
    isLoading: joinRequestsLoading,
    error: joinRequestsError,
  } = usePendingJoinRequests();
  const {
    approveJoinRequest,
    rejectJoinRequest,
    isSaving: isSavingJoinRequest,
  } = useJoinRequestActions();
  const { alunos, isLoading, error } = useAlunos({
    search: search || undefined,
    level: level || undefined,
    status: status || undefined,
    paymentMethod: payment || undefined,
    page,
    pageSize: 20,
    sortBy: "userName",
    sortDirection: "asc",
  });
  const items = alunos?.items ?? [];
  const activeFilterCount = [status, level, payment].filter(Boolean).length;
  useEffect(() => setPage(1), [search, level, status, payment]);

  const filteredProfessors = useMemo(() => {
    if (!teacherSearch.trim()) return professors;
    const term = teacherSearch.toLowerCase();
    return professors.filter(
      (p) =>
        (p.name?.toLowerCase().includes(term) ?? false) ||
        (p.email?.toLowerCase().includes(term) ?? false)
    );
  }, [professors, teacherSearch]);

  const filteredTeacherInvitations = useMemo(() => {
    if (!teacherSearch.trim()) return teacherInvitations;
    const term = teacherSearch.toLowerCase();
    return teacherInvitations.filter(
      (inv) => inv.email?.toLowerCase().includes(term) ?? false
    );
  }, [teacherInvitations, teacherSearch]);

  const handleCancelInvitation = async (id: string) => {
    setCancellingInvitationId(id);
    try {
      await cancelInvitation(id);
      toast({ title: "Convite cancelado com sucesso." });
      refetchTeacherInvitations();
    } catch {
      toast({
        title: "Não foi possível cancelar o convite.",
        variant: "destructive",
      });
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const openFilters = () => {
    setDraftStatus(status);
    setDraftLevel(level);
    setDraftPayment(payment);
    setFiltersOpen(true);
  };

  const applyFilters = () => {
    setStatus(draftStatus);
    setLevel(draftLevel);
    setPayment(draftPayment);
    setFiltersOpen(false);
  };

  const decideJoinRequest = async (
    id: string,
    decision: "approve" | "reject",
  ) => {
    if (isSavingJoinRequest) return;
    setProcessingRequestId(id);
    try {
      if (decision === "approve") {
        await approveJoinRequest(id);
        toast({ title: "Solicitação aprovada. O aluno foi vinculado ao CT." });
      } else {
        await rejectJoinRequest(id);
        toast({ title: "Solicitação recusada." });
      }
    } catch {
      toast({
        title: "Não foi possível atualizar a solicitação.",
        variant: "destructive",
      });
    } finally {
      setProcessingRequestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ClientHeader />
      <View style={styles.pageNavigation}>
        <AdminPageHeader title="membros" subtitle="Gestão de alunos, professores e solicitações" />
        <View style={styles.internalTabs} accessibilityRole="tablist">
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: section === "students" }}
            style={[styles.internalTab, section === "students" && styles.internalTabActive]}
            onPress={() => setSection("students")}
          >
            <Text style={[styles.internalTabText, section === "students" && styles.internalTabTextActive]}>Alunos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: section === "teachers" }}
            style={[styles.internalTab, section === "teachers" && styles.internalTabActive]}
            onPress={() => setSection("teachers")}
          >
            <Text style={[styles.internalTabText, section === "teachers" && styles.internalTabTextActive]}>Professores</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="tab"
            accessibilityState={{ selected: section === "requests" }}
            style={[styles.internalTab, section === "requests" && styles.internalTabActive]}
            onPress={() => setSection("requests")}
          >
            <Text style={[styles.internalTabText, section === "requests" && styles.internalTabTextActive]}>Solicitações</Text>
            {joinRequests.length > 0 && (
              <View style={styles.requestCount}><Text style={styles.requestCountText}>{joinRequests.length}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <RefreshableScrollView {...refresh} key={section} testID="members-list" style={styles.contentScroll}>
        <AdminScreen>
          {section === "requests" ? (
          <View style={styles.joinRequestsSection}>
            <View style={styles.joinRequestsHeader}>
              <View>
                <Text style={styles.requestTitle}>Solicitações de entrada</Text>
                <Text style={styles.secondary}>
                  Alunos aguardando aprovação para entrar no CT.
                </Text>
              </View>
            </View>
            {joinRequestsLoading ? (
              <AdminSkeleton height={106} radius={8} />
            ) : joinRequestsError ? (
              <Text style={styles.error}>{joinRequestsError}</Text>
            ) : joinRequests.length === 0 ? (
              <Text style={styles.empty}>Nenhuma solicitação pendente.</Text>
            ) : (
              joinRequests.map((request) => {
                const processing = processingRequestId === request.id;
                return (
                  <AdminCard key={request.id} style={styles.joinRequestCard}>
                    <View style={styles.joinRequestHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {initials(
                            request.userName || request.userEmail || "Aluno",
                          )}
                        </Text>
                      </View>
                      <View style={styles.grow}>
                        <Text style={styles.name} numberOfLines={1}>
                          {request.userName || "Aluno sem nome"}
                        </Text>
                        <Text style={styles.secondary} numberOfLines={1}>
                          {request.userEmail || "E-mail não informado"}
                        </Text>
                        <Text style={styles.secondary}>
                          Solicitado em{" "}
                          {new Date(request.createdAtUtc).toLocaleDateString(
                            "pt-BR",
                          )}
                        </Text>
                        {request.planId ? (
                          <Text style={styles.planReference}>
                            Plano selecionado na solicitação
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.joinRequestFooter}>
                      <TouchableOpacity
                        disabled={isSavingJoinRequest}
                        onPress={() => decideJoinRequest(request.id, "reject")}
                        style={[
                          styles.joinRequestRejectBtn,
                          isSavingJoinRequest && styles.disabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Recusar solicitação"
                      >
                        <X size={15} color={COLORS.destructive} />
                        <Text style={styles.joinRequestRejectText}>Recusar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        disabled={isSavingJoinRequest}
                        onPress={() => decideJoinRequest(request.id, "approve")}
                        style={[
                          styles.joinRequestApproveBtn,
                          isSavingJoinRequest && styles.disabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Aprovar solicitação"
                      >
                        {processing && isSavingJoinRequest ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Check size={15} color="#fff" />
                            <Text style={styles.joinRequestApproveText}>Aprovar</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </AdminCard>
                );
              })
            )}
          </View>
          ) : section === "teachers" ? (
          <View style={styles.joinRequestsSection}>
            <View style={styles.toolbar}>
              <View style={styles.searchBox}>
                <Search size={17} color={COLORS.mutedForeground} />
                <TextInput
                  value={teacherSearch}
                  onChangeText={setTeacherSearch}
                  placeholder="Buscar professor..."
                  placeholderTextColor={COLORS.mutedForeground}
                  style={styles.searchInput}
                />
              </View>
              <ActionButton
                label="Convidar"
                icon={<Plus size={15} color="#fff" />}
                onPress={() => setInvitingTeacher(true)}
              />
            </View>
            {professorsError || teacherInvitationsError ? (
              <Text style={styles.error}>
                {professorsError || teacherInvitationsError}
              </Text>
            ) : null}
            {professorsLoading || teacherInvitationsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <AdminSkeleton key={index} height={92} radius={8} />
              ))
            ) : filteredProfessors.length === 0 && filteredTeacherInvitations.length === 0 ? (
              <AdminCard>
                <Text style={styles.empty}>
                  {teacherSearch
                    ? "Nenhum professor encontrado para essa busca."
                    : "Nenhum professor vinculado ainda. Convide professores para ministrar aulas no CT."}
                </Text>
              </AdminCard>
            ) : (
              <>
                {filteredTeacherInvitations.map((invitation) => {
                  const cancelling = cancellingInvitationId === invitation.id;
                  return (
                    <AdminCard key={invitation.id} style={styles.studentCard}>
                      <View style={[styles.avatar, { backgroundColor: "#FEF3C7" }]}>
                        <Text style={[styles.avatarText, { color: "#D97706" }]}>
                          {initials(invitation.email || "P")}
                        </Text>
                      </View>
                      <View style={styles.grow}>
                        <Text style={styles.name}>{invitation.email}</Text>
                        <Text style={styles.secondary}>
                          Convite enviado em{" "}
                          {new Date(invitation.createdAtUtc).toLocaleDateString(
                            "pt-BR",
                          )}
                        </Text>
                        <View style={styles.pills}>
                          <Pill label="Convite Pendente" tone="warning" />
                          <Pill label={invitation.role || "Professor"} tone="neutral" />
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleCancelInvitation(invitation.id)}
                        disabled={cancelling}
                        style={[
                          styles.rejectButton,
                          cancelling && styles.disabled,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Cancelar convite"
                      >
                        <X size={14} color={COLORS.destructive} />
                        <Text style={styles.rejectButtonText}>
                          {cancelling ? "Cancelando..." : "Cancelar"}
                        </Text>
                      </TouchableOpacity>
                    </AdminCard>
                  );
                })}

                {filteredProfessors.map((teacher) => (
                  <AdminCard key={teacher.userId} style={styles.studentCard}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {initials(teacher.name || teacher.email || "Professor")}
                      </Text>
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.name}>
                        {teacher.name || "Professor sem nome"}
                      </Text>
                      <Text style={styles.secondary}>
                        {teacher.email || "Sem e-mail"}
                      </Text>
                      <View style={styles.pills}>
                        <Pill
                          label={teacher.role || "Professor"}
                          tone={teacher.role === "Admin" ? "warning" : "primary"}
                        />
                        <Pill label="Ativo" tone="success" />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.deleteTeacherButton,
                        removingTeacherId !== null && styles.disabled,
                      ]}
                      onPress={() => handleDeleteTeacher(teacher)}
                      disabled={removingTeacherId !== null}
                      accessibilityRole="button"
                      accessibilityLabel="Desvincular professor"
                    >
                      {removingTeacherId === teacher.userId ? (
                        <ActivityIndicator size="small" color={COLORS.destructive} />
                      ) : (
                        <Trash2 size={18} color={COLORS.destructive} />
                      )}
                    </TouchableOpacity>
                  </AdminCard>
                ))}
              </>
            )}
          </View>
          ) : (
          <>
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
              label="Convidar"
              icon={<Plus size={15} color="#fff" />}
              onPress={() => setInviting(true)}
            />
          </View>
          <TouchableOpacity
            style={[styles.filterTrigger, activeFilterCount > 0 && styles.filterTriggerActive]}
            onPress={openFilters}
            accessibilityRole="button"
            accessibilityLabel={activeFilterCount > 0 ? `Abrir filtros, ${activeFilterCount} ativo${activeFilterCount === 1 ? "" : "s"}` : "Abrir filtros"}
          >
            <SlidersHorizontal size={17} color={COLORS.mainOrange} />
            <Text style={styles.filterTriggerText}>Filtros</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View>
            )}
          </TouchableOpacity>
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
          </>
          )}
        </AdminScreen>
      </RefreshableScrollView>
      <StudentModal
        id={selectedId}
        initialMethods={selectedMethods}
        onClose={() => setSelectedId(null)}
      />
      <InviteModal
        visible={inviting}
        onClose={() => setInviting(false)}
        role="Aluno"
      />
      <InviteModal
        visible={invitingTeacher}
        onClose={() => setInvitingTeacher(false)}
        role="Professor"
        onSuccess={() => {
          refetchProfessors();
          refetchTeacherInvitations();
        }}
      />
      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.filterOverlay}>
          <TouchableOpacity style={styles.filterDismiss} activeOpacity={1} onPress={() => setFiltersOpen(false)} accessibilityLabel="Fechar filtros" />
          <View style={[styles.filterSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filtrar alunos</Text>
              <TouchableOpacity onPress={() => setFiltersOpen(false)} accessibilityRole="button" accessibilityLabel="Fechar filtros" style={styles.filterClose}>
                <X size={20} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterSheetScroll} contentContainerStyle={styles.filterSheetContent} showsVerticalScrollIndicator={false}>
              <Filter label="Status" options={[ALL, ...statuses]} selected={draftStatus} onSelect={setDraftStatus} />
              <Filter label="Nível" options={[ALL, ...levels]} selected={draftLevel} onSelect={setDraftLevel} />
              <Filter label="Pagamento" options={[ALL, ...paymentMethods]} selected={draftPayment} onSelect={setDraftPayment} />
            </ScrollView>
            <View style={styles.filterSheetActions}>
              <TouchableOpacity style={styles.clearFilters} onPress={() => { setDraftStatus(""); setDraftLevel(""); setDraftPayment(""); }} accessibilityRole="button">
                <Text style={styles.clearFiltersText}>Limpar</Text>
              </TouchableOpacity>
              <ActionButton label="Aplicar filtros" onPress={applyFilters} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Filter({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Option[];
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
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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

type StudentTab = "plan" | "details" | "history";

function StudentModal({
  id,
  initialMethods,
  onClose,
}: {
  id: string | null;
  initialMethods: string[];
  onClose: () => void;
}) {
  const modalRefresh = useScreenRefresh(
    [["aluno", id], ["aluno-history", id], ["plans", "list"]],
    { enabled: !!id },
  );
  const { toast } = useToast();
  const { aluno, history, isLoading, historyLoading, hasError } =
    useAlunoDetails(id);
  const {
    updateAluno,
    updateLevel,
    updateStatus,
    updatePaymentMethods,
    deleteAluno,
    isDeleting,
    isSaving,
  } = useAlunoActions();
  const { plans, isLoading: plansLoading } = usePlans();
  const { createContract, isLoading: isCreatingContract } = useCreateContract();

  const [activeTab, setActiveTab] = useState<StudentTab>("plan");

  const [form, setFormState] = useState<AlunoType | null>(null);
  const formDirty = useRef(false);
  const setForm = (value: Parameters<typeof setFormState>[0]) => {
    formDirty.current = true;
    setFormState(value);
  };
  const [methods, setMethods] = useState<string[]>([]);
  const [planId, setPlanId] = useState("");
  const [startDate, setStartDate] = useState(todayInput);
  const [isPaidLocally, setIsPaidLocally] = useState(false);
  const [contractError, setContractError] = useState("");
  const [showChangePlan, setShowChangePlan] = useState(false);
  const hasActivePlan = Boolean(aluno?.planoName);

  useEffect(() => {
    formDirty.current = false;
    setShowChangePlan(false);
    setActiveTab("plan");
  }, [id]);

  useEffect(() => {
    if (aluno && !formDirty.current) {
      setFormState({ ...aluno, birthDate: toDateInput(aluno.birthDate) });
    }
  }, [aluno]);

  useEffect(() => {
    setMethods(initialMethods);
  }, [id, initialMethods]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    const prevStatus = form?.status;
    setForm((prev) => (prev ? { ...prev, status: newStatus } : null));
    try {
      await updateStatus({ id, value: newStatus });
      toast({ title: `Status alterado para ${newStatus}` });
    } catch (requestError) {
      setForm((prev) => (prev ? { ...prev, status: prevStatus ?? null } : null));
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível atualizar o status.",
        ).description,
        variant: "destructive",
      });
    }
  };

  const handleTogglePaymentMethod = async (methodValue: string) => {
    if (!id) return;
    const prevMethods = methods;
    const nextMethods = methods.includes(methodValue)
      ? methods.filter((item) => item !== methodValue)
      : [...methods, methodValue];
    setMethods(nextMethods);
    try {
      await updatePaymentMethods({
        id,
        data: { paymentMethods: nextMethods, partnerNote: null },
      });
      toast({ title: "Métodos de pagamento atualizados" });
    } catch (requestError) {
      setMethods(prevMethods);
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível atualizar os métodos.",
        ).description,
        variant: "destructive",
      });
    }
  };

  const saveDetails = async () => {
    if (!id || !form) return;
    const birthDate = toIsoDate(form.birthDate ?? "");
    if (form.birthDate && !birthDate) {
      toast({
        title: "Informe a data de nascimento no formato DD/MM/AAAA.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateAluno({
        id,
        data: {
          cpf: form.cpf,
          birthDate,
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
      formDirty.current = false;
      toast({ title: "Dados cadastrais atualizados com sucesso!" });
      onClose();
    } catch (requestError) {
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível atualizar os dados cadastrais.",
        ).description,
        variant: "destructive",
      });
    }
  };

  const createPlanContract = async () => {
    if (!id) return;
    const startDateIso = toIsoDate(startDate);
    if (!planId || !startDateIso) {
      setContractError(
        !planId
          ? "Selecione um plano para o aluno."
          : "Informe a data de início no formato DD/MM/AAAA.",
      );
      return;
    }
    try {
      await createContract({
        alunoId: id,
        planoId: planId,
        startDate: startDateIso,
        cancelExistingActive: true,
        immediate: true,
        endDate: null,
        autoRenew: false,
        priceOverride: null,
        discountPct: null,
        notes: null,
        isPaidLocally,
      });
      setPlanId("");
      setContractError("");
      setShowChangePlan(false);
      onClose();
      toast({
        title: hasActivePlan
          ? "Plano alterado com sucesso!"
          : "Plano vinculado ao aluno!",
      });
    } catch (requestError) {
      onClose();
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível vincular o plano.",
        ).description,
        variant: "destructive",
      });
    }
  };

  const handleDeleteAluno = () => {
    if (!id || !aluno) return;
    Alert.alert(
      "Desvincular aluno do CT",
      `Tem certeza que deseja desvincular ${aluno.userName || "este aluno"} do CT?\n\nIsso cancelará o contrato ativo e assinaturas recorrentes associadas, além de liberar reservas futuras.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sim, desvincular",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAluno(id);
              toast({ title: "Aluno desvinculado com sucesso." });
              onClose();
            } catch (error) {
              const errInfo = normalizeApiError(
                error,
                "Não foi possível desvincular o aluno.",
              );
              toast({
                title: "Não foi possível desvincular o aluno",
                description: errInfo.description,
                variant: "destructive",
              });
            }
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={!!id}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader
            title={aluno?.userName || "Detalhes do aluno"}
            onClose={onClose}
          />

          <View style={styles.modalTabs}>
            <TouchableOpacity
              style={[
                styles.modalTab,
                activeTab === "plan" && styles.modalTabActive,
              ]}
              onPress={() => setActiveTab("plan")}
              activeOpacity={0.7}
            >
              <CreditCard
                size={14}
                color={
                  activeTab === "plan"
                    ? COLORS.mainOrange
                    : COLORS.mutedForeground
                }
              />
              <Text
                style={[
                  styles.modalTabText,
                  activeTab === "plan" && styles.modalTabTextActive,
                ]}
              >
                Plano & Acesso
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalTab,
                activeTab === "details" && styles.modalTabActive,
              ]}
              onPress={() => setActiveTab("details")}
              activeOpacity={0.7}
            >
              <User
                size={14}
                color={
                  activeTab === "details"
                    ? COLORS.mainOrange
                    : COLORS.mutedForeground
                }
              />
              <Text
                style={[
                  styles.modalTabText,
                  activeTab === "details" && styles.modalTabTextActive,
                ]}
              >
                Cadastro
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalTab,
                activeTab === "history" && styles.modalTabActive,
              ]}
              onPress={() => setActiveTab("history")}
              activeOpacity={0.7}
            >
              <Clock
                size={14}
                color={
                  activeTab === "history"
                    ? COLORS.mainOrange
                    : COLORS.mutedForeground
                }
              />
              <Text
                style={[
                  styles.modalTabText,
                  activeTab === "history" && styles.modalTabTextActive,
                ]}
              >
                Histórico
              </Text>
            </TouchableOpacity>
          </View>

          <RefreshableScrollView
            {...modalRefresh}
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
                {/* ABA 1: PLANO & ACESSO */}
                {activeTab === "plan" && (
                  <>
                    {hasActivePlan ? (
                      <View style={styles.activePlanCard}>
                        <View style={styles.activePlanHeader}>
                          <View style={styles.activePlanTitleGroup}>
                            <CreditCard size={15} color={COLORS.mainOrange} />
                            <Text style={styles.activePlanLabel}>
                              PLANO ATIVO
                            </Text>
                          </View>
                          <Pill label="Ativo" tone="success" />
                        </View>

                        <Text style={styles.activePlanName}>
                          {aluno?.planoName}
                        </Text>

                        {(aluno?.contratoStartDate ||
                          aluno?.contratoEndDate) && (
                          <View style={styles.activePlanDatesRow}>
                            <Calendar
                              size={13}
                              color={COLORS.mutedForeground}
                            />
                            <Text style={styles.activePlanDatesText}>
                              {aluno.contratoStartDate
                                ? `Início: ${toDateInput(aluno.contratoStartDate)}`
                                : ""}
                              {aluno.contratoStartDate &&
                              aluno.contratoEndDate
                                ? " · "
                                : ""}
                              {aluno.contratoEndDate
                                ? `Válido até: ${toDateInput(aluno.contratoEndDate)}`
                                : "Sem data final"}
                            </Text>
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.changePlanToggleBtn}
                          onPress={() => {
                            setShowChangePlan((prev) => !prev);
                            setContractError("");
                          }}
                          activeOpacity={0.7}
                        >
                          <RotateCcw size={13} color={COLORS.mainOrange} />
                          <Text style={styles.changePlanToggleText}>
                            {showChangePlan
                              ? "Cancelar alteração de plano"
                              : "Alterar ou renovar plano"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.noPlanCard}>
                        <View style={styles.noPlanHeader}>
                          <View style={styles.activePlanTitleGroup}>
                            <CreditCard size={15} color="#9CA3AF" />
                            <Text style={styles.noPlanLabel}>
                              SITUAÇÃO DE MATRÍCULA
                            </Text>
                          </View>
                          <Pill label="Sem plano" tone="neutral" />
                        </View>
                        <Text style={styles.noPlanMessage}>
                          Este aluno ainda não possui nenhum plano ativo
                          vinculado.
                        </Text>
                      </View>
                    )}

                    {(!hasActivePlan || showChangePlan) && (
                      <View style={styles.planFormContainer}>
                        <Text style={styles.sectionTitle}>
                          {hasActivePlan
                            ? "Vincular novo plano"
                            : "Vincular plano"}
                        </Text>
                        <Text style={styles.secondary}>
                          {hasActivePlan
                            ? "Selecione o plano que substituirá o contrato atual deste aluno."
                            : "Selecione o plano que será ativado para este aluno."}
                        </Text>
                        {contractError ? (
                          <Text style={styles.fieldError}>
                            {contractError}
                          </Text>
                        ) : null}
                        {plansLoading ? (
                          <AdminSkeleton height={54} />
                        ) : (
                          <View style={styles.choiceRow}>
                            {(plans ?? []).map((plan) => {
                              const selected = planId === plan.id;
                              return (
                                <TouchableOpacity
                                  key={plan.id}
                                  onPress={() => {
                                    setPlanId(plan.id);
                                    setContractError("");
                                  }}
                                  style={[
                                    styles.choice,
                                    selected && styles.choiceActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.choiceText,
                                      selected && styles.choiceTextActive,
                                    ]}
                                  >
                                    {plan.name}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        )}
                        <Field
                          label="Data de início *"
                          value={startDate}
                          placeholder="DD/MM/AAAA"
                          keyboardType="number-pad"
                          mask={maskDate}
                          onChange={(value) => {
                            setStartDate(value);
                            setContractError("");
                          }}
                        />
                        <View style={styles.switchRow}>
                          <View style={styles.grow}>
                            <Text style={styles.fieldLabel}>
                              Pagamento realizado no local
                            </Text>
                            <Text style={styles.secondary}>
                              Marca a primeira cobrança como paga.
                            </Text>
                          </View>
                          <Switch
                            value={isPaidLocally}
                            onValueChange={setIsPaidLocally}
                            trackColor={{ true: COLORS.mainOrange }}
                          />
                        </View>
                        <ActionButton
                          label={
                            isCreatingContract
                              ? "Vinculando..."
                              : hasActivePlan
                                ? "Confirmar alteração de plano"
                                : "Vincular plano"
                          }
                          onPress={createPlanContract}
                        />
                      </View>
                    )}

                    <View style={styles.tabSection}>
                      <Text style={styles.sectionTitle}>Status do aluno</Text>
                      <Text style={styles.secondary}>
                        Define se o aluno possui acesso liberado ao CT e às
                        aulas. Toque para alterar.
                      </Text>
                      <View style={styles.choiceRow}>
                        {statuses.map((opt) => {
                          const selected = form.status === opt.value;
                          return (
                            <TouchableOpacity
                              key={opt.value}
                              onPress={() => handleStatusChange(opt.value)}
                              style={[
                                styles.choice,
                                selected && styles.choiceActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  selected && styles.choiceTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.tabSection}>
                      <Text style={styles.sectionTitle}>
                        Métodos de pagamento aceitos
                      </Text>
                      <Text style={styles.secondary}>
                        Formas autorizadas para este aluno. Toque para
                        ativar ou desativar.
                      </Text>
                      <View style={styles.choiceRow}>
                        {paymentMethods.map((method) => {
                          const active = methods.includes(method.value);
                          return (
                            <TouchableOpacity
                              key={method.value}
                              onPress={() =>
                                handleTogglePaymentMethod(method.value)
                              }
                              style={[
                                styles.choice,
                                active && styles.choiceActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  active && styles.choiceTextActive,
                                ]}
                              >
                                {method.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  </>
                )}

                {/* ABA 2: CADASTRO */}
                {activeTab === "details" && (
                  <>
                    <View style={styles.cardSection}>
                      <Text style={styles.groupHeader}>
                        Dados Pessoais & Perfil
                      </Text>
                      <Field
                        label="Telefone"
                        value={form.phone ?? ""}
                        placeholder="(19) 99999-9999"
                        keyboardType="number-pad"
                        mask={maskPhone}
                        onChange={(value) =>
                          setForm({ ...form, phone: nullable(value) })
                        }
                      />
                      <Field
                        label="CPF"
                        value={form.cpf ?? ""}
                        placeholder="000.000.000-00"
                        keyboardType="number-pad"
                        mask={maskCpf}
                        onChange={(value) =>
                          setForm({ ...form, cpf: nullable(value) })
                        }
                      />
                      <Field
                        label="Data de nascimento"
                        value={form.birthDate ?? ""}
                        placeholder="DD/MM/AAAA"
                        keyboardType="number-pad"
                        mask={maskDate}
                        onChange={(value) =>
                          setForm({ ...form, birthDate: nullable(value) })
                        }
                      />
                      <Choice
                        label="Sexo"
                        options={sexes}
                        selected={form.sex}
                        onSelect={(value) => setForm({ ...form, sex: value })}
                      />
                      <Choice
                        label="Nível"
                        options={levels}
                        selected={form.level}
                        onSelect={(value) => setForm({ ...form, level: value })}
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
                    </View>

                    <View style={[styles.cardSection, styles.emergencyCard]}>
                      <View style={styles.emergencyHeader}>
                        <AlertTriangle size={16} color="#D97706" />
                        <Text style={styles.emergencyTitle}>
                          Saúde & Emergência
                        </Text>
                      </View>
                      <Field
                        label="Contato de emergência"
                        value={form.emergencyContact ?? ""}
                        placeholder="Nome do contato (ex: Mãe, Cônjuge)"
                        onChange={(value) =>
                          setForm({
                            ...form,
                            emergencyContact: nullable(value),
                          })
                        }
                      />
                      <Field
                        label="Telefone de emergência"
                        value={form.emergencyPhone ?? ""}
                        placeholder="(19) 99999-9999"
                        keyboardType="number-pad"
                        mask={maskPhone}
                        onChange={(value) =>
                          setForm({
                            ...form,
                            emergencyPhone: nullable(value),
                          })
                        }
                      />
                      <Field
                        label="Observações médicas"
                        value={form.medicalNotes ?? ""}
                        placeholder="Alergias, lesões, cirurgias ou restrições..."
                        multiline
                        onChange={(value) =>
                          setForm({ ...form, medicalNotes: nullable(value) })
                        }
                      />
                    </View>

                    <ActionButton
                      label={
                        isSaving ? "Salvando..." : "Salvar dados cadastrais"
                      }
                      icon={<Check size={15} color="#fff" />}
                      onPress={saveDetails}
                    />

                    <View style={styles.dangerZone}>
                      <Text style={styles.dangerZoneTitle}>Zona de perigo</Text>
                      <Text style={styles.dangerZoneDescription}>
                        Desvincular o aluno removerá seu acesso a este CT,
                        cancelará contratos ativos e assinaturas no gateway,
                        além de liberar futuras reservas.
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.deleteStudentButton,
                          isDeleting && styles.disabled,
                        ]}
                        onPress={handleDeleteAluno}
                        disabled={isDeleting}
                        accessibilityRole="button"
                        accessibilityLabel="Desvincular aluno do CT"
                      >
                        <Trash2 size={16} color={COLORS.destructive} />
                        <Text style={styles.deleteStudentButtonText}>
                          {isDeleting
                            ? "Desvinculando..."
                            : "Desvincular aluno do CT"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* ABA 3: HISTÓRICO */}
                {activeTab === "history" && (
                  <View style={styles.historyContainer}>
                    <Text style={styles.sectionTitle}>
                      Histórico de check-ins
                    </Text>
                    <Text style={styles.secondary}>
                      Presenças registradas nas aulas e turmas deste CT.
                    </Text>
                    {historyLoading ? (
                      <AdminSkeleton height={140} radius={8} />
                    ) : (history?.attendances ?? []).length === 0 ? (
                      <View style={styles.emptyHistoryBox}>
                        <Clock size={36} color="#D1D5DB" />
                        <Text style={styles.empty}>
                          Nenhum check-in registrado para este aluno.
                        </Text>
                      </View>
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
                          <Pill
                            label={item.method || "Check-in"}
                            tone="success"
                          />
                        </View>
                      ))
                    )}
                  </View>
                )}
              </>
            )}
          </RefreshableScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function InviteModal({
  visible,
  onClose,
  role = "Aluno",
  onSuccess,
}: {
  visible: boolean;
  onClose: () => void;
  role?: "Aluno" | "Professor";
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { createInvitation, isLoading } = useCreateInvitation();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const isTeacher = role === "Professor";

  const submit = async () => {
    if (isLoading) return;
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setEmailError("Informe um e-mail.");
      return;
    }
    const invitation = createInvitationSchema.safeParse({
      email: cleanEmail,
      role: role || "Aluno",
    });
    if (!invitation.success) {
      const emailIssue = invitation.error.issues.find((i) =>
        i.path.includes("email")
      );
      setEmailError(emailIssue?.message || "Informe um e-mail válido.");
      return;
    }
    setEmailError("");
    try {
      await createInvitation(invitation.data);
      setEmail("");
      onClose();
      toast({
        title: isTeacher
          ? "Convite enviado ao professor!"
          : "Convite enviado ao aluno!",
      });
      onSuccess?.();
    } catch (requestError) {
      const errInfo = normalizeApiError(
        requestError,
        "Não foi possível enviar o convite.",
      );
      setEmailError(errInfo.description);
      toast({
        title: "Não foi possível enviar o convite",
        description: errInfo.description,
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
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader
            title={isTeacher ? "Convidar professor" : "Convidar aluno"}
            onClose={onClose}
          />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <Field
              label={isTeacher ? "E-mail do professor *" : "E-mail do aluno *"}
              value={email}
              onChange={(value) => {
                setEmail(value);
                setEmailError("");
              }}
              placeholder={
                isTeacher ? "professor@exemplo.com" : "aluno@exemplo.com"
              }
              keyboardType="email-address"
              autoCapitalize="none"
              error={emailError}
            />
            <ActionButton
              label={isLoading ? "Enviando..." : "Enviar convite"}
              onPress={submit}
            />
          </ScrollView>
        </View>
      </KeyboardAvoider>
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
  error,
  mask,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  mask?: (value: string) => string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={mask ? (next) => onChange(mask(next)) : onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[
          styles.input,
          multiline && styles.textarea,
          error && styles.inputError,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}
function Choice({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Option[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              style={[styles.choice, active && styles.choiceActive]}
            >
              <Text
                style={[styles.choiceText, active && styles.choiceTextActive]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  pageNavigation: { paddingHorizontal: 20, paddingTop: 18, gap: 16 },
  contentScroll: { flex: 1 },
  internalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E8EB",
  },
  internalTab: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  internalTabActive: { borderBottomColor: COLORS.mainOrange },
  internalTabText: { color: COLORS.mutedForeground, fontSize: 13, fontWeight: "700" },
  internalTabTextActive: { color: COLORS.mainOrange, fontWeight: "800" },
  requestCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: "#FFF0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  requestCountText: { color: COLORS.mainOrange, fontSize: 11, fontWeight: "800" },
  grow: { flex: 1, minWidth: 0 },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterTrigger: {
    alignSelf: "flex-start",
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E7E8EB",
    borderRadius: 9,
  },
  filterTriggerActive: { borderColor: "#F1B68F", backgroundColor: "#FFF7F1" },
  filterTriggerText: { color: COLORS.mainOrange, fontSize: 13, fontWeight: "700" },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: { color: COLORS.white, fontSize: 11, fontWeight: "800" },
  filterOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "flex-end" },
  filterDismiss: { flex: 1 },
  filterSheet: {
    maxHeight: "85%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  filterSheetHeader: {
    minHeight: 58,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterSheetTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  filterClose: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  filterSheetScroll: { flexGrow: 0 },
  filterSheetContent: { paddingHorizontal: 20, paddingVertical: 12, gap: 22 },
  filterSheetActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
  },
  clearFilters: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  clearFiltersText: { color: COLORS.mainOrange, fontSize: 13, fontWeight: "700" },
  searchBox: {
    flex: 1,
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 10,
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
    borderRadius: 14,
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
  name: { color: COLORS.foreground, fontSize: 15, fontWeight: "800" },
  secondary: { color: COLORS.mutedForeground, fontSize: 11, lineHeight: 16 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginVertical: 5 },
  joinRequestsSection: { gap: 10 },
  requestTitle: { color: COLORS.foreground, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  joinRequestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  joinRequestCard: {
    borderRadius: 14,
    gap: 12,
  },
  joinRequestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  joinRequestFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F2F4",
  },
  joinRequestApproveBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    backgroundColor: COLORS.mainOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  joinRequestApproveText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  joinRequestRejectBtn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  joinRequestRejectText: {
    color: COLORS.destructive,
    fontSize: 13,
    fontWeight: "700",
  },
  planReference: {
    color: COLORS.mainOrange,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  rejectButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  rejectButtonText: {
    color: COLORS.destructive,
    fontSize: 12,
    fontWeight: "700",
  },
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
  modalTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  modalContent: { padding: 16, gap: 14, paddingBottom: 36 },
  field: { gap: 6 },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: COLORS.foreground,
    backgroundColor: "#fff",
  },
  inputError: { borderColor: COLORS.destructive },
  fieldError: { color: COLORS.destructive, fontSize: 11, fontWeight: "600" },
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
    backgroundColor: "#F7F8FA",
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
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
  },
  deleteTeacherButton: {
    padding: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerZone: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fee2e2",
    backgroundColor: "#fef2f2",
    gap: 8,
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.destructive,
  },
  dangerZoneDescription: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },
  deleteStudentButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.destructive,
    backgroundColor: "#fff",
  },
  deleteStudentButtonText: {
    color: COLORS.destructive,
    fontSize: 13,
    fontWeight: "600",
  },
  activePlanCard: {
    backgroundColor: "#FFFBF7",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#FED7AA",
    gap: 8,
    marginBottom: 4,
  },
  activePlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activePlanTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activePlanLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.mainOrange,
    letterSpacing: 0.5,
  },
  activePlanName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  activePlanDatesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activePlanDatesText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    fontWeight: "600",
  },
  changePlanToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FFF2E9",
  },
  changePlanToggleText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.mainOrange,
  },
  noPlanCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
    marginBottom: 4,
  },
  noPlanHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noPlanLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#6B7280",
    letterSpacing: 0.5,
  },
  noPlanMessage: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  planFormContainer: {
    gap: 12,
    paddingTop: 4,
  },
  modalTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "#FAFBFB",
  },
  modalTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  modalTabActive: {
    borderBottomColor: COLORS.mainOrange,
    backgroundColor: "#fff",
  },
  modalTabText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.mutedForeground,
  },
  modalTabTextActive: {
    color: COLORS.mainOrange,
  },
  tabSection: {
    gap: 8,
  },
  cardSection: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    padding: 14,
    gap: 12,
  },
  groupHeader: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  emergencyCard: {
    backgroundColor: "#FFFDF5",
    borderColor: "#FDE68A",
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: -0.2,
  },
  historyContainer: {
    gap: 8,
  },
  emptyHistoryBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    gap: 10,
  },
});

/* Plano e modalidades não possuem escrita nas rotas de alunos. */

