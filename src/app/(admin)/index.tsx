import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
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
  useAdminDashboard,
  usePartnerRequestActions,
} from "@/hooks/dashboard.hooks";
import { useTodayOccurrences } from "@/hooks/schedule.hooks";
import { endOfMonth, format, parseISO, startOfMonth, subDays } from "date-fns";
import {
  AlertTriangle,
  Check,
  DollarSign,
  Eye,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatCurrency = (value?: number) =>
  value === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      }).format(value);

const getStatusTone = (status: string) => {
  if (status === "Em andamento") return "success" as const;
  if (status === "Encerrada" || status === "Concluida")
    return "neutral" as const;
  return "info" as const;
};

const RequestSkeleton = () => (
  <View style={styles.listItem}>
    <AdminSkeleton width="48%" height={15} />
    <AdminSkeleton width="34%" height={11} />
    <View style={styles.actions}>
      <AdminSkeleton width={88} height={36} radius={10} />
      <AdminSkeleton width={88} height={36} radius={10} />
    </View>
  </View>
);

const ClassSkeleton = () => (
  <View style={styles.classRow}>
    <View style={styles.spaceBetween}>
      <AdminSkeleton width={55} height={22} />
      <AdminSkeleton width={76} height={22} radius={99} />
    </View>
    <AdminSkeleton width="62%" height={14} />
    <View style={styles.progressRow}>
      <AdminSkeleton width="auto" height={7} radius={99} style={styles.grow} />
      <AdminSkeleton width={34} height={12} />
    </View>
  </View>
);

const StudentSkeleton = () => (
  <View style={styles.studentRow}>
    <AdminSkeleton width={36} height={36} radius={18} />
    <View style={[styles.grow, styles.skeletonTextGroup]}>
      <AdminSkeleton width="52%" height={14} />
      <AdminSkeleton width="82%" height={11} />
    </View>
    <AdminSkeleton width={58} height={36} radius={10} />
  </View>
);

export default function AdminDashboard() {
  const refresh = useScreenRefresh([["admin-active-students"], ["admin-financial-dashboard"], ["admin-operational-dashboard"], ["admin-daily-attendance"], ["admin-students-at-risk"], ["admin-partner-requests"], ["today-occurrences"]]);
  const { toast } = useToast();
  const monthRange = useMemo(() => {
    const today = new Date();
    return {
      startDate: format(startOfMonth(today), "yyyy-MM-dd"),
      endDate: format(endOfMonth(today), "yyyy-MM-dd"),
    };
  }, []);
  const attendanceRange = useMemo(() => {
    const today = new Date();
    return {
      startDate: format(subDays(today, 27), "yyyy-MM-dd"),
      endDate: format(today, "yyyy-MM-dd"),
    };
  }, []);
  const {
    activeStudents,
    financial,
    operational,
    dailyAttendance,
    studentsAtRisk,
    partnerRequests,
    loading,
    hasError,
  } = useAdminDashboard(
    monthRange.startDate,
    monthRange.endDate,
    attendanceRange.startDate,
    attendanceRange.endDate,
  );
  const { todayOccurrences, isLoading: isLoadingOccurrences } =
    useTodayOccurrences();
  const {
    approvePartnerRequest,
    rejectPartnerRequest,
    isLoading: isUpdatingRequest,
  } = usePartnerRequestActions();

  const attendanceRate = operational
    ? Math.max(0, Math.min(100, 100 - operational.noShowRate))
    : undefined;
  const kpis = [
    {
      label: "Alunos ativos",
      value: activeStudents?.activeStudentsCount.toString() ?? "—",
      Icon: Users,
      color: COLORS.mainOrange,
      isLoading: loading.activeStudents,
    },
    {
      label: "Receita recorrente/mês",
      value: formatCurrency(financial?.mrr),
      Icon: DollarSign,
      color: COLORS.mainOrange,
      isLoading: loading.financial,
    },
    {
      label: "Inadimplência",
      value:
        financial === undefined
          ? "—"
          : `${financial.delinquencyPercentage.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      Icon: AlertTriangle,
      color: COLORS.destructive,
      isLoading: loading.financial,
    },
    {
      label: "Taxa de presença no mês",
      value:
        attendanceRate === undefined
          ? "—"
          : `${attendanceRate.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`,
      Icon: TrendingUp,
      color: COLORS.mainOrange,
      isLoading: loading.operational,
    },
  ];
  const maxAttendance = Math.max(
    1,
    ...dailyAttendance.map((item) => item.checkInCount),
  );

  const handleApprove = async (
    id: string,
    student: string,
    partner: string,
  ) => {
    try {
      await approvePartnerRequest(id);
      toast({
        title: "Solicitação aprovada!",
        description: `${student} agora é ${partner}.`,
      });
    } catch {
      toast({
        title: "Não foi possível aprovar a solicitação",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectPartnerRequest({ id });
      toast({ title: "Solicitação recusada" });
    } catch {
      toast({
        title: "Não foi possível recusar a solicitação",
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ClientHeader />
      <RefreshableScrollView {...refresh} showsVerticalScrollIndicator={false}>
        <AdminScreen>
          <AdminPageHeader title="painel" subtitle="Visão geral do CT" />
          {hasError && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                Alguns dados não puderam ser atualizados. Tente novamente em
                instantes.
              </Text>
            </View>
          )}

          <View style={styles.kpiGrid}>
            {kpis.map(({ label, value, Icon, color, isLoading: isLoadingKpi }, index) => (
              <AdminCard
                key={label}
                style={[styles.kpiCard, index === 0 && styles.kpiFeatured]}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: index === 0 ? "#FFFFFF26" : `${color}18` }]}
                >
                  <Icon size={20} color={index === 0 ? COLORS.white : color} />
                </View>
                {isLoadingKpi ? (
                  <>
                    <AdminSkeleton width="62%" height={25} />
                    <AdminSkeleton width="78%" height={12} />
                  </>
                ) : (
                  <>
                    <Text style={[styles.kpiValue, index === 0 && styles.kpiFeaturedText]}>{value}</Text>
                    <Text style={[styles.muted, index === 0 && styles.kpiFeaturedText]}>{label}</Text>
                  </>
                )}
              </AdminCard>
            ))}
          </View>

          <AdminCard>
            <SectionTitle>Presenças por dia — últimas 4 semanas</SectionTitle>
            {loading.dailyAttendance ? (
              <AdminSkeleton width="100%" height={175} radius={12} />
            ) : dailyAttendance.length === 0 ? (
              <Text style={styles.emptyText}>Nenhuma presença no período.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chart}>
                  {dailyAttendance.map((item) => (
                    <View key={item.date} style={styles.barColumn}>
                      <Text style={styles.barValue}>{item.checkInCount}</Text>
                      <View
                        style={[
                          styles.bar,
                          {
                            height:
                              (130 * item.checkInCount) / maxAttendance,
                          },
                        ]}
                      />
                      <Text style={styles.muted}>
                        {format(parseISO(item.date), "dd/MM")}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </AdminCard>

          <AdminCard>
            <View style={styles.spaceBetween}>
              <SectionTitle>Solicitações pendentes</SectionTitle>
              {loading.partnerRequests ? (
                <AdminSkeleton width={24} height={24} radius={12} />
              ) : (
                <Pill label={`${partnerRequests.length}`} tone="danger" />
              )}
            </View>
            {loading.partnerRequests && (
              <>
                <RequestSkeleton />
                <RequestSkeleton />
              </>
            )}
            {!loading.partnerRequests && partnerRequests.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhuma solicitação pendente.
              </Text>
            )}
            {partnerRequests.map((request) => {
              const student = request.alunoName || "Aluno";
              const partner = request.partner || "Parceiro";
              return (
                <View key={request.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{student}</Text>
                  <Text style={styles.muted}>
                    {partner} ·{" "}
                    {format(new Date(request.createdAtUtc), "dd/MM/yyyy")}
                  </Text>
                  <View style={styles.actions}>
                    <ActionButton
                      label="Aprovar"
                      icon={<Check size={14} color="#fff" />}
                      onPress={() =>
                        handleApprove(request.id, student, partner)
                      }
                    />
                    <ActionButton
                      outline
                      label="Recusar"
                      icon={<X size={14} color={COLORS.destructive} />}
                      onPress={() => handleReject(request.id)}
                    />
                  </View>
                </View>
              );
            })}
            {isUpdatingRequest && (
              <AdminSkeleton width="42%" height={12} />
            )}
          </AdminCard>

          <AdminCard>
            <SectionTitle>Aulas de hoje</SectionTitle>
            {isLoadingOccurrences && (
              <>
                <ClassSkeleton />
                <ClassSkeleton />
                <ClassSkeleton />
              </>
            )}
            {!isLoadingOccurrences && (todayOccurrences?.length ?? 0) === 0 && (
              <Text style={styles.emptyText}>Nenhuma aula para hoje.</Text>
            )}
            {(todayOccurrences ?? []).map((item) => {
              const pct =
                item.maxCapacity > 0
                  ? (item.confirmedCount / item.maxCapacity) * 100
                  : 0;
              return (
                <View key={item.id} style={styles.classRow}>
                  <View style={styles.spaceBetween}>
                    <Text style={styles.time}>
                      {item.startTime.substring(0, 5)}
                    </Text>
                    <Pill
                      label={item.status}
                      tone={getStatusTone(item.status)}
                    />
                  </View>
                  <Text style={styles.itemTitle}>
                    {item.modalidadeName} · {item.professorName}
                  </Text>
                  <View style={styles.progressRow}>
                    <ProgressBar value={pct} />
                    <Text style={styles.progressText}>
                      {item.confirmedCount}/{item.maxCapacity}
                    </Text>
                  </View>
                </View>
              );
            })}
          </AdminCard>

          <AdminCard>
            <View style={styles.titleRow}>
              <AlertTriangle size={19} color={COLORS.warning} />
              <SectionTitle>Alunos em risco</SectionTitle>
            </View>
            {loading.studentsAtRisk && (
              <>
                <StudentSkeleton />
                <StudentSkeleton />
              </>
            )}
            {!loading.studentsAtRisk && studentsAtRisk.length === 0 && (
              <Text style={styles.emptyText}>
                Nenhum aluno em risco identificado.
              </Text>
            )}
            {studentsAtRisk.map((student) => {
              const name = student.alunoName || "Aluno";
              return (
                <View key={student.alunoId} style={styles.studentRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials(name)}</Text>
                  </View>
                  <View style={styles.grow}>
                    <Text style={styles.itemTitle}>{name}</Text>
                    <Text style={styles.muted} numberOfLines={2}>
                      {student.reasons?.join(" · ") ||
                        `Risco nível ${student.level || student.score}`}
                    </Text>
                  </View>
                  <ActionButton
                    outline
                    label="Ver"
                    icon={<Eye size={14} color={COLORS.foreground} />}
                    onPress={() =>
                      toast({
                        title: "Detalhes do aluno ainda não estão nesta tela",
                      })
                    }
                  />
                </View>
              );
            })}
          </AdminCard>
        </AdminScreen>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.white },
  errorBanner: { padding: 12, borderRadius: 12, backgroundColor: "#fee2e2" },
  errorText: { color: COLORS.destructive, fontSize: 12, fontWeight: "600" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "47.5%", minHeight: 138, justifyContent: "space-between" },
  kpiFeatured: { backgroundColor: COLORS.mainOrange, borderColor: COLORS.mainOrange },
  kpiFeaturedText: { color: COLORS.white },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: COLORS.foreground },
  muted: { fontSize: 12, color: COLORS.mutedForeground },
  emptyText: {
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  chart: {
    height: 175,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 12,
  },
  barColumn: {
    height: "100%",
    width: 44,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  bar: { width: 24, backgroundColor: COLORS.mainOrange, borderRadius: 6 },
  barValue: { fontSize: 10, color: COLORS.mutedForeground },
  spaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  listItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  itemTitle: { fontSize: 14, fontWeight: "700", color: COLORS.foreground },
  actions: { flexDirection: "row", gap: 8, marginTop: 8 },
  classRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 7,
  },
  time: { fontSize: 18, fontWeight: "800", color: COLORS.mainOrange },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  progressText: { fontSize: 12, fontWeight: "700", color: COLORS.foreground },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.warningSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 11, fontWeight: "800", color: COLORS.warning },
  grow: { flex: 1 },
  skeletonTextGroup: { gap: 7 },
});
