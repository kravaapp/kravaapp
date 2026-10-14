import RefreshableFlatList from "@/components/RefreshableFlatList";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { ConfirmBookingModal } from '@/components/ConfirmBookingModal';
import { useAuth } from '@/hooks/auth.hooks';
import { useCategories } from '@/hooks/categories.hooks';
import { useCreateSchedule, useSchedule } from '@/hooks/schedule.hooks';
import { Category } from '@/types/categories.types';
import { ScheduleOccurrenceType } from '@/types/schedules.types';
import { AlertTriangle, ArrowRight, Clock } from 'lucide-react-native';
import { getTimeUntilClass } from '.';

// Types
type DayType = {
  id: string;
  label: string;
  day: string;
  month: string;
};



type CategoryFilterProps = {
  categories: Category[];
  selected: string;
  onSelect: (category: string) => void;
  isLoading: boolean;
  error: string | null;
};

const CategoryFilter = ({ categories, selected, onSelect, isLoading, error }: CategoryFilterProps) => {
  if (isLoading) {
    return (
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={`skeleton-${index}`} style={styles.filterSkeleton} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.filterError}>
        <Text style={styles.emptyText}>não foi possível carregar as modalidades</Text>
      </View>
    );
  }

  return (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
        {categories.map((cat: Category) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.filterPill, selected === cat.id && styles.filterPillSelected]}
            onPress={() => onSelect(cat.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: selected === cat.id }}
          >
            <Text style={[styles.filterText, selected === cat.id && styles.filterTextSelected]}>{cat.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

type DayCalendarProps = {
  days: DayType[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const DayCalendar = ({ days, selectedId, onSelect }: DayCalendarProps) => (
  <View style={styles.calendarContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.calendarContent}>
      {days.map((day) => {
        const isSelected = selectedId === day.id;
        return (
          <TouchableOpacity
            key={day.id}
            style={[styles.dayCard, isSelected && styles.dayCardSelected]}
            onPress={() => onSelect(day.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>{day.label}</Text>
            <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>{day.day}</Text>
            <Text style={[styles.dayMonth, isSelected && styles.dayTextSelected]}>{day.month}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const getLevelStyle = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'avançado': return { color: COLORS.foreground, backgroundColor: '#F3F4F6' };
    case 'intermediário': return { color: COLORS.foreground, backgroundColor: '#FFF0E7' };
    default: return { color: COLORS.foreground, backgroundColor: '#F3F4F6' };
  }
};

const getGenderStyle = (_gender: string) => {
  return { color: COLORS.foreground, backgroundColor: '#F3F4F6' };
};

const capitalizeText = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const getGenderLabel = (gender: string) => {
  switch (gender?.toUpperCase()) {
    case 'M': return 'Masculina';
    case 'F': return 'Feminina';
    default: return 'Mista';
  }
};

type ClassCardProps = {
  item: ScheduleOccurrenceType;
  userGender?: string;
  userLevel?: string;
  onBookPress: (item: ScheduleOccurrenceType) => void;
};

const getLevelWeight = (level: string) => {
  switch (level?.toLowerCase()) {
    case 'iniciante': return 1;
    case 'intermediario': return 2;
    case 'avancado': return 3;
    default: return 0;
  }
};

const ClassCard = ({ item, userGender = 'M', userLevel = 'iniciante', onBookPress }: ClassCardProps) => {
  const progress = typeof item.maxCapacity === 'number' && item.maxCapacity > 0 && typeof item.confirmedCount === 'number'
    ? Math.min(100, Math.max(0, (item.confirmedCount / item.maxCapacity) * 100))
    : 50;
  const level = item.minLevel || "iniciante";
  const gender = item.publicGender || "Mixed";

  const startTime = item.startTime.substring(0, 5);
  const endTime = item.endTime ? item.endTime.substring(0, 5) : '';

  const nowUtc = new Date().toISOString();
  const isReleased = !item.releaseAt || nowUtc >= item.releaseAt;
  const timeUntilRelease = !isReleased && item.releaseAt ? getTimeUntilClass(item.releaseAt.split('T')[0], item.releaseAt.split('T')[1]) : null;

  const isCancelled = item.status === 'Cancelada';

  const isClassPast = useMemo(() => {
    if (!item.date || !startTime) return false;
    const dateParts = item.date.split('-').map(Number);
    const timeParts = startTime.split(':').map(Number);
    if (dateParts.length !== 3 || timeParts.length !== 2) return false;
    const classStartDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1]);
    return new Date() >= classStartDate;
  }, [item.date, startTime]);

  const isGenderAllowed = gender === 'Mixed' || gender === userGender;
  const isLevelAllowed = getLevelWeight(userLevel) >= getLevelWeight(level);

  const isCardDisabled =
    isCancelled ||
    !isGenderAllowed ||
    !isLevelAllowed ||
    (isClassPast && !item.subscriptionStatus);

  return (
    <View style={[styles.classCard, isCardDisabled && styles.classCardDisabled]}>
      <View style={styles.classHeaderRow}>
        <View style={styles.timeContainer}>
          <Text style={styles.classTime}>{startTime}</Text>
          {endTime ? <Text style={styles.classEndTime}>{endTime}</Text> : null}
        </View>
        <View style={styles.classDetails}>
          <Text style={styles.classTitle}>{item.aulaName || item.modalityName}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: getLevelStyle(level).backgroundColor }]}>
              <Text style={[styles.tagText, { color: getLevelStyle(level).color }]}>{capitalizeText(level)}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: getGenderStyle(gender).backgroundColor }]}>
              <Text style={[styles.tagText, { color: getGenderStyle(gender).color }]}>
                {getGenderLabel(gender)}
              </Text>
            </View>
            <Text style={styles.professorText}>Prof. {item.professorName}</Text>
          </View>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBarBackground}>
          <View style={[
            styles.progressBarFill,
            { width: `${progress}%` },
            isCancelled && styles.progressBarFillCancelled,
          ]} />
        </View>
        <Text style={styles.progressText}>
          {item.confirmedCount !== undefined && item.maxCapacity !== undefined
            ? `${item.confirmedCount}/${item.maxCapacity}`
            : "- / -"}
        </Text>
      </View>

      <View style={styles.statusRow}>
        <View>
          {item.subscriptionStatus ? (
            <Text style={styles.subscriptionStatusText}>
              {item.subscriptionStatus === 'Confirmado' ? 'Agendamento Confirmado ✓' :
               item.subscriptionStatus === 'ListaEspera' ? 'Na Fila de Espera' :
               item.subscriptionStatus === 'WaitlistPending' ? 'Aguardando Confirmação' :
               item.subscriptionStatus === 'CheckedIn' ? 'Check-in Realizado' :
               item.subscriptionStatus === 'Faltou' ? 'Faltou' : ''}
            </Text>
          ) : isCancelled ? (
            <View style={styles.cancelledBadge}>
              <AlertTriangle size={16} color="#DC2626" />
              <Text style={styles.cancelledBadgeText}>Aula cancelada</Text>
            </View>
          ) : isClassPast ? (
            <View style={styles.closedBadge}>
              <Clock size={16} color="#9CA3AF" />
              <Text style={styles.closedBadgeText}>Horário encerrado</Text>
            </View>
          ) : !isGenderAllowed ? (
            <Text style={styles.disabledReasonText}>Apenas para o gênero {getGenderLabel(gender)}</Text>
          ) : !isLevelAllowed ? (
            <Text style={styles.disabledReasonText}>Requer nível {capitalizeText(level)}</Text>
          ) : isReleased ? (
            <TouchableOpacity style={styles.bookButton} onPress={() => onBookPress(item)} accessibilityRole="button">
              <Text style={styles.bookButtonText}>agendar</Text>
              <ArrowRight size={17} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.releaseBadge}>
              <Clock size={16} color={COLORS.mutedForeground} />
              <Text style={styles.releaseBadgeText}>Libera em {timeUntilRelease}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function Schedule() {
    const refresh = useScreenRefresh([["categories"], ["schedule"]]);
  const { user } = useAuth();
  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();
  const { createSchedule, isLoading: isCreatingSchedule } = useCreateSchedule();

  const [selectedClass, setSelectedClass] = useState<ScheduleOccurrenceType | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleBookPress = (item: ScheduleOccurrenceType) => {
    setSelectedClass(item);
    setIsModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedClass) return;

    try {
      await createSchedule({ ocorrenciaId: selectedClass.id });
      setIsModalVisible(false);
      setSelectedClass(null);
    } catch (err: any) {
      let errorMsg =
        err?.data?.detail ||
        err?.message ||
        "Não foi possível realizar o agendamento.";
      if (err?.response && typeof err.response.json === "function") {
        try {
          const errorBody = await err.response.json();
          if (errorBody?.detail) errorMsg = errorBody.detail;
        } catch {}
      }
      Alert.alert("Agendamento", errorMsg);
      setIsModalVisible(false);
      setSelectedClass(null);
    }
  };

  const next10Days = useMemo(() => {
    const days: DayType[] = [];
    const labels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const today = new Date();

    for (let i = 0; i < 10; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      days.push({
        id: `${year}-${month}-${day}`,
        label: labels[date.getDay()],
        day: day,
        month: month,
      });
    }
    return days;
  }, []);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDay, setSelectedDay] = useState(next10Days[0].id);

  const { schedule, isLoading: scheduleLoading, error: scheduleError } = useSchedule({
    startDate: selectedDay,
    endDate: selectedDay,
    modalityId: selectedCategory
  });

  useEffect(() => {
    if (categories?.length && !categories.some((category) => category.id === selectedCategory)) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories, selectedCategory]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ClientHeader />

      <View style={styles.fixedHeader}>
        <View style={styles.screenIntro}>
          <Text style={styles.screenTitle}>agendar aulas</Text>
          <Text style={styles.screenSubtitle}>Escolha a modalidade e o dia.</Text>
        </View>
        <CategoryFilter
          categories={categories || []}
          isLoading={categoriesLoading}
          error={categoriesError}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
        <DayCalendar
          days={next10Days}
          selectedId={selectedDay}
          onSelect={setSelectedDay}
        />
      </View>

        <RefreshableFlatList {...refresh}
          data={scheduleLoading || scheduleError ? [] : schedule?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClassCard item={item} userGender={user?.gender} userLevel={user?.studentLevel} onBookPress={handleBookPress} key={item.id} />}
          contentContainerStyle={[styles.listContent, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            scheduleLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color={COLORS.mainOrange} />
              </View>
            ) : scheduleError ? (
              <View style={styles.emptyState}>
                <Text style={styles.errorTitle}>não foi possível carregar a agenda</Text>
                <Text style={styles.emptyText}>{scheduleError}</Text>
              </View>
            ) : <View style={styles.emptyState}>
              <Text style={styles.emptyText}>nenhuma aula encontrada para este dia</Text>
            </View>
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
    backgroundColor: '#fff',
  },
  fixedHeader: {
    backgroundColor: '#fff',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenIntro: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  screenTitle: {
    color: COLORS.foreground,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -1.2,
  },
  screenSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    marginTop: 4,
  },
  filterContainer: {
    marginTop: 20,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8DDE3',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  filterSkeleton: {
    width: 88,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F1F3F5',
  },
  filterError: {
    paddingHorizontal: 20,
    marginTop: 16,
  },
  filterPillSelected: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  filterText: {
    color: COLORS.foreground,
    fontWeight: 'bold',
    fontSize: 14,
  },
  filterTextSelected: {
    color: '#fff',
  },
  calendarContainer: {
    marginTop: 16,
  },
  calendarContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dayCard: {
    width: 62,
    height: 78,
    borderRadius: 12,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dayCardSelected: {
    backgroundColor: COLORS.mainOrange,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },
  dayNumber: {
    fontSize: 21,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginVertical: 2,
  },
  dayMonth: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  dayTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classCardDisabled: {
    backgroundColor: '#f9fafb',
  },
  disabledReasonText: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: 'bold',
  },
  subscriptionStatusText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: 'bold',
  },
  classHeaderRow: {
    flexDirection: 'row',
    marginBottom: 18,
  },
  timeContainer: {
    width: 74,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0E7',
    borderRadius: 10,
    marginRight: 14,
    paddingVertical: 8,
  },
  classTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  classEndTime: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  classDetails: {
    flex: 1,
    minWidth: 0,
  },
  classTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.foreground,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  professorText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 6,
    backgroundColor: '#FFE4D3',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: COLORS.mainOrange,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  bookButton: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 16,
    minHeight: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  releaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    gap: 6,
  },
  releaseBadgeText: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  closedBadgeText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelledBadgeText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarFillCancelled: {
    backgroundColor: '#D1D5DB',
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    margin: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#B42318',
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
