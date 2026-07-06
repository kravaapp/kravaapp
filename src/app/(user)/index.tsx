import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import ClientHeader, { COLORS, getInitials } from "@/components/ClientHeader";
import { ConfirmBookingModal } from "@/components/ConfirmBookingModal";
import { BadgeStatus, StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/auth.hooks";
import { useCreateSchedule, useSchedule, useUserNextClass, useUserWeekClasses } from "@/hooks/schedule.hooks";
import { Token } from "@/types/auth.types";
import { ScheduleOccurrenceType } from "@/types/schedules.types";
import { Clock3, Dumbbell } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";



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
            return `${days}d ${hoursRemaining}h${minutesRemaining}min`;
        }

        return `${days}d`;
    }

    if (hoursRemaining > 0) {
        return `${hoursRemaining}h${minutesRemaining}min`;
    }

    return `${minutesRemaining}min`;
}

const getStudentLevelProps = (level?: string) => {
    switch (level?.toLowerCase()) {
        case 'avancado':
            return { label: 'Avançado', color: '#f59e0b', backgroundColor: '#fef3c7' };
        case 'intermediario':
            return { label: 'Intermediário', color: '#ea580c', backgroundColor: '#ffedd5' };
        case 'iniciante':
        default:
            return { label: 'Iniciante', color: '#16a34a', backgroundColor: '#dcfce7' };
    }
};

const UserProfile = ({ user }: { user: Token | null }) => {
    const levelProps = getStudentLevelProps(user?.studentLevel);

    return (
        <View style={styles.profile}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user?.userName || 'Usuario Name')}</Text>
            </View>

            <View>
                <View style={styles.userInfo}>
                    <Text style={styles.title}>Olá, {user?.userName || 'Usuario Name'}</Text>
                    <View style={[styles.subtitleContainer, { backgroundColor: levelProps.backgroundColor }]}>
                        <Text style={[styles.subtitle, { color: levelProps.color }]}>{levelProps.label}</Text>
                    </View>
                </View>
                <Text style={styles.location}>{user?.tenantName || 'Local não informado'}</Text>
            </View>
        </View>
    );
};

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

    if (!userNextClass?.aulaId) {
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
                        <Text style={styles.graySmall}>Faltam {getTimeUntilClass(userNextClass?.ocorrenciaDate || '', userNextClass?.startTime || '')}</Text>
                    </View>
                </View>

                <TouchableOpacity style={styles.cancelButton}>
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
};

const WeekCalendar = () => {
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const { userWeekClasses, isLoading } = useUserWeekClasses();

    const weekDays = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDay();
        const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() - distanceToMonday);
        
        const week = [];
        const labels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + i);
            
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;
            
            week.push({
                label: labels[i],
                day: date.getDate(),
                date: formattedDate,
                month: month
            });
        }
        return week;
    }, []);

    const daysWithClasses = useMemo(() => {
        return weekDays.map(day => {
            const classesForDay = (userWeekClasses || []).filter(c => c.ocorrenciaDate === day.date);
            const firstClass = classesForDay.length > 0 ? classesForDay[0] : null;
            
            return {
                ...day,
                aula: firstClass ? {
                    modalidade: firstClass.modalityName || firstClass.aulaName,
                    horario: firstClass.startTime.substring(0, 5),
                    status: firstClass.bookingStatus === 'Confirmado' ? 'confirmado' : 'espera'
                } : null
            };
        });
    }, [weekDays, userWeekClasses]);

    const selectedDayData = daysWithClasses.find(d => d.date === selectedDate);

    if (isLoading) {
        return (
            <View style={styles.weekRow}>
                {Array.from({ length: 7 }).map((_, index) => (
                    <View key={index} style={styles.dayItem}>
                        <View style={styles.skeletonDayLabel} />
                        <View style={styles.skeletonCircle} />
                    </View>
                ))}
            </View>
        );
    }

    return (
        <View>
            <View style={styles.weekRow}>
                {daysWithClasses.map((d) => {
                    return (
                        <TouchableOpacity
                            key={d.date}
                            style={styles.dayItem}
                            onPress={() => {
                                if (!d.aula) return;
                                setSelectedDate(selectedDate === d.date ? null : d.date);
                            }}
                        >
                            <Text style={styles.dayLabel}>{d.label}</Text>
                            <View
                                style={[
                                    styles.circle,
                                    selectedDayData?.date === d.date
                                        ? styles.active
                                        : styles.inactive,
                                ]}
                            >
                                <Text style={selectedDayData?.date === d.date ? styles.todayText : styles.dayText}>
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
            {selectedDayData && selectedDayData.aula && (
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>
                        {selectedDayData.aula.modalidade} • {selectedDayData.aula.horario}
                    </Text>
                    <Text style={styles.location}>
                        {selectedDayData.label}, {String(selectedDayData.day).padStart(2, '0')}/{selectedDayData.month}
                    </Text>
                </View>
            )}
        </View>
    );
};

const AvailableClassItem = ({ aula, userGender = 'M', userLevel = 'iniciante', onBookPress }: { aula: ScheduleOccurrenceType; userGender?: string; userLevel?: string; onBookPress: (item: ScheduleOccurrenceType) => void }) => {
    const level = aula.minLevel || "iniciante";
    const gender = aula.publicGender || "Mixed";

    const getLevelWeight = (lvl: string) => {
        switch (lvl?.toLowerCase()) {
            case 'iniciante': return 1;
            case 'intermediario': return 2;
            case 'avancado': return 3;
            default: return 0;
        }
    };

    const getGenderLabel = (g: string) => {
        switch (g?.toUpperCase()) {
            case 'M': return '♂ Masculina';
            case 'F': return '♀ Feminina';
            default: return '⚥ Mista';
        }
    };

    const capitalizeText = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

    const isGenderAllowed = gender === 'Mixed' || gender === userGender;
    const isLevelAllowed = getLevelWeight(userLevel) >= getLevelWeight(level);

    return (
        <View style={[styles.card, aula.status === "Bloqueada" ? { opacity: 0.6 } : {}]}>
            <View style={styles.rowBetween}>
                <View style={styles.row}>
                    <View style={{ marginRight: 16, width: 55 }}>
                        <Text style={styles.time}>{aula.startTime.substring(0, 5)}</Text>
                        <Text style={styles.location}>
                            {(aula.modalityName || aula.aulaName).length > 12
                                ? `${(aula.modalityName || aula.aulaName).substring(0, 12)}...`
                                : (aula.modalityName || aula.aulaName)}
                        </Text>
                    </View>
                    <View>
                        <Text style={{ fontSize: 12, fontWeight: "600" }}>
                            Prof. {aula.professorName}
                        </Text>
                        <Text style={styles.location}>
                            {aula.confirmedCount !== undefined && aula.maxCapacity !== undefined ? `${aula.confirmedCount}/${aula.maxCapacity}` : "-/-"} vagas
                        </Text>
                    </View>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <StatusBadge status={aula.status?.toLowerCase() as BadgeStatus} />
                    <View style={{ marginTop: 6 }}>
                        {aula.subscriptionStatus ? (
                            <Text style={{ color: COLORS.mainOrange, fontSize: 10, fontWeight: 'bold' }}>
                                {aula.subscriptionStatus === 'Confirmado' ? 'Agendamento Confirmado ✓' :
                                aula.subscriptionStatus === 'ListaEspera' ? 'Na Fila de Espera' :
                                aula.subscriptionStatus === 'WaitlistPending' ? 'Aguardando Confirmação' :
                                aula.subscriptionStatus === 'CheckedIn' ? 'Check-in Realizado' :
                                aula.subscriptionStatus === 'Faltou' ? 'Faltou' : ''}
                            </Text>
                        ) : !isGenderAllowed ? (
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '600', fontStyle: 'italic' }}>
                                Apenas {getGenderLabel(gender).substring(2)}
                            </Text>
                        ) : !isLevelAllowed ? (
                            <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '600', fontStyle: 'italic' }}>
                                Requer nível {capitalizeText(level)}
                            </Text>
                        ) : (
                            <TouchableOpacity
                                style={{ backgroundColor: COLORS.mainOrange, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}
                                onPress={() => onBookPress(aula)}
                            >
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Agendar</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function Home() {
    const { user } = useAuth();
    const { createSchedule, isLoading: isCreatingSchedule } = useCreateSchedule();

    const [selectedClass, setSelectedClass] = useState<ScheduleOccurrenceType | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleBookPress = (item: ScheduleOccurrenceType) => {
        setSelectedClass(item);
        setIsModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedClass) return;

        await createSchedule({ ocorrenciaId: selectedClass.id });

        setIsModalVisible(false);
        setSelectedClass(null);
    };

    const dateParams = useMemo(() => {
        const today = new Date();
        const next15Days = new Date(today);
        next15Days.setDate(today.getDate() + 15);

        const formatDate = (date: Date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return {
            startDate: formatDate(today),
            endDate: formatDate(next15Days)
        };
    }, []);

    const { schedule, isLoading: scheduleLoading } = useSchedule({
        startDate: dateParams.startDate,
        endDate: dateParams.endDate,
        openForEnrollment: true
    });

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
            <ClientHeader />
            <View style={{ padding: 20, paddingBottom: 0 }}>
                <UserProfile user={user} />
                <NextClassCard />
                <Text style={styles.sectionTitle}>AULAS DA SEMANA</Text>
                <WeekCalendar />
                <Text style={styles.sectionTitle}>AULAS DISPONÍVEIS AGORA</Text>
                <Text style={styles.sectionSubtitle}>Abertas para agendamento</Text>
                {scheduleLoading && <ActivityIndicator size="large" color={COLORS.mainOrange} />}
            </View>
            <FlatList
                style={{ flex: 1, backgroundColor: "#fff" }}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 5 }}
                data={scheduleLoading ? [] : (schedule?.items || [])}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AvailableClassItem aula={item} userGender={user?.gender} userLevel={user?.studentLevel} onBookPress={handleBookPress} />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    !scheduleLoading ? (
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            <Text style={{ color: '#9ca3af' }}>Nenhuma aula disponível no momento</Text>
                        </View>
                    ) : null
                }
            />
            <ConfirmBookingModal
                visible={isModalVisible}
                selectedClass={selectedClass}
                isCreatingSchedule={isCreatingSchedule}
                onClose={() => setIsModalVisible(false)}
                onConfirm={handleConfirmBooking}
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
    skeletonDayLabel: {
        width: 20,
        height: 10,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        marginBottom: 2,
    },
    skeletonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e2e8f0',
        marginVertical: 5,
    },
});