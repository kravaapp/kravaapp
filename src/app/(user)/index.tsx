import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { BadgeStatus, StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/auth.hooks";
import { useUserNextClass } from "@/hooks/schedule.hooks";
import { Token } from "@/types/auth.types";
import { Clock3, Dumbbell } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WeekDay = {
    label: string;
    day: number;
    aula: {
        modalidade: string;
        horario: string;
        status: string;
    } | null;
};

type AulaDisponivel = {
    id: string;
    horario: string;
    modalidade: string;
    professor: string;
    confirmados: number;
    capacidade: number;
    estado: string;
};

const weekDays: WeekDay[] = [
    { label: "Seg", day: 17, aula: null },
    {
        label: "Ter",
        day: 18,
        aula: {
            modalidade: "Futevôlei",
            horario: "19h",
            status: "confirmado",
        },
    },
    { label: "Qua", day: 19, aula: null },
    {
        label: "Qui",
        day: 20,
        aula: {
            modalidade: "Futevôlei",
            horario: "19h",
            status: "confirmado",
        },
    },
    { label: "Sex", day: 21, aula: null },
    {
        label: "Sáb",
        day: 22,
        aula: {
            modalidade: "Futevôlei",
            horario: "09h",
            status: "espera",
        },
    },
    { label: "Dom", day: 23, aula: null },
];

const aulasDisponiveis: AulaDisponivel[] = [
    {
        id: "1",
        horario: "18h00",
        modalidade: "Funcional",
        professor: "Marina",
        confirmados: 14,
        capacidade: 14,
        estado: "lotada",
    },
    {
        id: "2",
        horario: "19h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 11,
        capacidade: 14,
        estado: "confirmado",
    },
    {
        id: "3",
        horario: "20h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 8,
        capacidade: 14,
        estado: "bloqueada",
    },
    {
        id: "4",
        horario: "18h00",
        modalidade: "Funcional",
        professor: "Marina",
        confirmados: 14,
        capacidade: 14,
        estado: "lotada",
    },
    {
        id: "5",
        horario: "19h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 11,
        capacidade: 14,
        estado: "confirmado",
    },
    {
        id: "6",
        horario: "20h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 8,
        capacidade: 14,
        estado: "bloqueada",
    },
    {
        id: "7",
        horario: "18h00",
        modalidade: "Funcional",
        professor: "Marina",
        confirmados: 14,
        capacidade: 14,
        estado: "lotada",
    },
    {
        id: "8",
        horario: "19h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 11,
        capacidade: 14,
        estado: "confirmado",
    },
    {
        id: "9",
        horario: "20h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 8,
        capacidade: 14,
        estado: "bloqueada",
    },
    {
        id: "10",
        horario: "18h00",
        modalidade: "Funcional",
        professor: "Marina",
        confirmados: 14,
        capacidade: 14,
        estado: "lotada",
    },
    {
        id: "11",
        horario: "19h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 11,
        capacidade: 14,
        estado: "confirmado",
    },
    {
        id: "12",
        horario: "20h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 8,
        capacidade: 14,
        estado: "bloqueada",
    },
    {
        id: "13",
        horario: "18h00",
        modalidade: "Funcional",
        professor: "Marina",
        confirmados: 14,
        capacidade: 14,
        estado: "lotada",
    },
    {
        id: "14",
        horario: "19h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 11,
        capacidade: 14,
        estado: "confirmado",
    },
    {
        id: "15",
        horario: "20h00",
        modalidade: "Futevôlei",
        professor: "Ricardo",
        confirmados: 8,
        capacidade: 14,
        estado: "bloqueada",
    },
];

const UserProfile = ({ user }: { user: Token | null }) => (
    <View style={styles.profile}>
        <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.userName || 'Usuario Name')}</Text>
        </View>

        <View>
            <View style={styles.userInfo}>
                <Text style={styles.title}>Olá, {user?.userName || 'Usuario Name'}</Text>
                <View style={styles.subtitleContainer}>
                    <Text style={styles.subtitle}>Intermediário</Text>
                </View>
            </View>
            <Text style={styles.location}>{user?.tenantName || 'Local não informado'}</Text>
        </View>
    </View>
);

const WEEK_DAYS = [
    "domingo",
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
];

export function getClassTime(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number);

    const classDate = new Date(year, month - 1, day);

    const now = new Date();

    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const diffDays = Math.floor(
        (classDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const formattedTime = time.substring(0, 5); // HH:MM

    if (diffDays === 0) {
        return `hoje ${formattedTime}`;
    }

    if (diffDays === 1) {
        return `amanhã ${formattedTime}`;
    }

    if (diffDays > 1 && diffDays <= 7) {
        return `${WEEK_DAYS[classDate.getDay()]} ${formattedTime}`;
    }

    const formattedDate = date
        .split("-")
        .reverse()
        .join("/");

    return `${formattedDate} ${formattedTime}`;
}

export function getClassStatus(status: string) {
    switch (status) {
        case "Confirmado":
            return "Confirmado ✓";
        case "FilaEspera":
            return "Na Fila";
        default:
            return status;
    }
}

export function getTimeUntilClass(date: string, time: string) {
    const [year, month, day] = date.split("-").map(Number);
    const [hours, minutes, seconds] = time.split(":").map(Number);

    const classDate = new Date(
        year,
        month - 1,
        day,
        hours,
        minutes,
        seconds || 0
    );

    const now = new Date();

    const diffMs = classDate.getTime() - now.getTime();

    if (diffMs <= 0) {
        return "Aula iniciada";
    }

    const totalMinutes = Math.floor(diffMs / (1000 * 60));

    const days = Math.floor(totalMinutes / (60 * 24));
    const hoursRemaining = Math.floor((totalMinutes % (60 * 24)) / 60);
    const minutesRemaining = totalMinutes % 60;

    if (days > 0) {
        if (hoursRemaining > 0 || minutesRemaining > 0) {
            return `Faltam ${days}d ${hoursRemaining}h${minutesRemaining}min`;
        }

        return `Faltam ${days}d`;
    }

    if (hoursRemaining > 0) {
        return `Faltam ${hoursRemaining}h${minutesRemaining}min`;
    }

    return `Faltam ${minutesRemaining}min`;
}

const NextClassCard = () => {

    const { userNextClass, isLoading, error } = useUserNextClass();

    if (isLoading) {
        return (
            <View style={styles.cardBlue}>
                <View style={styles.skeletonLabel} />
                <View style={styles.row}>
                    <View style={styles.skeletonIcon} />
                    <View style={{ marginLeft: 10 }}>
                        <View style={styles.skeletonTitle} />
                        <View style={styles.skeletonSubtitle} />
                    </View>
                </View>
                <View style={styles.bottomRow}>
                    <View style={styles.row}>
                        <View style={styles.skeletonBadge} />
                        <View style={[styles.row, { marginLeft: 12 }]}>
                            <View style={styles.skeletonTime} />
                        </View>
                    </View>
                    <View style={styles.skeletonButton} />
                </View>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.cardBlue}>
                <Text style={styles.cardLabel}>PRÓXIMA AULA</Text>
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={styles.white}>Erro ao carregar a próxima aula</Text>
                    <Text style={styles.graySmall}>{typeof error === 'string' ? error : 'Tente novamente mais tarde.'}</Text>
                </View>
            </View>
        );
    }

    if (!userNextClass) {
        return null;
    }

    return (
        <View style={styles.cardBlue}>
            <Text style={styles.cardLabel}>PRÓXIMA AULA</Text>
            <View style={styles.row}>
                <Dumbbell size={24} color="#fff" />
                <View style={{ marginLeft: 10 }}>
                    <Text style={styles.white}>{userNextClass?.aulaName || 'Aula'} — {getClassTime(userNextClass?.ocorrenciaDate || '', userNextClass?.startTime || '')}</Text>
                    <Text style={styles.gray}>Prof. {userNextClass?.professorName || 'Professor'} </Text>
                </View>
            </View>
            <View style={styles.bottomRow}>
                <View style={styles.row}>
                    <Text
                        style={userNextClass?.bookingStatus === 'FilaEspera' ? styles.badgeQueue : styles.badge}
                    >
                        {getClassStatus(userNextClass?.bookingStatus || '')}
                    </Text>

                    <View style={[styles.row, { marginLeft: 12 }]}>
                        <Clock3 size={14} color="#9CA3AF" />
                        <Text style={styles.graySmall}>{getTimeUntilClass(userNextClass?.ocorrenciaDate || '', userNextClass?.startTime || '')}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
};

const WeekCalendar = ({
    selectedDay,
    onSelectDay,
}: {
    selectedDay: number | null;
    onSelectDay: (day: number | null) => void;
}) => (
    <View style={styles.weekRow}>
        {weekDays.map((d) => {
            const isToday = d.day === 18;
            return (
                <TouchableOpacity
                    key={d.day}
                    style={styles.dayItem}
                    onPress={() => {
                        if (!d.aula) return;
                        onSelectDay(selectedDay === d.day ? null : d.day);
                    }}
                >
                    <Text style={styles.dayLabel}>{d.label}</Text>
                    <View
                        style={[
                            styles.circle,
                            isToday
                                ? styles.today
                                : d.aula
                                    ? styles.active
                                    : styles.inactive,
                        ]}
                    >
                        <Text style={d.aula ? styles.todayText : styles.dayText}>
                            {d.day}
                        </Text>
                    </View>
                    {d.aula && (
                        <View
                            style={[
                                styles.dot,
                                {
                                    backgroundColor:
                                        d.aula.status === "confirmado"
                                            ? COLORS.mainOrange
                                            : "#999",
                                },
                            ]}
                        />
                    )}
                </TouchableOpacity>
            );
        })}
    </View>
);

const SelectedDayCard = ({ selectedDay }: { selectedDay: number | null }) => {
    if (!selectedDay) return null;

    const day = weekDays.find((d) => d.day === selectedDay);
    if (!day?.aula) return null;

    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>
                {day.aula.modalidade} • {day.aula.horario}
            </Text>
            <Text style={styles.location}>
                {day.label}, {day.day}/03
            </Text>
        </View>
    );
};

const AvailableClassItem = ({ aula }: { aula: AulaDisponivel }) => (
    <View style={[styles.card, aula.estado === "bloqueada" ? { opacity: 0.6 } : {}]}>
        <View style={styles.rowBetween}>
            <View style={styles.row}>
                <View style={{ marginRight: 16, width: 55 }}>
                    <Text style={styles.time}>{aula.horario}</Text>
                    <Text style={styles.location}>{aula.modalidade}</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 12, fontWeight: "600" }}>
                        Prof. {aula.professor}
                    </Text>
                    <Text style={styles.location}>
                        {aula.confirmados}/{aula.capacidade} vagas
                    </Text>
                </View>
            </View>

            <View>
                <StatusBadge status={aula.estado as BadgeStatus} />
            </View>
        </View>
    </View>
);

export default function Home() {
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const { user } = useAuth();

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 400);

        return () => clearTimeout(timer);
    }, []);

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <UserProfile user={user} />
                <NextClassCard />
                <Text style={styles.sectionTitle}>AULAS DA SEMANA</Text>
                <WeekCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
                <SelectedDayCard selectedDay={selectedDay} />
                <Text style={styles.sectionTitle}>AULAS DISPONÍVEIS AGORA</Text>
                <Text style={styles.sectionSubtitle}>Abertas para agendamento</Text>
                {loading && <ActivityIndicator size="large" />}
            </View>
            <FlatList
                style={{ flex: 1, backgroundColor: "#fff" }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 5 }}
                data={loading ? [] : aulasDisponiveis}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AvailableClassItem aula={item} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
    },
    profile: {
        flexDirection: "row",
        marginBottom: 20,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 25,
        backgroundColor: COLORS.subOrange,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    avatarText: {
        fontWeight: "bold",
        fontSize: 15,
        color: COLORS.mainOrange,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    },
    subtitleContainer: {
        backgroundColor: "#ffefd4ff",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 15,
        paddingVertical: 0,
        height: 20,
        borderRadius: 15,
        marginLeft: 5,
    },
    subtitle: {
        color: "#f59e0b",
        fontSize: 10,
        textAlign: "center",
        fontWeight: "bold",
    },
    location: {
        color: "#777",
        fontSize: 12,
    },
    cardBlue: {
        backgroundColor: "#0f172a",
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
    },
    card: {
        backgroundColor: "#fff",
        padding: 15,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 2,
    },
    cardLabel: {
        color: "#aaa",
        fontSize: 10,
        marginBottom: 10,
        fontWeight: "bold",
    },
    cardTitle: {
        fontWeight: "bold",
    },
    white: {
        color: "#fff",
        fontWeight: "bold",
    },
    gray: {
        color: "#ccc",
    },
    graySmall: {
        color: "#ccc",
        fontSize: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
    },
    bottomRow: {
        marginTop: 15,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    cancelButton: {
        borderWidth: 1,
        borderColor: "#374151",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },

    cancelButtonText: {
        color: "#6B7280",
        fontSize: 14,
        fontWeight: "600",
    },
    rowBetween: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    badge: {
        color: "#22c55e",
        fontWeight: "bold",
        marginRight: 10,
    },
    badgeQueue: {
        color: "#f59e0b",
        fontWeight: "bold",
        marginRight: 10,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: "bold",
        color: COLORS.grayLabels,
    },
    sectionSubtitle: {
        fontSize: 10,
        marginBottom: 10,
        color: COLORS.grayLabels,
    },
    weekRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    dayItem: {
        alignItems: "center",
    },
    todayText: {
        color: "#fff",
        fontWeight: "bold",
    },
    dayText: {
        color: COLORS.grayLabels,
        fontWeight: "bold",
    },
    dayLabel: {
        color: COLORS.grayLabels,
        fontSize: 10,
    },
    circle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginVertical: 5,
    },
    today: {
        backgroundColor: COLORS.mainOrange,
    },
    active: {
        backgroundColor: COLORS.mainOrange,
    },
    inactive: {
        backgroundColor: "#eee",
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    time: {
        color: COLORS.mainOrange,
        fontWeight: "bold",
    },
    green: {
        color: "#22c55e",
    },
    red: {
        color: "#ef4444",
    },
    skeletonLabel: {
        height: 12,
        width: 80,
        backgroundColor: '#334155',
        borderRadius: 4,
        marginBottom: 10,
    },
    skeletonIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#334155',
    },
    skeletonTitle: {
        height: 16,
        width: 150,
        backgroundColor: '#334155',
        borderRadius: 4,
        marginBottom: 4,
    },
    skeletonSubtitle: {
        height: 14,
        width: 100,
        backgroundColor: '#334155',
        borderRadius: 4,
    },
    skeletonBadge: {
        height: 14,
        width: 80,
        backgroundColor: '#334155',
        borderRadius: 4,
    },
    skeletonTime: {
        height: 14,
        width: 60,
        backgroundColor: '#334155',
        borderRadius: 4,
    },
    skeletonButton: {
        height: 36,
        width: 80,
        backgroundColor: '#334155',
        borderRadius: 12,
    },
});