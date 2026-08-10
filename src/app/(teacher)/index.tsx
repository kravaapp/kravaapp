import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { Progress } from "@/components/Progress";
import { BadgeStatus, StatusBadge } from "@/components/StatusBadge";
import { setPendingOcorrenciaId } from "@/hooks/attendanceSelection";
import { useAuth } from "@/hooks/auth.hooks";
import { useTeacherDashboard } from "@/hooks/dashboard.hooks";
import { useTodayOccurrences } from "@/hooks/schedule.hooks";
import { OccurrenceStatusType, TodayOccurrenceType } from "@/types/schedules.types";
import { router } from "expo-router";
import { AlertTriangle, Calendar, Clock, Users } from "lucide-react-native";
import { getTimeUntilClass } from "../(user)";

export const STATUS_BADGE: Record<OccurrenceStatusType, BadgeStatus> = {
    "Agendada": "agendada",
    "Em andamento": "em andamento",
    "Encerrada": "encerrada",
    "Concluida": "concluida",
};

const SIGLAS: Record<string, string> = {
    futevolei: "FV",
    funcional: "FC",
};

const getModalidadeSigla = (modalidadeName: string) => {
    const key = modalidadeName.trim().toLowerCase();
    return SIGLAS[key] || key.slice(0, 2).toUpperCase();
};

export const formatHora = (startTime: string) => {
    const [hora, minuto] = startTime.split(":");
    return minuto === "00" ? `${hora}h` : `${hora}:${minuto}`;
};

const SummaryCard = ({
    icon,
    value,
    label,
}: {
    icon: React.ReactNode;
    value: number;
    label: string;
}) => (
    <View style={[styles.card, styles.summaryCard]}>
        {icon}
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{label}</Text>
    </View>
);

const AulaItem = ({
    aula,
    isMinhaAula,
    onOpenAttendance,
}: {
    aula: TodayOccurrenceType;
    isMinhaAula: boolean;
    onOpenAttendance: () => void;
}) => (
    <View style={[styles.card, styles.aulaCard, !isMinhaAula && styles.aulaCardMuted]}>
        <View style={styles.aulaInfo}>
            <View style={styles.aulaTimeColumn}>
                <Text style={[styles.aulaTime, !isMinhaAula && styles.mutedText]}>
                    {aula.startTime.substring(0, 5)}
                </Text>
                <Text style={styles.aulaSigla}>{getModalidadeSigla(aula.modalidadeName)}</Text>
            </View>
            <View style={styles.aulaTextColumn}>
                <Text style={styles.aulaModalidade} numberOfLines={1}>
                    {aula.aulaName || aula.modalidadeName}
                </Text>
                <Text style={styles.aulaSubtitle} numberOfLines={1}>
                    {isMinhaAula
                        ? `${aula.confirmedCount}/${aula.maxCapacity} confirmados`
                        : `Prof. ${aula.professorName}`}
                </Text>
            </View>
        </View>

        <View style={styles.aulaActions}>
            <StatusBadge status={STATUS_BADGE[aula.status]} />
            {isMinhaAula &&
                (aula.status === "Agendada" || aula.status === "Em andamento") && (
                <TouchableOpacity
                    style={[
                        styles.smallButton,
                        aula.status === "Agendada"
                            ? styles.smallButtonSolid
                            : styles.smallButtonOutline,
                    ]}
                    onPress={onOpenAttendance}
                    activeOpacity={0.8}
                >
                    <Text
                        style={
                            aula.status === "Agendada"
                                ? styles.smallButtonSolidText
                                : styles.smallButtonOutlineText
                        }
                    >
                        Abrir chamada
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

const HomeSkeleton = () => (
    <View style={styles.skeletonContainer}>
        <View style={[styles.skeleton, { height: 192 }]} />
        <View style={styles.skeletonRow}>
            <View style={[styles.skeleton, styles.skeletonBox]} />
            <View style={[styles.skeleton, styles.skeletonBox]} />
            <View style={[styles.skeleton, styles.skeletonBox]} />
        </View>
        <View style={[styles.skeleton, { height: 96 }]} />
        <View style={[styles.skeleton, { height: 96 }]} />
    </View>
);

export default function TeacherHome() {
    const { user } = useAuth();
    const { todayOccurrences, isLoading: isLoadingOccurrences, error } = useTodayOccurrences();
    const { teacherDashboard, isLoading: isLoadingDashboard } = useTeacherDashboard();

    const isLoading = isLoadingOccurrences || isLoadingDashboard;

    const ocorrencias = todayOccurrences || [];
    const isMinhaAula = (aula: TodayOccurrenceType) => aula.professorName === user?.userName;

    const totalAulasHoje = teacherDashboard?.todayClassesCount ?? 0;
    const totalAlunosHoje = teacherDashboard?.todayStudentsCount ?? 0;
    const totalEspera = teacherDashboard?.todayWaitlistCount ?? 0;
    const proximaAula = teacherDashboard?.nextClass ?? null;

    const handleOpenAttendance = (ocorrenciaId?: string) => {
        if (ocorrenciaId) setPendingOcorrenciaId(ocorrenciaId);
        router.push("/(teacher)/classes");
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />

            {isLoading ? (
                <HomeSkeleton />
            ) : (
                <ScrollView
                    style={{ flex: 1, backgroundColor: "#fff" }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.navyBlock}>
                        <View style={styles.welcomeRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {getInitials(user?.userName || "")}
                                </Text>
                            </View>
                            <View>
                                <Text style={styles.welcomeTitle}>
                                    Olá, Prof. {user?.userName?.split(" ")[0] || ""} 👋
                                </Text>
                                <Text style={styles.welcomeSubtitle}>
                                    Futevôlei · {user?.tenantName}
                                </Text>
                            </View>
                        </View>

                        {proximaAula && (
                            <View style={styles.nextClassSection}>
                                <Text style={styles.nextClassLabel}>PRÓXIMA AULA</Text>
                                <Text style={styles.nextClassTitle}>
                                    {proximaAula.name} — hoje{" "}
                                    {proximaAula.startTime ? formatHora(proximaAula.startTime) : ""}
                                </Text>
                                <View style={styles.nextClassRow}>
                                    <Clock size={16} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.nextClassMuted}>
                                        Faltam{" "}
                                        {getTimeUntilClass(
                                            proximaAula.date?.split("T")[0] || "",
                                            proximaAula.startTime || ""
                                        )}
                                    </Text>
                                </View>
                                <Text style={styles.nextClassMuted}>
                                    {proximaAula.confirmedCount} confirmados ·{" "}
                                    {proximaAula.waitlistCount} na lista de espera
                                </Text>

                                <View style={styles.progressSection}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressLabel}>Capacidade</Text>
                                        <Text style={styles.progressLabel}>
                                            {proximaAula.confirmedCount}/{proximaAula.maxCapacity}
                                        </Text>
                                    </View>
                                    <Progress
                                        value={
                                            proximaAula.maxCapacity > 0
                                                ? (proximaAula.confirmedCount /
                                                    proximaAula.maxCapacity) * 100
                                                : 0
                                        }
                                        trackColor="rgba(255,255,255,0.1)"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => handleOpenAttendance(proximaAula.ocorrenciaId)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.primaryButtonText}>Abrir chamada</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={styles.content}>
                        <View style={styles.summaryRow}>
                            <SummaryCard
                                icon={<Calendar size={20} color={COLORS.mainOrange} />}
                                value={totalAulasHoje}
                                label="aulas hoje"
                            />
                            <SummaryCard
                                icon={<Users size={20} color={COLORS.mainOrange} />}
                                value={totalAlunosHoje}
                                label="alunos total"
                            />
                            <SummaryCard
                                icon={<Clock size={20} color={COLORS.warning} />}
                                value={totalEspera}
                                label="na espera"
                            />
                        </View>

                        <View>
                            <Text style={styles.sectionTitle}>SUAS AULAS HOJE</Text>
                            {error ? (
                                <View style={{ alignItems: "center", marginVertical: 20 }}>
                                    <Text style={{ color: "#ef4444" }}>Erro ao carregar aulas</Text>
                                    <Text style={{ color: "#6b7280", fontSize: 12 }}>{error}</Text>
                                </View>
                            ) : ocorrencias.length === 0 ? (
                                <View style={{ alignItems: "center", marginTop: 20 }}>
                                    <Text style={{ color: "#9ca3af" }}>
                                        Nenhuma aula agendada para hoje
                                    </Text>
                                </View>
                            ) : (
                                <View style={{ gap: 8 }}>
                                    {ocorrencias.map((aula) => (
                                        <AulaItem
                                            key={aula.id}
                                            aula={aula}
                                            isMinhaAula={isMinhaAula(aula)}
                                            onOpenAttendance={() => handleOpenAttendance(aula.id)}
                                        />
                                    ))}
                                </View>
                            )}
                        </View>

                        {totalEspera > 0 && proximaAula && (
                            <View style={[styles.card, styles.warningCard]}>
                                <AlertTriangle size={20} color={COLORS.warning} />
                                <Text style={styles.warningText}>
                                    <Text style={styles.warningTextStrong}>
                                        {totalEspera} alunos na lista de espera para as{" "}
                                        {proximaAula.startTime ? formatHora(proximaAula.startTime) : ""}
                                    </Text>
                                    <Text style={styles.mutedText}>
                                        {" "}
                                        — confirme presença para liberar vagas
                                    </Text>
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
    },
    navyBlock: {
        backgroundColor: COLORS.navy,
        padding: 20,
        paddingBottom: 24,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    welcomeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "rgba(233,90,7,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: COLORS.mainOrange,
        fontWeight: "700",
        fontSize: 14,
    },
    welcomeTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.navyForeground,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.6)",
    },
    nextClassSection: {
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
        paddingTop: 16,
    },
    nextClassLabel: {
        fontSize: 10,
        fontWeight: "600",
        color: "rgba(255,255,255,0.5)",
        letterSpacing: 1,
        marginBottom: 8,
    },
    nextClassTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.navyForeground,
    },
    nextClassRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    nextClassMuted: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        marginTop: 4,
    },
    progressSection: {
        marginTop: 12,
    },
    progressHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
    },
    primaryButton: {
        marginTop: 16,
        backgroundColor: COLORS.mainOrange,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    primaryButtonText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
    },
    summaryRow: {
        flexDirection: "row",
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        padding: 12,
        alignItems: "center",
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.foreground,
        marginTop: 4,
    },
    summaryLabel: {
        fontSize: 10,
        color: COLORS.mutedForeground,
    },
    sectionTitle: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        fontWeight: "500",
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    aulaCard: {
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    aulaCardMuted: {
        opacity: 0.5,
    },
    aulaInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
        minWidth: 0,
    },
    aulaTimeColumn: {
        alignItems: "center",
        width: 48,
        flexShrink: 0,
    },
    aulaTextColumn: {
        flex: 1,
        minWidth: 0,
    },
    aulaTime: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.mainOrange,
    },
    aulaSigla: {
        fontSize: 10,
        color: COLORS.mutedForeground,
    },
    aulaModalidade: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
    },
    aulaSubtitle: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    aulaActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
    },
    mutedText: {
        color: COLORS.mutedForeground,
    },
    smallButton: {
        height: 28,
        paddingHorizontal: 8,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    smallButtonSolid: {
        backgroundColor: COLORS.mainOrange,
    },
    smallButtonSolidText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
    smallButtonOutline: {
        borderWidth: 1,
        borderColor: COLORS.outline,
    },
    smallButtonOutlineText: {
        color: COLORS.foreground,
        fontSize: 12,
        fontWeight: "600",
    },
    warningCard: {
        padding: 16,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
        backgroundColor: COLORS.warningSurface,
    },
    warningText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.foreground,
    },
    warningTextStrong: {
        fontWeight: "500",
    },
    skeletonContainer: {
        padding: 16,
        gap: 12,
    },
    skeletonRow: {
        flexDirection: "row",
        gap: 12,
    },
    skeleton: {
        backgroundColor: "#e5e7eb",
        borderRadius: 12,
    },
    skeletonBox: {
        flex: 1,
        height: 80,
    },
});
