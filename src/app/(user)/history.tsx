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
                        <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
                            <Text style={[styles.statNumber, { color: '#16a34a' }]}>{totalPresencas}</Text>
                            <Text style={styles.statLabel}>Presenças</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
                            <Text style={[styles.statNumber, { color: '#ef4444' }]}>{totalFaltas}</Text>
                            <Text style={styles.statLabel}>Faltas</Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: '#f3f4f6' }]}>
                            {isUnlimited ? (
                                <InfinityIcon size={24} color="#6b7280" />
                            ) : (
                                <Text style={[styles.statNumber, { color: '#6b7280' }]}>{available}</Text>
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
                    style={[styles.filterPill, selected === 'Todas' && styles.filterPillSelected]}
                    onPress={() => onSelect('Todas')}
                >
                    <Text style={[styles.filterText, selected === 'Todas' && styles.filterTextSelected]}>Todas</Text>
                </TouchableOpacity>
                {categories?.map((cat: Category) => (
                    <TouchableOpacity
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
    Confirmado: { label: 'Confirmado — aguardando aula', variant: 'warning', icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
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

    const currentMonth = new Date().toISOString().substring(0, 7);
    const { myMonthlySchedule, isLoading: isMonthlyLoading } = useMyMonthlySchedule({
        modalityId: filtroId === 'Todas' ? undefined : filtroId
    });

    const filtered = bookingUserHistory?.items?.filter(p => filtroName === 'Todas' || p.modalityName === filtroName) || [];

    return (
        <SafeAreaView style={styles.container}>
            <ClientHeader />
            <ScrollView showsVerticalScrollIndicator={false}>
                <HistorySummary data={myMonthlySchedule} loading={isMonthlyLoading} />

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
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            <Text style={{ color: '#9ca3af' }}>Nenhum histórico encontrado</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    summaryContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    monthTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0f172a',
        marginBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        paddingVertical: 10,
    },
    statNumber: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 10,
        color: '#6b7280',
        marginTop: 2,
    },
    progressTextRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 12,
        color: '#6b7280',
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#e2e8f0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.mainOrange,
        borderRadius: 4,
    },
    filterContainer: {
        paddingBottom: 12,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        justifyContent: 'center',
    },
    filterPillSelected: {
        backgroundColor: COLORS.mainOrange,
        borderColor: COLORS.mainOrange,
    },
    filterText: {
        color: COLORS.foreground,
        fontWeight: '600',
        fontSize: 12,
    },
    filterTextSelected: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 10,
    },
    skeletonCard: {
        height: 64,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    dateBox: {
        alignItems: 'center',
        minWidth: 40,
    },
    dayText: {
        fontSize: 12,
        color: '#6b7280',
    },
    dateText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0f172a',
    },
    infoBox: {
        flex: 1,
    },
    modalityText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
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
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
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