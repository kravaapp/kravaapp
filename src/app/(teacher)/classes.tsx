import { useEffect, useRef, useState } from "react";
import {
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
import { useToast } from "@/components/Toast";
import { alunos, Nivel } from "@/data/mockData";
import { Clock, Search, UserPlus } from "lucide-react-native";

const CAPACIDADE = 14;
const TEMPO_CONFIRMACAO = 900;

type ChamadaAluno = {
    id: string;
    nome: string;
    modalidade: string;
    nivel: Nivel;
    presente: boolean;
    experimental?: boolean;
    avulsoPendente?: boolean;
    avulsoValor?: number;
};

type EsperaAluno = {
    id: string;
    nome: string;
    posicao: number;
    horaEntrada: string;
    status: "aguardando" | "chamado" | "nao_confirmou";
    countdown?: number;
};

type TabKey = "chamada" | "espera" | "adicionar";

const initialChamada: ChamadaAluno[] = [
    { id: "1", nome: "Carlos Mendes", modalidade: "Futevôlei", nivel: "Intermediário", presente: true },
    { id: "2", nome: "Ana Beatriz Lima", modalidade: "Futevôlei", nivel: "Iniciante", presente: true },
    { id: "3", nome: "Rafael Santos", modalidade: "Futevôlei", nivel: "Avançado", presente: false },
    { id: "4", nome: "Julia Pereira", modalidade: "Futevôlei", nivel: "Iniciante", presente: true },
    { id: "5", nome: "Marcos Tavares", modalidade: "Futevôlei", nivel: "Intermediário", presente: true },
    { id: "6", nome: "Fernanda Costa", modalidade: "Futevôlei", nivel: "Elite", presente: true },
    { id: "7", nome: "Pedro Alves", modalidade: "Futevôlei", nivel: "Iniciante", presente: true },
    { id: "8", nome: "Beatriz Rocha", modalidade: "Futevôlei", nivel: "Intermediário", presente: true },
    { id: "9", nome: "Lucas Ferreira", modalidade: "Futevôlei", nivel: "Avançado", presente: true },
    { id: "10", nome: "Camila Souza", modalidade: "Futevôlei", nivel: "Iniciante", presente: true },
    {
        id: "11",
        nome: "Diego Martins",
        modalidade: "Futevôlei",
        nivel: "Iniciante",
        presente: true,
        avulsoPendente: true,
        avulsoValor: 35,
    },
];

const initialEspera: EsperaAluno[] = [
    { id: "e1", nome: "Larissa Nunes", posicao: 1, horaEntrada: "14h22", status: "aguardando" },
    { id: "e2", nome: "Thiago Lima", posicao: 2, horaEntrada: "15h10", status: "aguardando" },
    { id: "e3", nome: "Paula Mendes", posicao: 3, horaEntrada: "15h45", status: "aguardando" },
];

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

const formatCountdown = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${rest.toString().padStart(2, "0")}`;
};

const Avatar = ({ nome, size = 36 }: { nome: string; size?: number }) => (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.avatarText}>{getInitials(nome).slice(0, 2)}</Text>
    </View>
);

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

export default function AulaAoVivo() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<TabKey>("chamada");
    const [chamada, setChamada] = useState(initialChamada);
    const [espera, setEspera] = useState(initialEspera);
    const [encerrarModal, setEncerrarModal] = useState(false);
    const [chamarModal, setChamarModal] = useState<EsperaAluno | null>(null);
    const [pagamentoModal, setPagamentoModal] = useState<ChamadaAluno | null>(null);
    const [searchAdd, setSearchAdd] = useState("");
    const [expNome, setExpNome] = useState("");
    const [expTel, setExpTel] = useState("");
    const [expToggle, setExpToggle] = useState(true);

    const toastRef = useRef(toast);
    toastRef.current = toast;

    useEffect(() => {
        const timeout = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setEspera((prev) =>
                prev.map((item) => {
                    if (item.status !== "chamado" || item.countdown === undefined) {
                        return item;
                    }
                    if (item.countdown <= 1) {
                        toastRef.current({
                            title: `${item.nome} não confirmou`,
                            description: "Deseja chamar o próximo da fila?",
                            variant: "destructive",
                        });
                        return { ...item, countdown: 0, status: "nao_confirmou" as const };
                    }
                    return { ...item, countdown: item.countdown - 1 };
                })
            );
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const presentes = chamada.filter((c) => c.presente).length;
    const ausentes = chamada.filter((c) => !c.presente).length;
    const vagasDisponiveis = ausentes;

    const togglePresenca = (id: string) => {
        const aluno = chamada.find((c) => c.id === id);
        setChamada((prev) =>
            prev.map((c) => (c.id === id ? { ...c, presente: !c.presente } : c))
        );
        if (aluno?.presente) {
            toast({
                title: `${aluno.nome} marcado como ausente`,
                description: "Deseja chamar o próximo da lista de espera?",
            });
        }
    };

    const chamarAluno = (aluno: EsperaAluno) => {
        setEspera((prev) =>
            prev.map((item) =>
                item.id === aluno.id
                    ? { ...item, status: "chamado" as const, countdown: TEMPO_CONFIRMACAO }
                    : item
            )
        );
        setChamarModal(null);
        toast({ title: `Notificação enviada para ${aluno.nome} ✓` });
    };

    const encerrarChamada = () => {
        setEncerrarModal(false);
        toast({
            title: "Chamada encerrada",
            description: `${presentes} presenças e ${ausentes} ausência(s) salvas ✓`,
        });
    };

    const confirmarPagamento = (aluno: ChamadaAluno) => {
        setChamada((prev) =>
            prev.map((c) => (c.id === aluno.id ? { ...c, avulsoPendente: false } : c))
        );
        setPagamentoModal(null);
        toast({ title: `Pagamento de ${aluno.nome} confirmado ✓` });
    };

    const addExperimental = () => {
        if (!expNome.trim() || !expTel.trim()) return;
        setChamada((prev) => [
            ...prev,
            {
                id: `exp-${Date.now()}`,
                nome: expNome,
                modalidade: "Futevôlei",
                nivel: "Iniciante",
                presente: true,
                experimental: true,
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

    const nomesNaChamada = new Set(chamada.map((c) => c.nome));
    const expDisabled = !expNome.trim() || !expTel.trim();

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />

            <View style={styles.classHeader}>
                <Text style={styles.classTitle}>Futevôlei — 19h</Text>
                <View style={styles.classMetaRow}>
                    <Badge variant="success" pulse>
                        Em andamento
                    </Badge>
                    <Text style={styles.classMeta}>
                        {presentes + ausentes}/{CAPACIDADE} confirmados · {espera.length} na espera
                    </Text>
                </View>
                <View style={{ marginTop: 12 }}>
                    <Progress value={((presentes + ausentes) / CAPACIDADE) * 100} height={6} />
                </View>
            </View>

            {loading ? (
                <ChamadaSkeleton />
            ) : (
                <View style={{ flex: 1 }}>
                    <SegmentedTabs value={tab} onChange={setTab} esperaCount={espera.length} />

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
                                </View>

                                <Text style={styles.hint}>
                                    Toque no nome para marcar presença ou ausência
                                </Text>

                                <View style={{ gap: 8 }}>
                                    {chamada.map((c) => (
                                        <View
                                            key={c.id}
                                            style={[styles.card, !c.presente && styles.cardAbsent]}
                                        >
                                            <View style={styles.alunoInfo}>
                                                <Avatar nome={c.nome} />
                                                <View style={{ flex: 1 }}>
                                                    <View style={styles.nameRow}>
                                                        <Text style={styles.alunoNome} numberOfLines={1}>
                                                            {c.nome}
                                                        </Text>
                                                        {c.avulsoPendente && (
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
                                                            {c.modalidade}
                                                        </Badge>
                                                        <Badge variant={nivelVariant(c.nivel)} compact>
                                                            {c.nivel}
                                                        </Badge>
                                                        {c.experimental && (
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
                                                    c.presente
                                                        ? styles.presenceButtonPresent
                                                        : styles.presenceButtonAbsent,
                                                ]}
                                                onPress={() => togglePresenca(c.id)}
                                                activeOpacity={0.7}
                                            >
                                                <Text
                                                    style={[
                                                        styles.presenceIcon,
                                                        {
                                                            color: c.presente
                                                                ? COLORS.success
                                                                : COLORS.destructive,
                                                        },
                                                    ]}
                                                >
                                                    {c.presente ? "✓" : "✗"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
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
                                {espera.length} pessoas aguardando vaga
                            </Text>

                            {vagasDisponiveis > 0 && (
                                <View style={styles.vagaBanner}>
                                    <Text style={styles.vagaBannerText}>
                                        {vagasDisponiveis} vaga{vagasDisponiveis > 1 ? "s" : ""}{" "}
                                        disponível — Rafael Santos foi marcado ausente
                                    </Text>
                                </View>
                            )}

                            <View style={{ gap: 8 }}>
                                {espera.map((item, index) => {
                                    const bloqueado =
                                        index !== 0 && espera[0]?.status === "aguardando";

                                    return (
                                        <View key={item.id} style={styles.cardColumn}>
                                            <View style={styles.alunoInfo}>
                                                <View style={styles.posicaoCircle}>
                                                    <Text style={styles.posicaoText}>{item.posicao}</Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.alunoNome}>{item.nome}</Text>
                                                    <View style={styles.filaRow}>
                                                        <Clock size={12} color={COLORS.mutedForeground} />
                                                        <Text style={styles.filaText}>
                                                            Na fila desde {item.horaEntrada}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            {item.status === "aguardando" && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.fullButton,
                                                        index === 0
                                                            ? styles.solidButton
                                                            : styles.outlineButton,
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

                                            {item.status === "chamado" && item.countdown !== undefined && (
                                                <View style={styles.countdownRow}>
                                                    <Badge variant="warning">
                                                        Aguardando confirmação ·{" "}
                                                        {formatCountdown(item.countdown)} ⏱
                                                    </Badge>
                                                </View>
                                            )}

                                            {item.status === "nao_confirmou" && (
                                                <View style={{ marginTop: 8, gap: 8 }}>
                                                    <Badge variant="destructive">Não confirmou</Badge>
                                                    {index < espera.length - 1 && (
                                                        <TouchableOpacity
                                                            style={[styles.fullButton, styles.solidButton]}
                                                            onPress={() => setChamarModal(espera[index + 1])}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.solidButtonText}>
                                                                Chamar {espera[index + 1]?.nome}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })}
                            </View>
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
                                                            setChamada((prev) => [
                                                                ...prev,
                                                                {
                                                                    id: a.id,
                                                                    nome: a.nome,
                                                                    modalidade: a.modalidades[0],
                                                                    nivel: a.nivel,
                                                                    presente: true,
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
            )}

            <Modal
                visible={!!pagamentoModal}
                transparent
                animationType="fade"
                onRequestClose={() => setPagamentoModal(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            Confirmar pagamento de {pagamentoModal?.nome}?
                        </Text>
                        {pagamentoModal && (
                            <View style={styles.paymentBox}>
                                <Text style={styles.mutedSmall}>Aula avulsa Futevôlei</Text>
                                <Text style={styles.paymentValue}>
                                    R$ {pagamentoModal.avulsoValor},00
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
                        <Text style={styles.modalTitle}>Encerrar chamada da aula das 19h?</Text>
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
                            Chamar {chamarModal?.nome} para a aula?
                        </Text>
                        <Text style={styles.modalText}>
                            Ela receberá uma notificação push e terá 15 minutos para confirmar.
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
    filaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        marginTop: 2,
    },
    filaText: {
        fontSize: 12,
        color: COLORS.mutedForeground,
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
