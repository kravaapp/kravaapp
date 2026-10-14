import RefreshableFlatList from "@/components/RefreshableFlatList";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

import ClientHeader, { getInitials } from "@/components/ClientHeader";
import { ConfirmBookingModal } from "@/components/ConfirmBookingModal";
import { BadgeStatus, StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/auth.hooks";
import { useBookingEligibility } from "@/hooks/bookingEligibility.hooks";
import { useCreateSchedule, useDeleteSchedule, useSchedule, useUserNextClass, useUserWeekClasses } from "@/hooks/schedule.hooks";
import { Token } from "@/types/auth.types";
import { ScheduleOccurrenceType } from "@/types/schedules.types";
import { ArrowRight, CalendarDays, Clock3, Dumbbell } from "lucide-react-native";
import { router } from "expo-router";
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
const BRAND_ORANGE = "#E85C07";
const INK = "#111827";
const MUTED = "#626973";

const formatAvailableClassDate = (value: string) => {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(year, month - 1, day);
    if (!year || !month || !day || Number.isNaN(date.getTime())) return value;
    const weekdays = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
    return `${weekdays[date.getDay()]}, ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}`;
};

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
            return { label: 'Avançado', color: INK, backgroundColor: '#FFF4E5' };
        case 'intermediario':
            return { label: 'Intermediário', color: INK, backgroundColor: '#FFF0E7' };
        case 'iniciante':
        default:
            return { label: 'Iniciante', color: INK, backgroundColor: '#E7F7EB' };
    }
};

const UserProfile = ({ user }: { user: Token | null }) => {
    const levelProps = getStudentLevelProps(user?.studentLevel);
    const firstName = user?.userName?.trim().split(/\s+/)[0] || "aluno";

    return (
        <View style={styles.profile}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(user?.userName || "A").slice(0, 2)}</Text>
            </View>

            <View style={styles.profileText}>
                <View style={styles.userInfo}>
                    <Text style={styles.title} numberOfLines={1}>olá, {firstName}</Text>
                </View>
                <View style={styles.profileMeta}>
                    <Text style={styles.profileLocation} numberOfLines={1}>{user?.tenantName || 'Local não informado'}</Text>
                    <View style={[styles.subtitleContainer, { backgroundColor: levelProps.backgroundColor }]}>
                        <Text style={[styles.subtitle, { color: levelProps.color }]}>{levelProps.label}</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const NextClassCard = () => {
    const { userNextClass, isLoading, error } = useUserNextClass();
    const { deleteSchedule, isLoading: isCancelling } = useDeleteSchedule();
    const { toast } = useToast();

    if (isLoading) {
        return (
            <View style={styles.nextClassCard}>
                <View style={styles.skeletonLabel} />
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonBadge} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.nextClassCard}>
                <Text style={styles.nextClassLabel}>próxima aula</Text>
                <Text style={styles.nextClassTitle}>não foi possível carregar sua aula</Text>
                <Text style={styles.nextClassDetail}>{typeof error === 'string' ? error : 'Tente novamente mais tarde.'}</Text>
            </View>
        );
    }

    if (!userNextClass?.aulaId) {
        return (
            <View style={styles.nextClassCard}>
                <Text style={styles.nextClassLabel}>próxima aula</Text>
                <Text style={styles.nextClassTitle}>seu próximo treino começa aqui.</Text>
                <Text style={styles.nextClassDetail}>Escolha uma aula e reserve seu lugar.</Text>
                <TouchableOpacity
                    style={styles.nextClassAction}
                    onPress={() => router.push("/schedule")}
                    accessibilityRole="button"
                >
                    <Text style={styles.nextClassActionText}>ver aulas</Text>
                    <ArrowRight size={17} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.nextClassCard}>
            <View style={styles.nextClassHeader}>
                <Text style={styles.nextClassLabel}>próxima aula</Text>
                <Dumbbell size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.nextClassTitle}>{userNextClass.aulaName || 'Aula'}</Text>
            <Text style={styles.nextClassDetail}>
                {getClassTime(userNextClass.ocorrenciaDate || '', userNextClass.startTime || '')} · prof. {userNextClass.professorName || 'Professor'}
            </Text>
            <View style={styles.nextClassFooter}>
                <View style={styles.nextClassMeta}>
                    <Text style={styles.nextClassStatus}>{getClassStatus(userNextClass.bookingStatus || '')}</Text>
                    <View style={styles.countdownRow}>
                        <Clock3 size={14} color="#FFFFFF" />
                        <Text style={styles.countdownText}>faltam {getTimeUntilClass(userNextClass.ocorrenciaDate || '', userNextClass.startTime || '')}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    disabled={isCancelling}
                    style={[styles.cancelButton, isCancelling && styles.disabledButton]}
                    onPress={async () => {
                        try {
                            await deleteSchedule(userNextClass.bookingId);
                            toast({ title: "Agendamento cancelado." });
                        } catch {
                            toast({ title: "Não foi possível cancelar o agendamento.", variant: "destructive" });
                        }
                    }}
                    accessibilityRole="button"
                >
                    <Text style={styles.cancelButtonText}>{isCancelling ? "cancelando..." : "cancelar"}</Text>
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
            <View style={styles.weekCard}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
                    {Array.from({ length: 7 }).map((_, index) => (
                        <View key={index} style={styles.dayItem}>
                            <View style={styles.skeletonDayLabel} />
                            <View style={styles.skeletonCircle} />
                        </View>
                    ))}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.weekCard}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekRow}>
                {daysWithClasses.map((d) => (
                    <TouchableOpacity
                        key={d.date}
                        style={styles.dayItem}
                        disabled={!d.aula}
                        onPress={() => setSelectedDate(selectedDate === d.date ? null : d.date)}
                        accessibilityRole="button"
                        accessibilityLabel={`${d.label}, ${d.day}: ${d.aula ? d.aula.modalidade : "sem aula"}`}
                        accessibilityState={{ selected: selectedDate === d.date, disabled: !d.aula }}
                    >
                        <Text style={styles.dayLabel}>{d.label.toLowerCase()}</Text>
                        <View style={[styles.circle, selectedDate === d.date && styles.active]}>
                            <Text style={selectedDate === d.date ? styles.todayText : styles.dayText}>{d.day}</Text>
                        </View>
                        {d.aula && <View style={[styles.dot, d.aula.status === "confirmado" ? styles.dotConfirmed : styles.dotQueue]} />}
                    </TouchableOpacity>
                ))}
            </ScrollView>
            {selectedDayData && selectedDayData.aula && (
                <View style={styles.selectedDayCard}>
                    <Text style={styles.cardTitle}>
                        {selectedDayData.aula.modalidade} • {selectedDayData.aula.horario}
                    </Text>
                    <Text style={styles.cardMeta}>
                        {selectedDayData.label}, {String(selectedDayData.day).padStart(2, '0')}/{selectedDayData.month}
                    </Text>
                </View>
            )}
        </View>
    );
};

const AvailableClassItem = ({ aula, userGender = 'M', userLevel = 'iniciante', canBook, onBookPress }: { aula: ScheduleOccurrenceType; userGender?: string; userLevel?: string; canBook: boolean; onBookPress: (item: ScheduleOccurrenceType) => void }) => {
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
    const isBlocked = aula.status?.toLowerCase() === "bloqueada";

    return (
        <View style={styles.classCard}>
            <View style={styles.classTopRow}>
                <View style={styles.classDateRow}>
                    <CalendarDays size={14} color={BRAND_ORANGE} />
                    <Text style={styles.classDate}>{formatAvailableClassDate(aula.date)} · {aula.startTime.substring(0, 5)}</Text>
                </View>
                <StatusBadge status={aula.status?.toLowerCase() as BadgeStatus} />
            </View>
            <View style={styles.classBottomRow}>
                <View style={styles.classDetails}>
                    <Text style={styles.className} numberOfLines={1}>{aula.modalityName || aula.aulaName}</Text>
                    <Text style={styles.classMeta} numberOfLines={1}>
                        prof. {aula.professorName || "a definir"} · {aula.confirmedCount !== undefined && aula.maxCapacity !== undefined ? `${aula.confirmedCount}/${aula.maxCapacity}` : "-/-"} vagas
                    </Text>
                </View>
                {aula.subscriptionStatus ? (
                    <Text style={styles.classNotice}>
                        {aula.subscriptionStatus === 'Confirmado' ? 'confirmado ✓' :
                        aula.subscriptionStatus === 'ListaEspera' ? 'na fila' :
                        aula.subscriptionStatus === 'WaitlistPending' ? 'aguardando' :
                        aula.subscriptionStatus === 'CheckedIn' ? 'check-in feito' :
                        aula.subscriptionStatus === 'Faltou' ? 'faltou' : ''}
                    </Text>
                ) : isBlocked ? (
                    <Text style={styles.classWarning}>bloqueada</Text>
                ) : !isGenderAllowed ? (
                    <Text style={styles.classWarning}>apenas {getGenderLabel(gender).substring(2).toLowerCase()}</Text>
                ) : !isLevelAllowed ? (
                    <Text style={styles.classWarning}>nível {capitalizeText(level).toLowerCase()}</Text>
                ) : (
                    <TouchableOpacity
                        style={[styles.bookButton, !canBook && styles.disabledButton]}
                        hitSlop={4}
                        onPress={() => onBookPress(aula)}
                        accessibilityRole="button"
                        accessibilityHint={!canBook ? "É necessário um plano ativo para agendar." : undefined}
                        accessibilityLabel={`agendar ${aula.modalityName || aula.aulaName} em ${formatAvailableClassDate(aula.date)} às ${aula.startTime.substring(0, 5)}`}
                    >
                        <Text style={styles.bookButtonText}>agendar</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function Home() {
    const refresh = useScreenRefresh([["user-next-class"], ["user-week-classes"], ["schedule"], ["plans", "current"]]);
    const { user } = useAuth();
    const { canBook, ensureCanBook } = useBookingEligibility();
    const { createSchedule, isLoading: isCreatingSchedule } = useCreateSchedule();

    const [selectedClass, setSelectedClass] = useState<ScheduleOccurrenceType | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const handleBookPress = (item: ScheduleOccurrenceType) => {
        if (!ensureCanBook()) return;
        setSelectedClass(item);
        setIsModalVisible(true);
    };

    const handleConfirmBooking = async () => {
        if (!selectedClass) return;
        if (!ensureCanBook()) {
            setIsModalVisible(false);
            setSelectedClass(null);
            return;
        }

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
        <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
            <ClientHeader />
            <RefreshableFlatList {...refresh}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                data={scheduleLoading ? [] : (schedule?.items || []).slice(0, 3)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <AvailableClassItem aula={item} userGender={user?.gender} userLevel={user?.studentLevel} canBook={canBook} onBookPress={handleBookPress} />}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View>
                        <UserProfile user={user} />
                        <NextClassCard />
                        <Text style={styles.sectionTitle}>aulas da semana</Text>
                        <WeekCalendar />
                        <View style={styles.availableHeading}>
                            <Text style={styles.sectionTitle}>aulas disponíveis</Text>
                            <Text style={styles.sectionSubtitle}>abertas para agendamento</Text>
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        {scheduleLoading ? (
                            <ActivityIndicator color={BRAND_ORANGE} />
                        ) : (
                            <CalendarDays size={24} color={BRAND_ORANGE} />
                        )}
                        <Text style={styles.emptyText}>
                            {scheduleLoading ? "carregando aulas..." : "nenhuma aula disponível no momento"}
                        </Text>
                    </View>
                }
                ListFooterComponent={
                    <TouchableOpacity
                        style={styles.seeAllLink}
                        onPress={() => router.push("/schedule")}
                        accessibilityRole="link"
                        accessibilityLabel="Ver todas as aulas na tela de agendamento"
                    >
                        <Text style={styles.seeAllLinkText}>ver todas as aulas</Text>
                    </TouchableOpacity>
                }
            />
            <ConfirmBookingModal
                visible={isModalVisible}
                selectedClass={selectedClass}
                isCreatingSchedule={isCreatingSchedule}
                isBookingBlocked={!canBook}
                onClose={() => setIsModalVisible(false)}
                onConfirm={handleConfirmBooking}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    list: {
        flex: 1,
        backgroundColor: "#FFFFFF",
    },
    listContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
        paddingBottom: 32,
    },
    profile: {
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        marginBottom: 24,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: BRAND_ORANGE,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
    profileText: {
        flex: 1,
        minWidth: 0,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
    },
    title: {
        flexShrink: 1,
        color: INK,
        fontSize: 25,
        fontWeight: "bold",
        letterSpacing: -0.6,
    },
    profileMeta: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
    },
    profileLocation: {
        flexShrink: 1,
        color: MUTED,
        fontSize: 13,
    },
    subtitleContainer: {
        minHeight: 24,
        paddingHorizontal: 9,
        justifyContent: "center",
        borderRadius: 8,
    },
    subtitle: {
        fontSize: 11,
        fontWeight: "bold",
    },
    nextClassCard: {
        backgroundColor: BRAND_ORANGE,
        borderRadius: 18,
        padding: 20,
        marginBottom: 28,
    },
    nextClassHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    nextClassLabel: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
        marginBottom: 10,
    },
    nextClassTitle: {
        color: "#FFFFFF",
        fontSize: 24,
        lineHeight: 29,
        fontWeight: "bold",
        letterSpacing: -0.5,
    },
    nextClassDetail: {
        color: "#FFFFFF",
        fontSize: 14,
        lineHeight: 21,
        marginTop: 8,
    },
    nextClassFooter: {
        marginTop: 18,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: "#FFFFFF66",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
    },
    nextClassMeta: {
        flex: 1,
        minWidth: 170,
        gap: 8,
    },
    nextClassStatus: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "bold",
    },
    countdownRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    countdownText: {
        color: "#FFFFFF",
        fontSize: 12,
    },
    cancelButton: {
        minHeight: 48,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#FFFFFF",
        borderRadius: 10,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    disabledButton: {
        opacity: 0.6,
    },
    nextClassAction: {
        alignSelf: "flex-start",
        minHeight: 48,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 18,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: "#FFFFFF",
        borderRadius: 10,
    },
    nextClassActionText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    sectionTitle: {
        color: INK,
        fontSize: 21,
        fontWeight: "bold",
        letterSpacing: -0.5,
        marginBottom: 14,
    },
    sectionSubtitle: {
        color: MUTED,
        fontSize: 13,
        marginTop: -8,
        marginBottom: 14,
    },
    availableHeading: {
        marginTop: 2,
    },
    weekCard: {
        marginBottom: 24,
    },
    weekRow: {
        flexGrow: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 0,
    },
    dayItem: {
        width: 40,
        minHeight: 70,
        alignItems: "center",
        justifyContent: "center",
    },
    dayLabel: {
        color: MUTED,
        fontSize: 11,
        marginBottom: 6,
    },
    circle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#F3F4F6",
        alignItems: "center",
        justifyContent: "center",
    },
    active: {
        backgroundColor: BRAND_ORANGE,
    },
    todayText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "bold",
    },
    dayText: {
        color: INK,
        fontSize: 14,
        fontWeight: "bold",
    },
    dot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        marginTop: 5,
    },
    dotConfirmed: {
        backgroundColor: BRAND_ORANGE,
    },
    dotQueue: {
        backgroundColor: MUTED,
    },
    selectedDayCard: {
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        paddingTop: 10,
        marginTop: 6,
    },
    cardTitle: {
        color: INK,
        fontSize: 15,
        fontWeight: "bold",
    },
    cardMeta: {
        color: MUTED,
        fontSize: 12,
        marginTop: 4,
    },
    classCard: {
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
        backgroundColor: "#F6F7F8",
    },
    classTopRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        marginBottom: 7,
    },
    classDateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
    },
    classDate: {
        color: BRAND_ORANGE,
        fontSize: 12,
        fontWeight: "bold",
    },
    classBottomRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
    },
    classDetails: {
        flex: 1,
        minWidth: 0,
    },
    className: {
        color: INK,
        fontSize: 16,
        fontWeight: "bold",
        letterSpacing: -0.3,
    },
    classMeta: {
        color: MUTED,
        fontSize: 12,
        marginTop: 3,
    },
    classNotice: {
        color: BRAND_ORANGE,
        fontSize: 11,
        fontWeight: "bold",
        textAlign: "right",
        maxWidth: 100,
    },
    classWarning: {
        color: "#B42318",
        fontSize: 11,
        fontWeight: "bold",
        textAlign: "right",
        maxWidth: 100,
    },
    bookButton: {
        minHeight: 36,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: BRAND_ORANGE,
    },
    bookButtonText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "bold",
    },
    emptyState: {
        minHeight: 110,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 20,
    },
    emptyText: {
        color: MUTED,
        fontSize: 14,
        textAlign: "center",
    },
    seeAllLink: {
        minHeight: 44,
        alignSelf: "center",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 8,
        paddingHorizontal: 12,
    },
    seeAllLinkText: {
        color: BRAND_ORANGE,
        fontSize: 14,
        fontWeight: "bold",
    },
    skeletonLabel: {
        width: 90,
        height: 14,
        borderRadius: 4,
        backgroundColor: "#FFFFFF66",
        marginBottom: 18,
    },
    skeletonTitle: {
        width: "75%",
        height: 24,
        borderRadius: 4,
        backgroundColor: "#FFFFFF66",
        marginBottom: 10,
    },
    skeletonSubtitle: {
        width: "58%",
        height: 16,
        borderRadius: 4,
        backgroundColor: "#FFFFFF66",
        marginBottom: 20,
    },
    skeletonBadge: {
        width: 120,
        height: 32,
        borderRadius: 8,
        backgroundColor: "#FFFFFF66",
    },
    skeletonDayLabel: {
        width: 22,
        height: 10,
        borderRadius: 4,
        backgroundColor: "#E5E7EB",
        marginBottom: 7,
    },
    skeletonCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: "#E5E7EB",
    },
});
