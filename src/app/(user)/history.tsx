import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { useCategories } from '@/hooks/categories.hooks';
import { useBookingUserHistory, useMyMonthlySchedule } from '@/hooks/schedule.hooks';
import { Category } from '@/types/categories.types';
import { BookingUserHistoryType, MyMonthlyScheduleType } from '@/types/schedules.types';
import { AlertTriangle, Check, InfinityIcon, X } from 'lucide-react-native';

type Filtro = 'Todas' | string;

const HistorySummary = ({ data, loading }: { data: MyMonthlyScheduleType | undefined, loading: boolean }) => {
    const totalPresencas = data?.totalPresencas || 0;
    const totalFaltas = data?.totalFaltas || 0;
    const available = data?.availableForSchedulingThisMonth !== undefined ? data.availableForSchedulingThisMonth : 0;
    const totalUsed = data?.totalUsedThisMonth || 0;

    const isUnlimited = available === null;
    const totalPlan = isUnlimited ? null : totalUsed + (available || 0);
    const percentage = isUnlimited ? 100 : (totalPlan && totalPlan > 0 ? Math.round((totalUsed / totalPlan) * 100) : 0);

    return (
        <View style={styles.summaryContainer}>
            <Text style={styles.monthTitle}>Mês Atual</Text>
            {loading ? (
                <ActivityIndicator size="small" color={COLORS.mainOrange} style={{ marginVertical: 20 }} />
            ) : (
                <>
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{totalPresencas}</Text>
                            <Text style={styles.statLabel}>Presenças</Text>
                        </View>
                        <View style={styles.statBox}>
                            <Text style={styles.statNumber}>{totalFaltas}</Text>
                            <Text style={styles.statLabel}>Faltas</Text>
                        </View>
                        <View style={styles.statBox}>
                            {isUnlimited ? (
                                <InfinityIcon size={24} color={COLORS.foreground} />
                            ) : (
                                <Text style={styles.statNumber}>{available}</Text>
                            )}
                            <Text style={styles.statLabel}>Restantes</Text>
                        </View>
                    </View>
                    <View>
                        <View style={styles.progressTextRow}>
                            <Text style={styles.progressLabel}>
                                {isUnlimited ? `${totalUsed} check-ins no plano ilimitado` : `${totalUsed}/${totalPlan} check-ins do plano`}
                            </Text>
                            {!isUnlimited && <Text style={styles.progressLabel}>{percentage}%</Text>}
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
                        </View>
                    </View>
                </>
            )}
        </View>
    );
};

const CategoryFilter = ({
    categories,
    loading,
    selected,
    onSelect
}: {
    categories: Category[] | undefined,
    loading: boolean,
    selected: Filtro,
    onSelect: (id: string) => void
}) => (
    <View style={styles.filterContainer}>
        {loading ? (
            <ActivityIndicator size="small" color={COLORS.mainOrange} />
        ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ selected: selected === 'Todas' }}
                    style={[styles.filterPill, selected === 'Todas' && styles.filterPillSelected]}
                    onPress={() => onSelect('Todas')}
                >
                    <Text style={[styles.filterText, selected === 'Todas' && styles.filterTextSelected]}>Todas</Text>
                </TouchableOpacity>
                {categories?.map((cat: Category) => (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityState={{ selected: selected === cat.name }}
                        key={cat.id}
                        style={[styles.filterPill, selected === cat.name && styles.filterPillSelected]}
                        onPress={() => onSelect(cat.id)}
                    >
                        <Text style={[styles.filterText, selected === cat.name && styles.filterTextSelected]}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        )}
    </View>
);

const statusConfig = {
    Confirmado: { label: 'Confirmado — aguardando aula', variant: 'warning', icon: AlertTriangle, color: COLORS.mainOrange, bg: '#FFF2E9' },
    CheckedIn: { label: 'Presente ✓', variant: 'success', icon: Check, color: '#16a34a', bg: '#dcfce7' },
    Faltou: { label: 'Falta não cancelada ⚠', variant: 'destructive', icon: X, color: '#ef4444', bg: '#fee2e2' },
    default: { label: 'Status Desconhecido', variant: 'warning', icon: AlertTriangle, color: '#6b7280', bg: '#f3f4f6' }
};

const HistoryCard = ({
    item
}: {
    item: BookingUserHistoryType
}) => {
    const config = statusConfig[item.bookingStatus as keyof typeof statusConfig] || statusConfig.default;
    const Icon = config.icon;

    const dateObj = new Date(item.ocorrenciaDate);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const formattedDate = `${day}/${month}`;

    const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diaSemana = diasSemana[dateObj.getDay()];

    const formattedTime = item.startTime.substring(0, 5);

    return (
        <View
            style={[
                styles.card,
                item.bookingStatus === 'Faltou' && { borderLeftWidth: 3, borderLeftColor: '#ef4444' }
            ]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                    <View style={styles.dateBox}>
                        <Text style={styles.dayText}>{diaSemana}</Text>
                        <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.modalityText}>{item.modalityName || item.aulaName} {formattedTime}</Text>
                        <Text style={styles.profText}>Prof. {item.professorName}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: config.bg }]}>
                        <Icon size={10} color={config.color} />
                        <Text style={[styles.badgeText, { color: config.color }]}>
                            {config.label.split(' ')[0]}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function History() {
    const { categories, isLoading: categoriesLoading } = useCategories();
    const [filtroId, setFiltroId] = useState<string>('Todas');
    const [filtroName, setFiltroName] = useState<string>('Todas');

    const { bookingUserHistory, isLoading } = useBookingUserHistory({
        page: 1,
        pageSize: 50,
        modalityId: filtroId === 'Todas' ? undefined : filtroId
    });

    const { myMonthlySchedule, isLoading: isMonthlyLoading } = useMyMonthlySchedule({
        modalityId: filtroId === 'Todas' ? undefined : filtroId
    });

    const filtered = bookingUserHistory?.items?.filter(p => filtroName === 'Todas' || p.modalityName === filtroName) || [];

    return (
        <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
            <ClientHeader />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={styles.intro}>
                    <Text style={styles.screenTitle}>histórico</Text>
                    <Text style={styles.screenSubtitle}>Suas aulas e seu ritmo no mês.</Text>
                </View>
                <HistorySummary data={myMonthlySchedule} loading={isMonthlyLoading} />

                <Text style={styles.sectionTitle}>aulas</Text>
                <CategoryFilter 
                    categories={categories} 
                    loading={categoriesLoading} 
                    selected={filtroName} 
                    onSelect={(id) => {
                        if (id === 'Todas') {
                            setFiltroId('Todas');
                            setFiltroName('Todas');
                        } else {
                            const cat = categories?.find(c => c.id === id);
                            setFiltroId(id);
                            setFiltroName(cat ? cat.name : 'Todas');
                        }
                    }} 
                />

                <View style={styles.listContainer}>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => <View key={i} style={styles.skeletonCard} />)
                    ) : filtered.length > 0 ? (
                        filtered.map(p => (
                            <HistoryCard 
                                key={p.bookingId}
                                item={p}
                            />
                        ))
                    ) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyTitle}>Nenhuma aula por aqui.</Text>
                            <Text style={styles.emptyText}>Tente outra modalidade ou volte depois.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    content: { paddingBottom: 32 },
    intro: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
    screenTitle: { fontSize: 30, fontWeight: '800', letterSpacing: -1.2, color: COLORS.foreground },
    screenSubtitle: { fontSize: 14, lineHeight: 21, color: COLORS.mutedForeground, marginTop: 4 },
    sectionTitle: { color: COLORS.foreground, fontSize: 19, fontWeight: '800', letterSpacing: -0.5, marginHorizontal: 20, marginBottom: 12 },
    empty: { padding: 24, borderWidth: 1, borderColor: '#E8E9EC', borderRadius: 18, gap: 5, marginTop: 8 },
    emptyTitle: { color: COLORS.foreground, fontSize: 17, fontWeight: '800' },
    emptyText: { color: COLORS.mutedForeground, fontSize: 13 },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    summaryContainer: {
        marginHorizontal: 20,
        marginTop: 18,
        marginBottom: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: '#E8E9EC',
        borderRadius: 18,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: -0.4,
        color: COLORS.foreground,
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 18,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 14,
        backgroundColor: '#F7F7F8',
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.foreground,
    },
    statLabel: {
        fontSize: 11,
        color: '#6b7280',
        marginTop: 2,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#ECEDEF',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.mainOrange,
        borderRadius: 4,
    },
    filterContainer: {
        paddingBottom: 18,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        minHeight: 42,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E8E9EC',
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    filterPillSelected: {
        backgroundColor: COLORS.mainOrange,
        borderColor: COLORS.mainOrange,
    },
    filterText: {
        color: COLORS.foreground,
        fontWeight: '700',
        fontSize: 13,
    },
    filterTextSelected: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    skeletonCard: {
        height: 88,
        backgroundColor: '#F7F7F8',
        borderRadius: 18,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#E8E9EC',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dateBox: {
        alignItems: 'center',
        minWidth: 56,
        minHeight: 54,
        justifyContent: 'center',
        backgroundColor: '#FFF2E9',
        borderRadius: 11,
    },
    dayText: {
        fontSize: 11,
        color: COLORS.mainOrange,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 15,
        fontWeight: '800',
        color: COLORS.foreground,
    },
    infoBox: {
        flex: 1,
    },
    modalityText: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.foreground,
    },
    profText: {
        fontSize: 12,
        color: '#6b7280',
    },
    cardRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 5,
        borderRadius: 10,
        gap: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    expandedContent: {
        padding: 12,
        paddingTop: 0,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        marginTop: 4,
    },
    expandedText: {
        fontSize: 12,
        color: '#6b7280',
        marginBottom: 4,
    },
    expandedBold: {
        fontWeight: '600',
        color: '#0f172a',
    },
    detailBox: {
        backgroundColor: '#fee2e2',
        padding: 10,
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 8,
    },
    detailText: {
        fontSize: 12,
        color: '#ef4444',
    },
});
