import { useState } from "react";
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
import { useAlunos } from "@/hooks/alunos.hooks";
import { useCategories } from "@/hooks/categories.hooks";
import { AlunoSummaryType } from "@/types/alunos.types";
import { Category } from "@/types/categories.types";
import { ChevronRight, Search } from "lucide-react-native";

const capitalize = (value: string) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const formatDate = (isoDate: string) => {
    const date = new Date(isoDate);
    return date.toLocaleDateString("pt-BR");
};

const statusVariant = (status: string): BadgeVariant => {
    switch (status.toLowerCase()) {
        case "ativo":
            return "success";
        case "inativo":
        case "suspenso":
            return "destructive";
        default:
            return "muted";
    }
};

const levelVariant = (level: string): BadgeVariant => {
    switch (level.toLowerCase()) {
        case "iniciante":
            return "success";
        case "intermediário":
        case "intermediario":
            return "warning";
        case "avançado":
        case "avancado":
            return "destructive";
        case "elite":
            return "manager";
        default:
            return "muted";
    }
};

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

const ModalityFilter = ({
    categories,
    loading,
    selectedId,
    onSelect,
}: {
    categories: Category[] | undefined;
    loading: boolean;
    selectedId: string;
    onSelect: (id: string) => void;
}) => (
    <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
    >
        <TouchableOpacity
            style={[styles.filterChip, selectedId === "Todos" && styles.filterChipActive]}
            onPress={() => onSelect("Todos")}
            activeOpacity={0.8}
        >
            <Text
                style={[styles.filterText, selectedId === "Todos" && styles.filterTextActive]}
            >
                Todos
            </Text>
        </TouchableOpacity>
        {!loading &&
            categories?.map((cat) => (
                <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterChip, selectedId === cat.id && styles.filterChipActive]}
                    onPress={() => onSelect(cat.id)}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[styles.filterText, selectedId === cat.id && styles.filterTextActive]}
                    >
                        {cat.name}
                    </Text>
                </TouchableOpacity>
            ))}
    </ScrollView>
);

export default function PerfilAluno() {
    const [search, setSearch] = useState("");
    const [modalityId, setModalityId] = useState("Todos");
    const [selectedAluno, setSelectedAluno] = useState<AlunoSummaryType | null>(null);

    const { categories, isLoading: categoriesLoading } = useCategories();

    const { alunos, isLoading } = useAlunos({
        search: search || undefined,
        modalityId: modalityId === "Todos" ? undefined : modalityId,
        page: 1,
        pageSize: 50,
    });

    const items = alunos?.items ?? [];

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

                <ModalityFilter
                    categories={categories}
                    loading={categoriesLoading}
                    selectedId={modalityId}
                    onSelect={setModalityId}
                />
            </View>

            {isLoading ? (
                <ListSkeleton />
            ) : (
                <ScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {items.length === 0 ? (
                        <Text style={styles.emptyText}>Nenhum aluno encontrado</Text>
                    ) : (
                        items.map((a) => (
                            <TouchableOpacity
                                key={a.id}
                                style={styles.card}
                                onPress={() => setSelectedAluno(a)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.alunoInfo}>
                                    <Avatar nome={a.userName} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.alunoNome}>{a.userName}</Text>
                                        <View style={styles.badgeRow}>
                                            {a.modalities.map((m) => (
                                                <Badge key={m} variant="primary" compact>
                                                    {m}
                                                </Badge>
                                            ))}
                                            <Badge variant={levelVariant(a.level)} compact>
                                                {capitalize(a.level)}
                                            </Badge>
                                            <Badge variant={statusVariant(a.status)} compact>
                                                {a.status}
                                            </Badge>
                                        </View>
                                    </View>
                                </View>
                                <ChevronRight size={16} color={COLORS.mutedForeground} />
                            </TouchableOpacity>
                        ))
                    )}
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
                                    <Avatar nome={selectedAluno.userName} size={64} />
                                    <Text style={styles.sheetTitle}>{selectedAluno.userName}</Text>
                                    <Text style={styles.mutedSmall}>{selectedAluno.userEmail}</Text>
                                    <Text style={styles.mutedSmall}>{selectedAluno.phone}</Text>
                                    <View style={styles.sheetBadges}>
                                        {selectedAluno.modalities.map((m) => (
                                            <Badge key={m} variant="primary">
                                                {m}
                                            </Badge>
                                        ))}
                                        <Badge variant={levelVariant(selectedAluno.level)}>
                                            {capitalize(selectedAluno.level)}
                                        </Badge>
                                        <Badge variant={statusVariant(selectedAluno.status)}>
                                            {selectedAluno.status}
                                        </Badge>
                                        {selectedAluno.paymentMethods.map((p) => (
                                            <Badge key={p} variant="info">
                                                {p}
                                            </Badge>
                                        ))}
                                    </View>
                                </View>

                                <View style={{ gap: 20 }}>
                                    <View>
                                        <Text style={styles.sectionLabel}>PLANO ATIVO</Text>
                                        <Text style={styles.sectionValue}>
                                            {selectedAluno.planoAtivo || "Sem plano ativo"}
                                        </Text>
                                    </View>

                                    <View style={styles.statsRow}>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statValuePrimary}>
                                                {selectedAluno.checkinsThisMonth}
                                            </Text>
                                            <Text style={styles.statLabel}>check-ins este mês</Text>
                                        </View>
                                        <View style={styles.statCard}>
                                            <Text style={styles.statValueMuted}>
                                                {formatDate(selectedAluno.enrolledAtUtc)}
                                            </Text>
                                            <Text style={styles.statLabel}>aluno desde</Text>
                                        </View>
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    )}
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
    emptyText: {
        textAlign: "center",
        color: COLORS.mutedForeground,
        marginTop: 20,
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
        gap: 4,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.foreground,
        marginTop: 8,
    },
    sheetBadges: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        flexWrap: "wrap",
        marginTop: 8,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.mutedForeground,
        marginBottom: 8,
    },
    sectionValue: {
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
    statValueMuted: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    statLabel: {
        fontSize: 10,
        color: COLORS.mutedForeground,
        textAlign: "center",
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
});
