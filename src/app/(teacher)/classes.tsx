import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import Modal from "@/components/AppModal";
import {
    Image,
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
import { useAlunos } from "@/hooks/alunos.hooks";
import { maskPhone } from "@/utils/masks";
import { consumePendingOcorrenciaId } from "@/hooks/attendanceSelection";
import { useFocusEffect } from "expo-router";
import {
    useAddStudentToOcorrencia,
    useAttendance,
    useCancelOcorrencia,
    useCloseOcorrencia,
    useMarkAttendance,
    useTodayOccurrences,
} from "@/hooks/schedule.hooks";
import {
    AttendanceFilterStatusType,
    AttendanceStudentStatusType,
    AttendanceStudentType,
} from "@/types/schedules.types";
import { Search, UserPlus } from "lucide-react-native";
import { partnerBookingLabel } from "@/utils/bookingSource";
import { formatHora, STATUS_BADGE } from "./index";

type TabKey = "chamada" | "espera" | "adicionar";

/** Cada aba consome o mesmo hook, alterando apenas o parâmetro `status`. */
const TAB_STATUS: Record<TabKey, AttendanceFilterStatusType> = {
    chamada: "Confirmado",
    espera: "FilaEspera",
    adicionar: "Confirmado",
};

/**
 * Visitantes experimentais adicionados pela aba "Adicionar" ainda não têm registro no servidor,
 * então a presença deles fica só no estado local.
 */
const isLocalBooking = (bookingId: string) => bookingId.startsWith("exp-");

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
    const refresh = useScreenRefresh([["today-occurrences"], ["attendance"]]);
    const { toast } = useToast();
    const [tab, setTab] = useState<TabKey>("chamada");

    // Reaproveita o cache do React Query alimentado pela tela inicial ("SUAS AULAS HOJE").
    const { todayOccurrences, isLoading: isLoadingOcorrencias } = useTodayOccurrences();

    // Ocorrência escolhida ao clicar em "Abrir chamada" na tela inicial. É um
    // sinal one-shot: consumido ao focar a tela. Ao voltar pelo menu (sem novo
    // clique), volta a ser null e a tela usa a primeira ocorrência do dia.
    const [selectedOcorrenciaId, setSelectedOcorrenciaId] = useState<string | null>(null);

    useFocusEffect(
        useCallback(() => {
            setSelectedOcorrenciaId(consumePendingOcorrenciaId());
        }, [])
    );

    const ocorrencia = useMemo(() => {
        const selecionada = selectedOcorrenciaId
            ? todayOccurrences?.find((o) => o.id === selectedOcorrenciaId)
            : undefined;
        // Regra padrão: primeira ocorrência do dia que ainda não foi concluída.
        return selecionada ?? todayOccurrences?.find((o) => o.status !== "Concluida");
    }, [todayOccurrences, selectedOcorrenciaId]);

    const ocorrenciaId = ocorrencia?.id ?? "";

    const { attendance, isLoading, error } = useAttendance({
        ocorrenciaId,
        status: TAB_STATUS[tab],
    });
    const { markAttendance } = useMarkAttendance();
    const { closeOcorrencia, isLoading: isEncerrando } = useCloseOcorrencia();
    const { cancelOcorrencia, isLoading: isCancelando } = useCancelOcorrencia();
    const { addStudent } = useAddStudentToOcorrencia();
    const [adicionandoAluno, setAdicionandoAluno] = useState<string | null>(null);

    const [presencaOverrides, setPresencaOverrides] = useState<
        Record<string, AttendanceStudentStatusType>
    >({});
    const [salvandoPresenca, setSalvandoPresenca] = useState<Record<string, boolean>>({});
    const [extras, setExtras] = useState<AttendanceStudentType[]>([]);
    const [encerrarModal, setEncerrarModal] = useState(false);
    const [cancelarModal, setCancelarModal] = useState(false);
    const [cancelReason, setCancelReason] = useState("");
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
    const aulaAberta = !!ocorrencia
        && ocorrencia.status !== "Concluida" && ocorrencia.status !== "Encerrada" && ocorrencia.status !== "Cancelada";
    // Vaga livre com gente na fila só dura até o job chamar o próximo; com a aula encerrada não há o que chamar.
    const vagasDisponiveis = aulaAberta ? Math.max(0, capacidade - confirmados) : 0;

    const chamadaLista = useMemo(
        () => (tab === "chamada" ? [...lista, ...extras] : extras),
        [tab, lista, extras]
    );

    // Estado local é específico da ocorrência aberta.
    useEffect(() => {
        setPresencaOverrides({});
        setSalvandoPresenca({});
        setExtras([]);
    }, [ocorrenciaId]);

    useEffect(() => {
        if (!attendance) return;
        setPresencaOverrides((previous) => {
            const persisted = Object.keys(previous).filter((bookingId) => !isLocalBooking(bookingId) && !salvandoPresenca[bookingId]);
            if (!persisted.length) return previous;
            const next = { ...previous };
            persisted.forEach((bookingId) => { delete next[bookingId]; });
            return next;
        });
    }, [attendance]);

    const getStatus = (aluno: AttendanceStudentType): AttendanceStudentStatusType =>
        presencaOverrides[aluno.bookingId] ?? aluno.status;

    const marcarPresenca = async (aluno: AttendanceStudentType, present: boolean) => {
        const { bookingId, studentName } = aluno;
        if (salvandoPresenca[bookingId] || !aulaAberta) return;

        const novoStatus: AttendanceStudentStatusType = present ? "Present" : "Absent";
        const anterior = presencaOverrides[bookingId];

        // Atualiza o botão na hora; o override é revertido se a API recusar.
        setPresencaOverrides((prev) => ({ ...prev, [bookingId]: novoStatus }));

        if (isLocalBooking(bookingId)) return;

        setSalvandoPresenca((prev) => ({ ...prev, [bookingId]: true }));

        try {
            const result = await markAttendance({ bookingId, present });

            if (!present) {
                // Na falta, o próximo da fila entra direto na chamada; a API diz quem entrou.
                const promoted = result?.promotedStudentName;
                toast({
                    title: `${studentName} marcado como ausente`,
                    description: promoted ? `${promoted} saiu da lista de espera e entrou na chamada.` : undefined,
                });
            }
        } catch (err) {
            setPresencaOverrides((prev) => {
                const next = { ...prev };
                if (anterior === undefined) delete next[bookingId];
                else next[bookingId] = anterior;
                return next;
            });
            toast({
                title: `Não foi possível marcar ${present ? "presença" : "falta"} de ${studentName}`,
                description:
                    (err as any)?.data?.detail || (err as Error)?.message || "Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setSalvandoPresenca((prev) => {
                const next = { ...prev };
                delete next[bookingId];
                return next;
            });
        }
    };

    const encerrarChamada = async () => {
        if (!ocorrenciaId) return;

        try {
            await closeOcorrencia(ocorrenciaId);
            setEncerrarModal(false);
            toast({
                title: "Chamada encerrada",
                description: `${presentes} presenças e ${ausentes} ausência(s) salvas ✓`,
            });
        } catch (err) {
            toast({
                title: "Não foi possível encerrar a chamada",
                description:
                    (err as any)?.data?.detail || (err as Error)?.message || "Tente novamente.",
                variant: "destructive",
            });
        }
    };

    const handleCancelarAula = async () => {
        if (!ocorrenciaId) return;

        try {
            await cancelOcorrencia({ ocorrenciaId, reason: cancelReason });
            setCancelarModal(false);
            setCancelReason("");
            toast({
                title: "Aula cancelada",
                description: "A aula foi cancelada e os alunos foram notificados ✓",
            });
        } catch (err) {
            toast({
                title: "Não foi possível cancelar a aula",
                description:
                    (err as any)?.data?.detail || (err as Error)?.message || "Tente novamente.",
                variant: "destructive",
            });
        }
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

    // Alunos do CT com plano ativo, buscados no servidor a partir de 2 letras.
    const buscaAluno = searchAdd.trim();
    const { alunos: alunosEncontrados } = useAlunos(
        { search: buscaAluno, page: 1, pageSize: 20 },
        { enabled: buscaAluno.length >= 2 },
    );
    const searchResults = buscaAluno.length >= 2 ? alunosEncontrados?.items ?? [] : [];

    // studentId da chamada é o id do usuário, o mesmo userId da lista de alunos.
    const alunosNaAula = new Set(lista.map((c) => c.studentId));

    const adicionarAluno = async (alunoUserId: string, nome: string) => {
        if (!ocorrenciaId || adicionandoAluno) return;
        setAdicionandoAluno(alunoUserId);
        try {
            await addStudent({ ocorrenciaId, alunoUserId });
            setSearchAdd("");
            toast({ title: `${nome} adicionado à aula ✓`, description: "Marque a presença na chamada." });
        } catch (err) {
            toast({
                title: `Não foi possível adicionar ${nome}`,
                description: (err as any)?.data?.detail || (err as Error)?.message || "Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setAdicionandoAluno(null);
        }
    };
    const expDisabled = !expNome.trim() || !expTel.trim() || !aulaAberta;

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
                <RefreshableScrollView {...refresh}><ChamadaSkeleton /></RefreshableScrollView>
            </SafeAreaView>
        );
    }

    if (!ocorrencia) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
                <ClientHeader />
                <RefreshableScrollView {...refresh}><EmptyState message="Nenhuma aula agendada para hoje" /></RefreshableScrollView>
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
                        <RefreshableScrollView {...refresh}
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
                                {aulaAberta
                                    ? "Marque a presença ou a falta de cada aluno"
                                    : "Chamada encerrada — apenas para consulta"}
                            </Text>

                            {renderListState("Nenhum aluno confirmado nesta aula") ?? (
                                <View style={{ gap: 8 }}>
                                    {chamadaLista.map((c) => {
                                        const status = getStatus(c);
                                        const salvando = !!salvandoPresenca[c.bookingId];

                                        return (
                                            <View
                                                key={c.bookingId}
                                                style={[
                                                    styles.card,
                                                    status === "Absent" && styles.cardAbsent,
                                                ]}
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
                                                            {!!partnerBookingLabel(c.paymentMethod) && (
                                                                <Badge variant="info" compact>
                                                                    {partnerBookingLabel(c.paymentMethod)}
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

                                                <View style={styles.presenceActions}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.presenceButton,
                                                            status === "Present"
                                                                ? styles.presenceButtonPresent
                                                                : styles.presenceButtonIdle,
                                                            salvando && styles.buttonDisabled,
                                                        ]}
                                                        onPress={() => marcarPresenca(c, true)}
                                                        disabled={salvando || !aulaAberta}
                                                        activeOpacity={0.7}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Marcar presença de ${c.studentName}`}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.presenceIcon,
                                                                {
                                                                    color:
                                                                        status === "Present"
                                                                            ? COLORS.success
                                                                            : COLORS.mutedForeground,
                                                                },
                                                            ]}
                                                        >
                                                            ✓
                                                        </Text>
                                                    </TouchableOpacity>

                                                    <TouchableOpacity
                                                        style={[
                                                            styles.presenceButton,
                                                            status === "Absent"
                                                                ? styles.presenceButtonAbsent
                                                                : styles.presenceButtonIdle,
                                                            salvando && styles.buttonDisabled,
                                                        ]}
                                                        onPress={() => marcarPresenca(c, false)}
                                                        disabled={salvando || !aulaAberta}
                                                        activeOpacity={0.7}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`Marcar falta de ${c.studentName}`}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.presenceIcon,
                                                                {
                                                                    color:
                                                                        status === "Absent"
                                                                            ? COLORS.destructive
                                                                            : COLORS.mutedForeground,
                                                                },
                                                            ]}
                                                        >
                                                            ✗
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </RefreshableScrollView>

                        <View style={styles.footer}>
                            {ocorrencia.status === "Cancelada" ? (
                                <View style={styles.cancelledBanner}>
                                    <Text style={styles.cancelledBannerText}>Esta aula está cancelada</Text>
                                </View>
                            ) : !aulaAberta ? (
                                // Aula concluída: a chamada já foi salva e a API recusa encerrar ou cancelar de novo.
                                <View style={styles.closedBanner}>
                                    <Text style={styles.closedBannerText}>Chamada encerrada</Text>
                                </View>
                            ) : (
                                <>
                                    <TouchableOpacity
                                        style={styles.cancelarAulaButton}
                                        onPress={() => setCancelarModal(true)}
                                        activeOpacity={0.8}
                                        disabled={isCancelando || isEncerrando}
                                    >
                                        <Text style={styles.cancelarAulaText}>
                                            {isCancelando ? "Cancelando..." : "Cancelar aula"}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.destructiveOutlineButton}
                                        onPress={() => setEncerrarModal(true)}
                                        activeOpacity={0.8}
                                        disabled={isCancelando || isEncerrando}
                                    >
                                        <Text style={styles.destructiveOutlineText}>Encerrar chamada</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                )}

                {tab === "espera" && (
                    <RefreshableScrollView {...refresh}
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.tabContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Text style={styles.esperaTitle}>
                            {lista.length} pessoa{lista.length !== 1 ? "s" : ""} aguardando vaga
                        </Text>

                        {vagasDisponiveis > 0 && lista.length > 0 && (
                            <View style={styles.vagaBanner}>
                                <Text style={styles.vagaBannerText}>
                                    {vagasDisponiveis} vaga{vagasDisponiveis > 1 ? "s" : ""}{" "}
                                    disponível — a lista de espera é chamada automaticamente
                                </Text>
                            </View>
                        )}

                        {renderListState("Ninguém na lista de espera") ?? (
                            <View style={{ gap: 8 }}>
                                {lista.map((item, index) => (
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
                                                    {!!partnerBookingLabel(item.paymentMethod) && (
                                                        <Badge variant="info" compact>
                                                            {partnerBookingLabel(item.paymentMethod)}
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
                                    </View>
                                ))}
                            </View>
                        )}
                    </RefreshableScrollView>
                )}

                {tab === "adicionar" && (
                    <RefreshableScrollView {...refresh}
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
                                    const nome = a.userName || a.userEmail || "Aluno";
                                    const jaNaAula = alunosNaAula.has(a.userId);
                                    const adicionando = adicionandoAluno === a.userId;

                                    return (
                                        <View key={a.id} style={styles.card}>
                                            <View style={styles.alunoInfo}>
                                                <Avatar nome={nome} size={32} />
                                                <Text style={styles.searchName}>{nome}</Text>
                                            </View>
                                            {jaNaAula ? (
                                                <Text style={styles.mutedSmall}>(já confirmado)</Text>
                                            ) : (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.smallButton,
                                                        styles.solidButton,
                                                        (!aulaAberta || !!adicionandoAluno) && styles.buttonDisabled,
                                                    ]}
                                                    activeOpacity={0.8}
                                                    disabled={!aulaAberta || !!adicionandoAluno}
                                                    onPress={() => adicionarAluno(a.userId, nome)}
                                                    accessibilityRole="button"
                                                    accessibilityLabel={`Adicionar ${nome} à aula`}
                                                >
                                                    <Text style={styles.solidButtonText}>
                                                        {adicionando ? "Adicionando..." : "Adicionar à aula"}
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
                                    keyboardType="number-pad"
                                    value={expTel}
                                    onChangeText={(next) => setExpTel(maskPhone(next))}
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
                    </RefreshableScrollView>
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
                                disabled={isEncerrando}
                            >
                                <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.destructiveButton,
                                    isEncerrando && styles.buttonDisabled,
                                ]}
                                onPress={encerrarChamada}
                                disabled={isEncerrando}
                            >
                                <Text style={styles.solidButtonText}>
                                    {isEncerrando ? "Encerrando..." : "Encerrar e salvar"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                visible={cancelarModal}
                transparent
                animationType="fade"
                onRequestClose={() => {
                    setCancelarModal(false);
                    setCancelReason("");
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Cancelar aula das {formatHora(ocorrencia.startTime)}?
                        </Text>
                        <Text style={styles.modalText}>
                            Os check-ins dos alunos inscritos não serão debitados e eles receberão uma notificação com o motivo.
                        </Text>
                        <View style={{ gap: 6, marginVertical: 12 }}>
                            <Text style={styles.label}>Motivo do cancelamento (opcional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ex: Chuva, professor indisposto..."
                                placeholderTextColor="#9ca3af"
                                value={cancelReason}
                                onChangeText={setCancelReason}
                            />
                        </View>
                        <Text style={styles.modalWarning}>Esta ação não pode ser desfeita.</Text>
                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.modalButtonCancel]}
                                onPress={() => {
                                    setCancelarModal(false);
                                    setCancelReason("");
                                }}
                                disabled={isCancelando}
                            >
                                <Text style={styles.modalButtonCancelText}>Voltar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.modalButton,
                                    styles.destructiveButton,
                                    isCancelando && styles.buttonDisabled,
                                ]}
                                onPress={handleCancelarAula}
                                disabled={isCancelando}
                            >
                                <Text style={styles.solidButtonText}>
                                    {isCancelando ? "Cancelando..." : "Confirmar cancelamento"}
                                </Text>
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
    presenceActions: {
        flexDirection: "row",
        gap: 8,
    },
    presenceButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
    presenceButtonIdle: {
        backgroundColor: "#f3f4f6",
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
        flexDirection: "row",
        gap: 10,
    },
    cancelarAulaButton: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#9ca3af",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    cancelarAulaText: {
        color: "#4b5563",
        fontSize: 14,
        fontWeight: "600",
    },
    destructiveOutlineButton: {
        flex: 1,
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
    cancelledBanner: {
        flex: 1,
        backgroundColor: "#fee2e2",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    cancelledBannerText: {
        color: COLORS.destructive,
        fontSize: 14,
        fontWeight: "600",
    },
    closedBanner: {
        flex: 1,
        backgroundColor: "#dcfce7",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
    },
    closedBannerText: {
        color: "#16a34a",
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
