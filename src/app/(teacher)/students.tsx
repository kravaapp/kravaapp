import { useEffect, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Badge, BadgeVariant } from "@/components/Badge";
import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { Select } from "@/components/Select";
import { useToast } from "@/components/Toast";
import {
    Aluno,
    alunos,
    historicoPresencas,
    Modalidade,
    Nivel,
    NIVEIS,
    PresencaStatus,
    TipoAluno,
} from "@/data/mockData";
import { ChevronRight, Save, Search } from "lucide-react-native";

const FILTROS = ["Todos", "Futevôlei", "Funcional"] as const;
type Filtro = (typeof FILTROS)[number];

const GESTOR = "João Silva";

const nivelVariant = (nivel: Nivel): BadgeVariant => {
    switch (nivel) {
        case "Iniciante":
            return "success";
        case "Intermediário":
            return "warning";
        case "Avançado":
            return "destructive";
        case "Elite":
            return "manager";
    }
};

const tipoVariant = (tipo: TipoAluno): BadgeVariant => {
    switch (tipo) {
        case "Mensalista":
            return "primary";
        case "Gympass":
            return "info";
        case "Totalpass":
            return "manager";
        default:
            return "muted";
    }
};

const statusVariant: Record<PresencaStatus, BadgeVariant> = {
    Presente: "success",
    Ausente: "destructive",
    "Falta não cancelada": "destructive",
};

const modalidadeVariant = (modalidade: Modalidade): BadgeVariant =>
    modalidade === "Futevôlei" ? "primary" : "warning";

const Avatar = ({ nome, size = 40 }: { nome: string; size?: number }) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size <= 40 ? 12 : 20 }]}>
            {getInitials(nome).slice(0, 2)}
        </Text>
    </View>
);

const ListSkeleton = () => (
    <View style={styles.skeletonContainer}>
        {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeleton} />
        ))}
    </View>
);

export default function PerfilAluno() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filtro, setFiltro] = useState<Filtro>("Todos");
    const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
    const [editNivel, setEditNivel] = useState<Nivel>("Iniciante");
    const [confirmModal, setConfirmModal] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timeout);
    }, []);

    const filtered = alunos.filter((a) => {
        const matchSearch = a.nome.toLowerCase().includes(search.toLowerCase());
        const matchFiltro = filtro === "Todos" || a.modalidades.includes(filtro);
        return matchSearch && matchFiltro;
    });

    const openProfile = (aluno: Aluno) => {
        setSelectedAluno(aluno);
        setEditNivel(aluno.nivel);
    };

    const handleSaveNivel = () => {
        setConfirmModal(false);
        toast({
            title: `Nível de ${selectedAluno?.nome} atualizado para ${editNivel} ✓`,
            description: `O gestor ${GESTOR} será notificado desta alteração.`,
        });
        setSelectedAluno(null);
    };

    const ultimas5 = historicoPresencas.slice(0, 5);
    const faltasMes = historicoPresencas.filter(
        (p) => p.status === "Falta não cancelada"
    ).length;

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />

            <View style={styles.searchSection}>
                <View style={styles.searchWrapper}>
                    <Search size={16} color={COLORS.mutedForeground} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar aluno..."
                        placeholderTextColor="#9ca3af"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>

                <View style={styles.filterRow}>
                    {FILTROS.map((f) => (
                        <TouchableOpacity
                            key={f}
                            style={[styles.filterChip, filtro === f && styles.filterChipActive]}
                            onPress={() => setFiltro(f)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    filtro === f && styles.filterTextActive,
                                ]}
                            >
                                {f}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {loading ? (
                <ListSkeleton />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {filtered.map((a) => (
                        <TouchableOpacity
                            key={a.id}
                            style={styles.card}
                            onPress={() => openProfile(a)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.alunoInfo}>
                                <Avatar nome={a.nome} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.alunoNome}>{a.nome}</Text>
                                    <View style={styles.badgeRow}>
                                        {a.modalidades.map((m) => (
                                            <Badge key={m} variant={modalidadeVariant(m)} compact>
                                                {m}
                                            </Badge>
                                        ))}
                                        <Badge variant={nivelVariant(a.nivel)} compact>
                                            {a.nivel}
                                        </Badge>
                                    </View>
                                </View>
                            </View>
                            <ChevronRight size={16} color={COLORS.mutedForeground} />
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <Modal
                visible={!!selectedAluno}
                transparent
                animationType="slide"
                onRequestClose={() => setSelectedAluno(null)}
            >
                <View style={styles.sheetOverlay}>
                    <TouchableOpacity
                        style={{ flex: 1 }}
                        activeOpacity={1}
                        onPress={() => setSelectedAluno(null)}
                    />

                    {selectedAluno && (
                        <View style={styles.sheet}>
                            <View style={styles.sheetHandle} />

                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.sheetHeader}>
                                    <Avatar nome={selectedAluno.nome} size={64} />
                                    <Text style={styles.sheetTitle}>{selectedAluno.nome}</Text>
                                    <View style={styles.sheetBadges}>
                                        {selectedAluno.modalidades.map((m) => (
                                            <Badge key={m} variant={modalidadeVariant(m)}>
                                                {m}
                                            </Badge>
                                        ))}
                                        <Badge variant={nivelVariant(selectedAluno.nivel)}>
                                            {selectedAluno.nivel}
                                        </Badge>
                                        <Badge variant={tipoVariant(selectedAluno.tipo)}>
                                            {selectedAluno.tipo}
                                        </Badge>
                                    </View>
                                </View>

                                <View style={{ gap: 20 }}>
                                    <View>
                                        <Text style={styles.sectionLabel}>NÍVEL ATUAL</Text>
                                        <Select
                                            value={editNivel}
                                            options={NIVEIS}
                                            onChange={setEditNivel}
                                        />
                                        <Text style={styles.sectionHint}>
                                            Você pode atualizar o nível. O gestor também será
                                            notificado.
                                        </Text>
                                    </View>

                                    <View>
                                        <Text style={styles.sectionLabel}>ÚLTIMAS 5 PRESENÇAS</Text>
                                        <View>
                                            {ultimas5.map((p, index) => (
                                                <View
                                                    key={p.id}
                                                    style={[
                                                        styles.presencaRow,
                                                        index === ultimas5.length - 1 &&
                                                            styles.presencaRowLast,
                                                    ]}
                                                >
                                                    <View>
                                                        <Text style={styles.presencaData}>
                                                            {p.data} — {p.horario}
                                                        </Text>
                                                        <Text style={styles.mutedSmall}>
                                                            {p.modalidade}
                                                        </Text>
                                                    </View>
                                                    <Badge variant={statusVariant[p.status]} compact>
                                                        {p.status}
                                                    </Badge>
                                                </View>
                                            ))}
                                        </View>
                                    </View>

                                    <View>
                                        <Text style={styles.sectionLabel}>ESTATÍSTICAS RÁPIDAS</Text>
                                        <View style={styles.statsRow}>
                                            <View style={styles.statCard}>
                                                <Text style={styles.statValuePrimary}>
                                                    {selectedAluno.presencasMes}
                                                </Text>
                                                <Text style={styles.statLabel}>
                                                    presenças este mês
                                                </Text>
                                            </View>
                                            <View style={styles.statCard}>
                                                <Text style={styles.statValueDestructive}>
                                                    {faltasMes}
                                                </Text>
                                                <Text style={styles.statLabel}>
                                                    faltas não canceladas
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        editNivel === selectedAluno.nivel && styles.buttonDisabled,
                                    ]}
                                    onPress={() => setConfirmModal(true)}
                                    disabled={editNivel === selectedAluno.nivel}
                                    activeOpacity={0.8}
                                >
                                    <Save size={16} color="#fff" />
                                    <Text style={styles.saveButtonText}>
                                        Salvar alteração de nível
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    )}
                </View>
            </Modal>

            <Modal
                visible={confirmModal}
                transparent
                animationType="fade"
                onRequestClose={() => setConfirmModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Confirmar alteração de nível?</Text>
                        <Text style={styles.modalText}>
                            {selectedAluno?.nome}: {selectedAluno?.nivel} → {editNivel}
                        </Text>
                        <Text style={styles.mutedSmall}>
                            O gestor {GESTOR} será notificado desta alteração.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setConfirmModal(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.solidButton]}
                                onPress={handleSaveNivel}
                            >
                                <Text style={styles.solidButtonText}>Confirmar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    searchSection: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
        gap: 12,
    },
    searchWrapper: {
        justifyContent: "center",
    },
    searchIcon: {
        position: "absolute",
        left: 12,
        zIndex: 1,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingLeft: 36,
        paddingRight: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.foreground,
    },
    filterRow: {
        flexDirection: "row",
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#f3f4f6",
    },
    filterChipActive: {
        backgroundColor: COLORS.mainOrange,
    },
    filterText: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.mutedForeground,
    },
    filterTextActive: {
        color: "#fff",
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    alunoInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        flex: 1,
    },
    avatar: {
        backgroundColor: "rgba(233,90,7,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: COLORS.mainOrange,
        fontWeight: "700",
    },
    alunoNome: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
        flexWrap: "wrap",
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#fff",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 24,
        maxHeight: "85%",
    },
    sheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.border,
        alignSelf: "center",
        marginVertical: 12,
    },
    sheetHeader: {
        alignItems: "center",
        paddingBottom: 20,
        gap: 8,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    sheetBadges: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.mutedForeground,
        marginBottom: 8,
    },
    sectionHint: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        marginTop: 4,
    },
    presencaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    presencaRowLast: {
        borderBottomWidth: 0,
    },
    presencaData: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    mutedSmall: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    statsRow: {
        flexDirection: "row",
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    statValuePrimary: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.mainOrange,
    },
    statValueDestructive: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.destructive,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.mutedForeground,
        textAlign: "center",
    },
    saveButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: COLORS.mainOrange,
        borderRadius: 8,
        paddingVertical: 12,
        marginTop: 20,
    },
    saveButtonText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    skeletonContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    skeleton: {
        height: 64,
        backgroundColor: "#e5e7eb",
        borderRadius: 12,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.overlay,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    modalContent: {
        backgroundColor: "#fff",
        borderRadius: 16,
        width: "100%",
        maxWidth: 400,
        padding: 20,
        gap: 12,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    modalText: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    modalActions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 4,
    },
    modalButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    modalButtonCancel: {
        backgroundColor: "#f3f4f6",
    },
    modalButtonCancelText: {
        color: "#4b5563",
        fontSize: 13,
        fontWeight: "600",
    },
    solidButton: {
        backgroundColor: COLORS.mainOrange,
    },
    solidButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
});
