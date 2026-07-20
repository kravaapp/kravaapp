import { useEffect, useMemo, useRef, useState } from "react";
import {
    Image,
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

import { Badge, BadgeVariant } from "@/components/Badge";
import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { Progress } from "@/components/Progress";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { alunos } from "@/data/mockData";
import { useAttendance, useTodayOccurrences } from "@/hooks/schedule.hooks";
import {
    AttendanceFilterStatusType,
    AttendanceStudentType,
} from "@/types/schedules.types";
import { Search, UserPlus } from "lucide-react-native";
import { formatHora, STATUS_BADGE } from "./index";

const TEMPO_CONFIRMACAO = 900;

type TabKey = "chamada" | "espera" | "adicionar";

/** Cada aba consome o mesmo hook, alterando apenas o parâmetro `status`. */
const TAB_STATUS: Record<TabKey, AttendanceFilterStatusType> = {
    chamada: "Confirmado",
    espera: "FilaEspera",
    adicionar: "Confirmado",
};

/** Estado local da chamada da fila de espera (não há endpoint para isso ainda). */
type ChamadaFila = {
    status: "chamado" | "nao_confirmou";
    countdown: number;
};

const LEVEL_VARIANT: Record<string, BadgeVariant> = {
    iniciante: "success",
    intermediario: "warning",
    "intermediário": "warning",
    avancado: "destructive",
    "avançado": "destructive",
    elite: "manager",
};

const levelVariant = (level: string): BadgeVariant =>
    LEVEL_VARIANT[level.trim().toLowerCase()] || "muted";

const levelLabel = (level: string) =>
    level ? level.charAt(0).toUpperCase() + level.slice(1) : "";

const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
};

const Avatar = ({
    nome,
    photoUrl,
    size = 36,
}: {
    nome: string;
    photoUrl?: string | null;
    size?: number;
}) => {
    const shape = { width: size, height: size, borderRadius: size / 2 };

    if (photoUrl) {
        return <Image source={{ uri: photoUrl }} style={[styles.avatar, shape]} />;
    }

    return (
        <View style={[styles.avatar, shape]}>
            <Text style={styles.avatarText}>{getInitials(nome).slice(0, 2)}</Text>
        </View>
    );
};

const SegmentedTabs = ({
    value,
    onChange,
    esperaCount,
}: {
    value: TabKey;
    onChange: (tab: TabKey) => void;
    esperaCount: number;
}) => {
    const tabs: { key: TabKey; label: string }[] = [
        { key: "chamada", label: "Chamada" },
        { key: "espera", label: `Espera (${esperaCount})` },
        { key: "adicionar", label: "Adicionar" },
    ];

    return (
        <View style={styles.tabsList}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.key}
                    style={[styles.tabTrigger, value === tab.key && styles.tabTriggerActive]}
                    onPress={() => onChange(tab.key)}
                    activeOpacity={0.8}
                >
                    <Text
                        style={[styles.tabText, value === tab.key && styles.tabTextActive]}
                        numberOfLines={1}
                    >
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};

const ChamadaSkeleton = () => (
    <View style={styles.skeletonContainer}>
        {Array.from({ length: 6 }).map((_, index) => (
            <View key={index} style={styles.skeleton} />
        ))}
    </View>
);

const EmptyState = ({ message }: { message: string }) => (
    <View style={{ alignItems: "center", marginTop: 20 }}>
        <Text style={{ color: "#9ca3af" }}>{message}</Text>
    </View>
);

const ErrorState = ({ title, detail }: { title: string; detail: string }) => (
    <View style={{ alignItems: "center", marginVertical: 20 }}>
        <Text style={{ color: "#ef4444" }}>{title}</Text>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>{detail}</Text>
    </View>
);

export default function AulaAoVivo() {
    const { toast } = useToast();
    const [tab, setTab] = useState<TabKey>("chamada");

    // Reaproveita o cache do React Query alimentado pela tela inicial ("SUAS AULAS HOJE").
    const { todayOccurrences, isLoading: isLoadingOcorrencias } = useTodayOccurrences();
    const ocorrencia = todayOccurrences?.[0];
    const ocorrenciaId = ocorrencia?.id ?? "";

    const { attendance, isLoading, error } = useAttendance({
        ocorrenciaId,
        status: TAB_STATUS[tab],
    });

    const [presencaOverrides, setPresencaOverrides] = useState<Record<string, boolean>>({});
    const [chamadosFila, setChamadosFila] = useState<Record<string, ChamadaFila>>({});
    const [extras, setExtras] = useState<AttendanceStudentType[]>([]);
    const [encerrarModal, setEncerrarModal] = useState(false);
    const [chamarModal, setChamarModal] = useState<AttendanceStudentType | null>(null);
    const [pagamentoModal, setPagamentoModal] = useState<AttendanceStudentType | null>(null);
    const [searchAdd, setSearchAdd] = useState("");
    const [expNome, setExpNome] = useState("");
    const [expTel, setExpTel] = useState("");
    const [expToggle, setExpToggle] = useState(true);

    const lista = attendance?.lista ?? [];
    const presentes = attendance?.presentCount ?? 0;
    const ausentes = attendance?.absentCount ?? 0;
    const pendentes = attendance?.pendingCount ?? 0;

    const capacidade = ocorrencia?.maxCapacity ?? 0;
    const confirmados = ocorrencia?.confirmedCount ?? 0;
    const totalEspera = ocorrencia?.waitlistCount ?? 0;
    const vagasDisponiveis = ausentes;

    const chamadaLista = useMemo(
        () => (tab === "chamada" ? [...lista, ...extras] : extras),
        [tab, lista, extras]
    );

    const toastRef = useRef(toast);
    toastRef.current = toast;

    // O countdown roda fora do render, então precisa dos nomes por ref.
    const nomesFilaRef = useRef<Record<string, string>>({});
    nomesFilaRef.current = Object.fromEntries(
        lista.map((item) => [item.bookingId, item.studentName])
    );

    // Estado local é específico da ocorrência aberta.
    useEffect(() => {
        setPresencaOverrides({});
        setChamadosFila({});
        setExtras([]);
    }, [ocorrenciaId]);

    useEffect(() => {
        const interval = setInterval(() => {
            setChamadosFila((prev) => {
                const entries = Object.entries(prev);
                if (entries.length === 0) return prev;

                let changed = false;
                const next: Record<string, ChamadaFila> = {};

                for (const [bookingId, chamado] of entries) {
                    if (chamado.status !== "chamado") {
                        next[bookingId] = chamado;
                        continue;
                    }

                    changed = true;

                    if (chamado.countdown <= 1) {
                        next[bookingId] = { status: "nao_confirmou", countdown: 0 };
                        toastRef.current({
                            title: `${nomesFilaRef.current[bookingId] ?? "O aluno"} não confirmou`,
                            description: "Deseja chamar o próximo da fila?",
                            variant: "destructive",
                        });
                        continue;
                    }

                    next[bookingId] = { ...chamado, countdown: chamado.countdown - 1 };
                }

                return changed ? next : prev;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const isPresente = (aluno: AttendanceStudentType) =>
        presencaOverrides[aluno.bookingId] ?? aluno.status !== "Absent";

    const togglePresenca = (aluno: AttendanceStudentType) => {
        const presenteAgora = isPresente(aluno);

        setPresencaOverrides((prev) => ({ ...prev, [aluno.bookingId]: !presenteAgora }));

        if (presenteAgora) {
            toast({
                title: `${aluno.studentName} marcado como ausente`,
                description: "Deseja chamar o próximo da lista de espera?",
            });
        }
    };

    const chamarAluno = (aluno: AttendanceStudentType) => {
        setChamadosFila((prev) => ({
            ...prev,
            [aluno.bookingId]: { status: "chamado", countdown: TEMPO_CONFIRMACAO },
        }));
        setChamarModal(null);
        toast({ title: `Notificação enviada para ${aluno.studentName} ✓` });
    };

    const encerrarChamada = () => {
        setEncerrarModal(false);
        toast({
            title: "Chamada encerrada",
            description: `${presentes} presenças e ${ausentes} ausência(s) salvas ✓`,
        });
    };

    const confirmarPagamento = (aluno: AttendanceStudentType) => {
        setExtras((prev) =>
            prev.map((e) =>
                e.bookingId === aluno.bookingId ? { ...e, avulsoPending: false } : e
            )
        );
        setPagamentoModal(null);
        toast({ title: `Pagamento de ${aluno.studentName} confirmado ✓` });
    };

    const addExperimental = () => {
        if (!expNome.trim() || !expTel.trim()) return;

        setExtras((prev) => [
            ...prev,
            {
                bookingId: `exp-${Date.now()}`,
                studentId: "",
                studentName: expNome,
                photoUrl: null,
                isExperimental: expToggle,
                status: "Pending",
                level: "iniciante",
                paymentMethod: "Experimental",
                avulsoPending: false,
            },
        ]);
        toast({ title: `${expNome} adicionado como experimental ✓` });
        setExpNome("");
        setExpTel("");
    };

    const searchResults =
        searchAdd.length >= 2
            ? alunos.filter((a) => a.nome.toLowerCase().includes(searchAdd.toLowerCase()))
            : [];

    const nomesNaChamada = new Set(chamadaLista.map((c) => c.studentName));
    const expDisabled = !expNome.trim() || !expTel.trim();

    const renderListState = (emptyMessage: string) => {
        if (isLoading) return <ChamadaSkeleton />;
        if (error) return <ErrorState title="Erro ao carregar a chamada" detail={error} />;
        if (lista.length === 0) return <EmptyState message={emptyMessage} />;
        return null;
    };

    if (isLoadingOcorrencias) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                <ClientHeader />
                <ChamadaSkeleton />
            </SafeAreaView>
        );
    }

    if (!ocorrencia) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                <ClientHeader />
                <EmptyState message="Nenhuma aula agendada para hoje" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />

            <View style={styles.classHeader}>
                <Text style={styles.classTitle}>
                    {ocorrencia.aulaName || ocorrencia.modalidadeName} —{" "}
                    {formatHora(ocorrencia.startTime)}
                </Text>
                <View style={styles.classMetaRow}>
                    <StatusBadge status={STATUS_BADGE[ocorrencia.status]} />
                    <Text style={styles.classMeta}>
                        {confirmados}/{capacidade} confirmados · {totalEspera} na espera
                    </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                    <Progress
                        value={capacidade > 0 ? (confirmados / capacidade) * 100 : 0}
                        height={6}
                    />
                </View>
            </View>

            <View style={{ flex: 1 }}>
                <SegmentedTabs value={tab} onChange={setTab} esperaCount={totalEspera} />

                {tab === "chamada" && (
                    <View style={{ flex: 1 }}>
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.tabContent}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.countRow}>
                                <Text style={styles.countPresent}>✓ {presentes} presentes</Text>
                                <Text style={styles.mutedText}>·</Text>
                                <Text style={styles.countAbsent}>
                                    ✗ {ausentes} ausente{ausentes !== 1 ? "s" : ""}
                                </Text>
                                <Text style={styles.mutedText}>·</Text>
                                <Text style={styles.countPending}>⏳ {pendentes} pendente{pendentes !== 1 ? "s" : ""}</Text>
                            </View>

                            <Text style={styles.hint}>
                                Toque no nome para marcar presença ou ausência
                            </Text>

                            {renderListState("Nenhum aluno confirmado nesta aula") ?? (
                                <View style={{ gap: 8 }}>
                                    {chamadaLista.map((c) => {
                                        const presente = isPresente(c);

                                        return (
                                            <View
                                                key={c.bookingId}
                                                style={[styles.card, !presente && styles.cardAbsent]}
                                            >
                                                <View style={styles.alunoInfo}>
                                                    <Avatar nome={c.studentName} photoUrl={c.photoUrl} />
                                                    <View style={{ flex: 1 }}>
                                                        <View style={styles.nameRow}>
                                                            <Text style={styles.alunoNome} numberOfLines={1}>
                                                                {c.studentName}
                                                            </Text>
                                                            {c.avulsoPending && (
                                                                <TouchableOpacity
                                                                    onPress={() => setPagamentoModal(c)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Badge variant="warning" compact>
                                                                        💰 Pend.
                                                                    </Badge>
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>
                                                        <View style={styles.badgeRow}>
                                                            <Badge variant="primary" compact>
                                                                {ocorrencia.modalidadeName}
                                                            </Badge>
                                                            {!!c.level && (
                                                                <Badge variant={levelVariant(c.level)} compact>
                                                                    {levelLabel(c.level)}
                                                                </Badge>
                                                            )}
                                                            {c.isExperimental && (
                                                                <Badge variant="manager" compact>
                                                                    Experimental
                                                                </Badge>
                                                            )}
                                                        </View>
                                                    </View>
                                                </View>

                                                <TouchableOpacity
                                                    style={[
                                                        styles.presenceButton,
                                                        presente
                                                            ? styles.presenceButtonPresent
                                                            : styles.presenceButtonAbsent,
                                                    ]}
                                                    onPress={() => togglePresenca(c)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.presenceIcon,
                                                            {
                                                                color: presente
                                                                    ? COLORS.success
                                                                    : COLORS.destructive,
                                                            },
                                                        ]}
                                                    >
                                                        {presente ? "✓" : "✗"}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.destructiveOutlineButton}
                                onPress={() => setEncerrarModal(true)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.destructiveOutlineText}>Encerrar chamada</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {tab === "espera" && (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.tabContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.esperaTitle}>
                            {lista.length} pessoa{lista.length !== 1 ? "s" : ""} aguardando vaga
                        </Text>

                        {vagasDisponiveis > 0 && (
                            <View style={styles.vagaBanner}>
                                <Text style={styles.vagaBannerText}>
                                    {vagasDisponiveis} vaga{vagasDisponiveis > 1 ? "s" : ""}{" "}
                                    disponível — confirme a chamada para liberar
                                </Text>
                            </View>
                        )}

                        {renderListState("Ninguém na lista de espera") ?? (
                            <View style={{ gap: 8 }}>
                                {lista.map((item, index) => {
                                    const chamado = chamadosFila[item.bookingId];
                                    const primeiroAguardando = !chamadosFila[lista[0]?.bookingId];
                                    const bloqueado = index !== 0 && primeiroAguardando;
                                    const proximo = lista[index + 1];

                                    return (
                                        <View key={item.bookingId} style={styles.cardColumn}>
                                            <View style={styles.alunoInfo}>
                                                <View style={styles.posicaoCircle}>
                                                    <Text style={styles.posicaoText}>{index + 1}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.alunoNome}>{item.studentName}</Text>
                                                    <View style={styles.badgeRow}>
                                                        {!!item.level && (
                                                            <Badge variant={levelVariant(item.level)} compact>
                                                                {levelLabel(item.level)}
                                                            </Badge>
                                                        )}
                                                        {item.isExperimental && (
                                                            <Badge variant="manager" compact>
                                                                Experimental
                                                            </Badge>
                                                        )}
                                                        {item.avulsoPending && (
                                                            <Badge variant="warning" compact>
                                                                💰 Pend.
                                                            </Badge>
                                                        )}
                                                    </View>
                                                </View>
                                                <Avatar nome={item.studentName} photoUrl={item.photoUrl} />
                                            </View>

                                            {!chamado && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.fullButton,
                                                        index === 0 ? styles.solidButton : styles.outlineButton,
                                                        bloqueado && styles.buttonDisabled,
                                                    ]}
                                                    onPress={() => setChamarModal(item)}
                                                    disabled={bloqueado}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={
                                                            index === 0
                                                                ? styles.solidButtonText
                                                                : styles.outlineButtonText
                                                        }
                                                    >
                                                        {index === 0 ? "Chamar para a aula" : "Chamar"}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}

                                            {chamado?.status === "chamado" && (
                                                <View style={styles.countdownRow}>
                                                    <Badge variant="warning">
                                                        Aguardando confirmação ·{" "}
                                                        {formatCountdown(chamado.countdown)} ⏱
                                                    </Badge>
                                                </View>
                                            )}

                                            {chamado?.status === "nao_confirmou" && (
                                                <View style={{ marginTop: 8, gap: 8 }}>
                                                    <Badge variant="destructive">Não confirmou</Badge>
                                                    {proximo && (
                                                        <TouchableOpacity
                                                            style={[styles.fullButton, styles.solidButton]}
                                                            onPress={() => setChamarModal(proximo)}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.solidButtonText}>
                                                                Chamar {proximo.studentName}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                )}

                {tab === "adicionar" && (
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.tabContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Text style={styles.addTitle}>Adicionar aluno à aula</Text>

                        <View style={styles.searchWrapper}>
                            <Search
                                size={16}
                                color={COLORS.mutedForeground}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Buscar aluno do local..."
                                placeholderTextColor="#9ca3af"
                                value={searchAdd}
                                onChangeText={setSearchAdd}
                            />
                        </View>

                        {searchResults.length > 0 && (
                            <View style={{ gap: 4, marginBottom: 16 }}>
                                {searchResults.map((a) => {
                                    const jaNaAula = nomesNaChamada.has(a.nome);

                                    return (
                                        <View key={a.id} style={styles.card}>
                                            <View style={styles.alunoInfo}>
                                                <Avatar nome={a.nome} size={32} />
                                                <Text style={styles.searchName}>{a.nome}</Text>
                                            </View>
                                            {jaNaAula ? (
                                                <Text style={styles.mutedSmall}>(já confirmado)</Text>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[styles.smallButton, styles.solidButton]}
                                                    activeOpacity={0.8}
                                                    onPress={() => {
                                                        setExtras((prev) => [
                                                            ...prev,
                                                            {
                                                                bookingId: `local-${a.id}`,
                                                                studentId: a.id,
                                                                studentName: a.nome,
                                                                photoUrl: null,
                                                                isExperimental: false,
                                                                status: "Pending",
                                                                level: a.nivel,
                                                                paymentMethod: a.tipo,
                                                                avulsoPending: false,
                                                            },
                                                        ]);
                                                        setSearchAdd("");
                                                        toast({ title: `${a.nome} adicionado à aula ✓` });
                                                    }}
                                                >
                                                    <Text style={styles.solidButtonText}>
                                                        Adicionar à aula
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={styles.dividerRow}>
                            <View style={styles.divider} />
                            <Text style={styles.mutedSmall}>ou</Text>
                            <View style={styles.divider} />
                        </View>

                        <Text style={styles.addSubtitle}>Aluno experimental</Text>

                        <View style={{ gap: 12 }}>
                            <View style={{ gap: 6 }}>
                                <Text style={styles.label}>Nome *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Nome do aluno"
                                    placeholderTextColor="#9ca3af"
                                    value={expNome}
                                    onChangeText={setExpNome}
                                />
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={styles.label}>Telefone *</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="(19) 99999-9999"
                                    placeholderTextColor="#9ca3af"
                                    keyboardType="phone-pad"
                                    value={expTel}
                                    onChangeText={setExpTel}
                                />
                            </View>

                            <View style={styles.switchRow}>
                                <Switch
                                    value={expToggle}
                                    onValueChange={setExpToggle}
                                    trackColor={{ true: COLORS.mainOrange, false: "#d1d5db" }}
                                    thumbColor="#fff"
                                />
                                <Text style={styles.switchLabel}>Aula experimental</Text>
                            </View>

                            <Text style={styles.mutedSmall}>
                                Aluno experimental não precisa ter cadastro no app. O registro fica
                                salvo no histórico da aula.
                            </Text>

                            <TouchableOpacity
                                style={[
                                    styles.fullButton,
                                    styles.solidButton,
                                    styles.buttonWithIcon,
                                    expDisabled && styles.buttonDisabled,
                                ]}
                                onPress={addExperimental}
                                disabled={expDisabled}
                                activeOpacity={0.8}
                            >
                                <UserPlus size={16} color="#fff" />
                                <Text style={styles.solidButtonText}>Adicionar à chamada</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                )}
            </View>

            <Modal
                visible={!!pagamentoModal}
                transparent
                animationType="fade"
                onRequestClose={() => setPagamentoModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Confirmar pagamento de {pagamentoModal?.studentName}?
                        </Text>
                        {pagamentoModal && (
                            <View style={styles.paymentBox}>
                                <Text style={styles.mutedSmall}>
                                    Aula avulsa {ocorrencia.modalidadeName}
                                </Text>
                                <Text style={styles.paymentValue}>
                                    {pagamentoModal.paymentMethod}
                                </Text>
                            </View>
                        )}
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setPagamentoModal(null)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.solidButton]}
                                onPress={() => pagamentoModal && confirmarPagamento(pagamentoModal)}
                            >
                                <Text style={styles.solidButtonText}>Confirmar recebimento</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={encerrarModal}
                transparent
                animationType="fade"
                onRequestClose={() => setEncerrarModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Encerrar chamada da aula das {formatHora(ocorrencia.startTime)}?
                        </Text>
                        <Text style={styles.modalText}>
                            {presentes} presenças e {ausentes} ausência(s) serão registradas no
                            sistema.
                        </Text>
                        <Text style={styles.modalWarning}>Esta ação não pode ser desfeita.</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setEncerrarModal(false)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.destructiveButton]}
                                onPress={encerrarChamada}
                            >
                                <Text style={styles.solidButtonText}>Encerrar e salvar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={!!chamarModal}
                transparent
                animationType="fade"
                onRequestClose={() => setChamarModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Chamar {chamarModal?.studentName} para a aula?
                        </Text>
                        <Text style={styles.modalText}>
                            O aluno receberá uma notificação push e terá 15 minutos para confirmar.
                        </Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => setChamarModal(null)}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.solidButton]}
                                onPress={() => chamarModal && chamarAluno(chamarModal)}
                            >
                                <Text style={styles.solidButtonText}>Chamar agora</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    classHeader: {
        backgroundColor: COLORS.card,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    classTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: COLORS.foreground,
    },
    classMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
        flexWrap: "wrap",
    },
    classMeta: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    tabsList: {
        flexDirection: "row",
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: "#f3f4f6",
        borderRadius: 10,
        padding: 4,
        gap: 4,
    },
    tabTrigger: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: "center",
    },
    tabTriggerActive: {
        backgroundColor: "#fff",
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    tabText: {
        fontSize: 13,
        fontWeight: "500",
        color: COLORS.mutedForeground,
    },
    tabTextActive: {
        color: COLORS.foreground,
        fontWeight: "600",
    },
    tabContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 24,
    },
    countRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingVertical: 8,
        flexWrap: "wrap",
    },
    countPresent: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.success,
    },
    countAbsent: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.destructive,
    },
    countPending: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.warning,
    },
    hint: {
        fontSize: 12,
        color: COLORS.mutedForeground,
        marginBottom: 12,
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
    cardColumn: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 12,
        elevation: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
    },
    cardAbsent: {
        backgroundColor: "#fef2f2",
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
        fontSize: 12,
        fontWeight: "700",
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    alunoNome: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
        flexShrink: 1,
    },
    badgeRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
        flexWrap: "wrap",
    },
    presenceButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    presenceButtonPresent: {
        backgroundColor: COLORS.successSurface,
    },
    presenceButtonAbsent: {
        backgroundColor: "#fee2e2",
    },
    presenceIcon: {
        fontSize: 18,
        fontWeight: "700",
    },
    footer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: "#fff",
    },
    destructiveOutlineButton: {
        borderWidth: 1,
        borderColor: COLORS.destructive,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    destructiveOutlineText: {
        color: COLORS.destructive,
        fontSize: 14,
        fontWeight: "600",
    },
    esperaTitle: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
        marginBottom: 4,
    },
    vagaBanner: {
        backgroundColor: "rgba(233,90,7,0.1)",
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    vagaBannerText: {
        fontSize: 14,
        color: COLORS.mainOrange,
    },
    posicaoCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(245,158,11,0.1)",
        alignItems: "center",
        justifyContent: "center",
    },
    posicaoText: {
        color: COLORS.warning,
        fontWeight: "700",
        fontSize: 14,
    },
    countdownRow: {
        marginTop: 8,
        alignItems: "center",
    },
    fullButton: {
        borderRadius: 8,
        paddingVertical: 10,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
    },
    buttonWithIcon: {
        flexDirection: "row",
        gap: 8,
    },
    smallButton: {
        height: 28,
        paddingHorizontal: 10,
        borderRadius: 6,
        alignItems: "center",
        justifyContent: "center",
    },
    solidButton: {
        backgroundColor: COLORS.mainOrange,
    },
    solidButtonText: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    outlineButton: {
        borderWidth: 1,
        borderColor: COLORS.outline,
    },
    outlineButtonText: {
        color: COLORS.foreground,
        fontSize: 13,
        fontWeight: "600",
    },
    destructiveButton: {
        backgroundColor: COLORS.destructive,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    addTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.foreground,
        marginBottom: 12,
    },
    addSubtitle: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.foreground,
        marginBottom: 12,
    },
    searchWrapper: {
        justifyContent: "center",
        marginBottom: 12,
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
    searchName: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    mutedText: {
        color: COLORS.mutedForeground,
    },
    mutedSmall: {
        fontSize: 12,
        color: COLORS.mutedForeground,
    },
    dividerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginVertical: 16,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: COLORS.border,
    },
    label: {
        fontSize: 12,
        fontWeight: "500",
        color: COLORS.foreground,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.foreground,
    },
    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    switchLabel: {
        fontSize: 14,
        color: COLORS.foreground,
    },
    skeletonContainer: {
        padding: 16,
        gap: 12,
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
        color: COLORS.mutedForeground,
        lineHeight: 20,
    },
    modalWarning: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.destructive,
    },
    paymentBox: {
        backgroundColor: "#f9fafb",
        borderRadius: 12,
        padding: 12,
    },
    paymentValue: {
        fontSize: 18,
        fontWeight: "700",
        color: COLORS.foreground,
        marginTop: 4,
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
});
