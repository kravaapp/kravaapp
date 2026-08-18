import {
  ActionButton,
  AdminCard,
  AdminScreen,
  Pill,
  ProgressBar,
  SectionTitle,
  initials,
} from "@/components/admin/AdminUi";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  adminClasses,
  adminRequests,
  atRiskStudents,
  attendanceByDay,
} from "@/data/adminMockData";
import {
  AlertTriangle,
  Check,
  DollarSign,
  Eye,
  TrendingUp,
  Users,
  X,
} from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const kpis = [
  {
    label: "Alunos ativos",
    value: "42",
    Icon: Users,
    color: COLORS.mainOrange,
  },
  {
    label: "Receita est./mês",
    value: "R$ 8.360",
    Icon: DollarSign,
    color: COLORS.primary,
  },
  {
    label: "Inadimplentes",
    value: "3",
    Icon: AlertTriangle,
    color: COLORS.destructive,
  },
  {
    label: "Taxa de presença",
    value: "87%",
    Icon: TrendingUp,
    color: COLORS.warning,
  },
];

export default function AdminDashboard() {
  const { toast } = useToast();
  const maxAttendance = Math.max(...attendanceByDay.map((item) => item.value));
  return (
    <SafeAreaView style={styles.safeArea}>
      <ClientHeader />
      <ScrollView showsVerticalScrollIndicator={false}>
        <AdminScreen>
          <View style={styles.kpiGrid}>
            {kpis.map(({ label, value, Icon, color }) => (
              <AdminCard
                key={label}
                style={[styles.kpiCard, { borderTopColor: color }]}
              >
                <View
                  style={[styles.iconBox, { backgroundColor: `${color}18` }]}
                >
                  <Icon size={20} color={color} />
                </View>
                <Text style={styles.kpiValue}>{value}</Text>
                <Text style={styles.muted}>{label}</Text>
              </AdminCard>
            ))}
          </View>
          <AdminCard>
            <SectionTitle>Presenças por dia — últimas 4 semanas</SectionTitle>
            <View style={styles.chart}>
              {attendanceByDay.map((item) => (
                <View key={item.day} style={styles.barColumn}>
                  <Text style={styles.barValue}>{item.value}</Text>
                  <View
                    style={[
                      styles.bar,
                      { height: (130 * item.value) / maxAttendance },
                    ]}
                  />
                  <Text style={styles.muted}>{item.day}</Text>
                </View>
              ))}
            </View>
          </AdminCard>
          <AdminCard>
            <View style={styles.spaceBetween}>
              <SectionTitle>Solicitações pendentes</SectionTitle>
              <Pill label={`${adminRequests.length}`} tone="danger" />
            </View>
            {adminRequests.map((request) => (
              <View key={request.id} style={styles.listItem}>
                <Text style={styles.itemTitle}>{request.student}</Text>
                <Text style={styles.muted}>
                  {request.partner} · {request.date}
                </Text>
                <View style={styles.actions}>
                  <ActionButton
                    label="Aprovar"
                    icon={<Check size={14} color="#fff" />}
                    onPress={() =>
                      toast({
                        title: "Solicitação aprovada!",
                        description: `${request.student} agora é ${request.partner}.`,
                      })
                    }
                  />
                  <ActionButton
                    outline
                    label="Recusar"
                    icon={<X size={14} color={COLORS.destructive} />}
                    onPress={() =>
                      toast({
                        title: "Solicitação recusada",
                        variant: "destructive",
                      })
                    }
                  />
                </View>
              </View>
            ))}
          </AdminCard>
          <AdminCard>
            <SectionTitle>Aulas de hoje</SectionTitle>
            {adminClasses.map((item) => {
              const pct = (item.confirmed / item.capacity) * 100;
              return (
                <View key={item.id} style={styles.classRow}>
                  <View style={styles.spaceBetween}>
                    <Text style={styles.time}>{item.time}</Text>
                    <Pill
                      label={item.status}
                      tone={
                        item.status === "Em andamento"
                          ? "success"
                          : item.status === "Encerrada"
                            ? "neutral"
                            : "info"
                      }
                    />
                  </View>
                  <Text style={styles.itemTitle}>
                    {item.modality} · {item.teacher}
                  </Text>
                  <View style={styles.progressRow}>
                    <ProgressBar value={pct} />
                    <Text style={styles.progressText}>
                      {item.confirmed}/{item.capacity}
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
            {atRiskStudents.map((student) => (
              <View key={student.id} style={styles.studentRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {initials(student.name)}
                  </Text>
                </View>
                <View style={styles.grow}>
                  <Text style={styles.itemTitle}>{student.name}</Text>
                  <Text style={styles.muted}>
                    {student.absences} faltas não canceladas
                  </Text>
                </View>
                <ActionButton
                  outline
                  label="Ver"
                  icon={<Eye size={14} color={COLORS.foreground} />}
                  onPress={() => toast({ title: "Perfil em modo mock" })}
                />
              </View>
            ))}
          </AdminCard>
        </AdminScreen>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpiCard: { width: "48%", borderTopWidth: 4 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  kpiValue: { fontSize: 22, fontWeight: "800", color: COLORS.foreground },
  muted: { fontSize: 12, color: COLORS.mutedForeground },
  chart: {
    height: 175,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingTop: 12,
  },
  barColumn: {
    height: "100%",
    flex: 1,
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
});
