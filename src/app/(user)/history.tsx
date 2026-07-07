import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { useCategories } from '@/hooks/categories.hooks';
import { Category } from '@/types/categories.types';
import { AlertTriangle, Check, X } from 'lucide-react-native';

type Filtro = 'Todas' | string;

interface PresencaItem {
    id: string;
    data: string;
    dia: string;
    modalidadeId: string;
    modalidade: string;
    horario: string;
    professor: string;
    status: 'confirmado' | 'presente' | 'falta';
    detalhe?: string;
}

const presencas: PresencaItem[] = [
    { id: '1', data: '18/03', dia: 'Ter', modalidadeId: '1', modalidade: 'Futevôlei', horario: '19h', professor: 'Ricardo', status: 'confirmado' },
    { id: '2', data: '15/03', dia: 'Sáb', modalidadeId: '1', modalidade: 'Futevôlei', horario: '09h', professor: 'Ricardo', status: 'presente' },
    { id: '3', data: '13/03', dia: 'Qui', modalidadeId: '1', modalidade: 'Futevôlei', horario: '19h', professor: 'Ricardo', status: 'presente' },
    { id: '4', data: '11/03', dia: 'Ter', modalidadeId: '1', modalidade: 'Futevôlei', horario: '19h', professor: 'Ricardo', status: 'presente' },
    { id: '5', data: '08/03', dia: 'Sáb', modalidadeId: '1', modalidade: 'Futevôlei', horario: '09h', professor: 'Ricardo', status: 'presente' },
    { id: '6', data: '06/03', dia: 'Qui', modalidadeId: '1', modalidade: 'Futevôlei', horario: '20h', professor: 'Ricardo', status: 'falta',},
    { id: '7', data: '04/03', dia: 'Ter', modalidadeId: '1', modalidade: 'Futevôlei', horario: '19h', professor: 'Ricardo', status: 'presente' },
    { id: '8', data: '01/03', dia: 'Sáb', modalidadeId: '1', modalidade: 'Futevôlei', horario: '09h', professor: 'Ricardo', status: 'presente' },
];

// -- COMPONENTES INTERNOS --

const HistorySummary = () => (
    <View style={styles.summaryContainer}>
        <Text style={styles.monthTitle}>Março 2025</Text>
        <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: '#dcfce7' }]}>
                <Text style={[styles.statNumber, { color: '#16a34a' }]}>7</Text>
                <Text style={styles.statLabel}>Presenças</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#fee2e2' }]}>
                <Text style={[styles.statNumber, { color: '#ef4444' }]}>1</Text>
                <Text style={styles.statLabel}>Falta</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#f3f4f6' }]}>
                <Text style={[styles.statNumber, { color: '#6b7280' }]}>4</Text>
                <Text style={styles.statLabel}>Restantes</Text>
            </View>
        </View>
        <View>
            <View style={styles.progressTextRow}>
                <Text style={styles.progressLabel}>7/12 check-ins do plano</Text>
                <Text style={styles.progressLabel}>58%</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '58%' }]} />
            </View>
        </View>
    </View>
);

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
                        style={[styles.filterPill, selected === cat.id && styles.filterPillSelected]}
                        onPress={() => onSelect(cat.id)}
                    >
                        <Text style={[styles.filterText, selected === cat.id && styles.filterTextSelected]}>{cat.name}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        )}
    </View>
);

const statusConfig = {
    confirmado: { label: 'Confirmado — aguardando aula', variant: 'warning', icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
    presente: { label: 'Presente ✓', variant: 'success', icon: Check, color: '#16a34a', bg: '#dcfce7' },
    falta: { label: 'Falta não cancelada ⚠', variant: 'destructive', icon: X, color: '#ef4444', bg: '#fee2e2' },
};

const HistoryCard = ({
    item
}: {
    item: PresencaItem
}) => {
    const config = statusConfig[item.status];
    const Icon = config.icon;

    return (
        <View
            style={[
                styles.card,
                item.status === 'falta' && { borderLeftWidth: 3, borderLeftColor: '#ef4444' }
            ]}
        >
            <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                    <View style={styles.dateBox}>
                        <Text style={styles.dayText}>{item.dia}</Text>
                        <Text style={styles.dateText}>{item.data}</Text>
                    </View>
                    <View style={styles.infoBox}>
                        <Text style={styles.modalityText}>{item.modalidade} {item.horario}</Text>
                        <Text style={styles.profText}>Prof. {item.professor}</Text>
                    </View>
                </View>
                <View style={styles.cardRight}>
                    <View style={[styles.badge, { backgroundColor: config.bg }]}>
                        <Icon size={10} color={config.color} />
                        <Text style={[styles.badgeText, { color: config.color }]}>
                            {item.status === 'confirmado' ? 'Aguardando' : item.status === 'presente' ? 'Presente' : 'Falta'}
                        </Text>
                    </View>
                </View>
            </View>

            {item.detalhe && (
                <View style={styles.detailBox}>
                    <Text style={styles.detailText}>{item.detalhe}</Text>
                </View>
            )}
        </View>
    );
};

// -- TELA PRINCIPAL --

export default function History() {
    const { categories, isLoading: categoriesLoading } = useCategories();
    const [filtro, setFiltro] = useState<Filtro>('Todas');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 400);
        return () => clearTimeout(t);
    }, []);

    const filtered = presencas.filter(p => filtro === 'Todas' || p.modalidadeId === filtro);

    const statusConfig = {
        confirmado: { label: 'Confirmado — aguardando aula', variant: 'warning', icon: AlertTriangle, color: '#f59e0b', bg: '#fef3c7' },
        presente: { label: 'Presente ✓', variant: 'success', icon: Check, color: '#16a34a', bg: '#dcfce7' },
        falta: { label: 'Falta não cancelada ⚠', variant: 'destructive', icon: X, color: '#ef4444', bg: '#fee2e2' },
    };

    return (
        <SafeAreaView style={styles.container}>
            <ClientHeader />
            <ScrollView showsVerticalScrollIndicator={false}>
                <HistorySummary />

                <CategoryFilter 
                    categories={categories} 
                    loading={categoriesLoading} 
                    selected={filtro} 
                    onSelect={setFiltro} 
                />

                <View style={styles.listContainer}>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => <View key={i} style={styles.skeletonCard} />)
                    ) : (
                        filtered.map(p => (
                            <HistoryCard 
                                key={p.id}
                                item={p}
                            />
                        ))
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