import { useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { aulasHoje, AulaHoje, PROFESSOR_ATUAL } from "@/data/mockData";
import { useAuth } from "@/hooks/auth.hooks";
import { AlertTriangle, Calendar, Clock, Users } from "lucide-react-native";

const aulasProfessor = aulasHoje.filter((a) => a.professor === PROFESSOR_ATUAL);
const proximaAula = aulasProfessor.find((a) => a.status === "agendada");

const getModalidadeSigla = (modalidade: AulaHoje["modalidade"]) =>
    modalidade === "Futevôlei" ? "FV" : "FC";

const Progress = ({ value }: { value: number }) => (
    <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${value}%` }]} />
    </View>
);

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
    onOpenAttendance,
}: {
    aula: AulaHoje;
    onOpenAttendance: () => void;
}) => {
    const isMinhaAula = aula.professor === PROFESSOR_ATUAL;

    return (
        <View style={[styles.card, styles.aulaCard, !isMinhaAula && styles.aulaCardMuted]}>
            <View style={styles.aulaInfo}>
                <View style={styles.aulaTimeColumn}>
                    <Text style={[styles.aulaTime, !isMinhaAula && styles.mutedText]}>
                        {aula.horario}
                    </Text>
                    <Text style={styles.aulaSigla}>{getModalidadeSigla(aula.modalidade)}</Text>
                </View>
                <View>
                    <Text style={styles.aulaModalidade}>{aula.modalidade}</Text>
                    <Text style={styles.aulaSubtitle}>
                        {isMinhaAula
                            ? `${aula.confirmados}/${aula.capacidade} confirmados`
                            : `Prof. ${aula.professor}`}
                    </Text>
                </View>
            </View>

            <View style={styles.aulaActions}>
                <StatusBadge status={aula.status} />
                {isMinhaAula && aula.status !== "encerrada" && (
                    <TouchableOpacity
                        style={[
                            styles.smallButton,
                            aula.status === "agendada"
                                ? styles.smallButtonSolid
                                : styles.smallButtonOutline,
                        ]}
                        onPress={onOpenAttendance}
                        activeOpacity={0.8}
                    >
                        <Text
                            style={
                                aula.status === "agendada"
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
};

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timeout = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timeout);
    }, []);

    const totalAlunosHoje = aulasProfessor.reduce((sum, a) => sum + a.confirmados, 0);
    const totalEspera = aulasProfessor.reduce((sum, a) => sum + a.espera, 0);

    // TODO: apontar para a tela de aula ao vivo quando ela existir.
    const handleOpenAttendance = () => {};

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />

            {loading ? (
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
                                    {proximaAula.modalidade} — hoje{" "}
                                    {proximaAula.horario.replace(":00", "h")}
                                </Text>
                                <View style={styles.nextClassRow}>
                                    <Clock size={16} color="rgba(255,255,255,0.7)" />
                                    <Text style={styles.nextClassMuted}>Faltam 2h30</Text>
                                </View>
                                <Text style={styles.nextClassMuted}>
                                    {proximaAula.confirmados} confirmados · {proximaAula.espera} na
                                    lista de espera
                                </Text>

                                <View style={styles.progressSection}>
                                    <View style={styles.progressHeader}>
                                        <Text style={styles.progressLabel}>Capacidade</Text>
                                        <Text style={styles.progressLabel}>
                                            {proximaAula.confirmados}/{proximaAula.capacidade}
                                        </Text>
                                    </View>
                                    <Progress
                                        value={(proximaAula.confirmados / proximaAula.capacidade) * 100}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={handleOpenAttendance}
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
                                value={aulasProfessor.length}
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
                            <View style={{ gap: 8 }}>
                                {aulasHoje.map((aula) => (
                                    <AulaItem
                                        key={aula.id}
                                        aula={aula}
                                        onOpenAttendance={handleOpenAttendance}
                                    />
                                ))}
                            </View>
                        </View>

                        <View style={[styles.card, styles.warningCard]}>
                            <AlertTriangle size={20} color={COLORS.warning} />
                            <Text style={styles.warningText}>
                                <Text style={styles.warningTextStrong}>
                                    {totalEspera} alunos na lista de espera para as{" "}
                                    {proximaAula?.horario.replace(":00", "h")}
                                </Text>
                                <Text style={styles.mutedText}>
                                    {" "}
                                    — confirme presença para liberar vagas
                                </Text>
                            </Text>
                        </View>
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
    progressTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        borderRadius: 4,
        backgroundColor: COLORS.mainOrange,
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
    },
    aulaTimeColumn: {
        alignItems: "center",
        width: 48,
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
