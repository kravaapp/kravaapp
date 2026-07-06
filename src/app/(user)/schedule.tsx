import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { ConfirmBookingModal } from '@/components/ConfirmBookingModal';
import { useAuth } from '@/hooks/auth.hooks';
import { useCategories } from '@/hooks/categories.hooks';
import { useCreateSchedule, useSchedule } from '@/hooks/schedule.hooks';
import { Category } from '@/types/categories.types';
import { ScheduleOccurrenceType } from '@/types/schedules.types';
import { Clock } from 'lucide-react-native';
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
            <View key={`skeleton-${index}`} style={[styles.filterPill, { width: 80, backgroundColor: '#f1f5f9', borderColor: '#f1f5f9' }]} />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.filterContainer, { paddingHorizontal: 20 }]}>
        <Text style={{ fontSize: 12 }}>Erro ao carregar categorias</Text>
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
    case 'avançado': return { color: '#f59e0b', backgroundColor: '#fef3c7' };
    case 'intermediário': return { color: '#ea580c', backgroundColor: '#ffedd5' };
    default: return { color: '#9ca3af', backgroundColor: '#f3f4f6' };
  }
};

const getGenderStyle = (gender: string) => {
  switch (gender?.toUpperCase()) {
    case 'M': return { color: '#3b82f6', backgroundColor: '#dbeafe' };
    case 'F': return { color: '#ec4899', backgroundColor: '#fce7f3' };
    default: return { color: '#9ca3af', backgroundColor: '#f3f4f6' };
  }
};

const capitalizeText = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const getGenderLabel = (gender: string) => {
  switch (gender?.toUpperCase()) {
    case 'M': return '♂ Masculina';
    case 'F': return '♀ Feminina';
    default: return '⚥ Mista';
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
  const isEnded = false;

  const progress = typeof item.maxCapacity === 'number' && typeof item.confirmedCount === 'number'
    ? (item.confirmedCount / item.maxCapacity) * 100
    : 50;
  const level = item.minLevel || "iniciante";
  const gender = item.publicGender || "Mixed";

  const startTime = item.startTime.substring(0, 5);
  const endTime = item.endTime ? item.endTime.substring(0, 5) : '';

  const nowUtc = new Date().toISOString();
  const isReleased = !item.releaseAt || nowUtc >= item.releaseAt;
  const timeUntilRelease = !isReleased && item.releaseAt ? getTimeUntilClass(item.releaseAt.split('T')[0], item.releaseAt.split('T')[1]) : null;

  const isGenderAllowed = gender === 'Mixed' || gender === userGender;
  const isLevelAllowed = getLevelWeight(userLevel) >= getLevelWeight(level);

  const isCardDisabled = !isGenderAllowed || !isLevelAllowed;

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
            isEnded ? { backgroundColor: '#fdba74' } : { backgroundColor: COLORS.mainOrange }
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
          ) : !isGenderAllowed ? (
            <Text style={styles.disabledReasonText}>Apenas para o gênero {getGenderLabel(gender).substring(2)}</Text>
          ) : !isLevelAllowed ? (
            <Text style={styles.disabledReasonText}>Requer nível {capitalizeText(level)}</Text>
          ) : isReleased ? (
            <TouchableOpacity style={styles.bookButton} onPress={() => onBookPress(item)}>
              <Text style={styles.bookButtonText}>Agendar</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.releaseBadge}>
              <Clock size={12} color="#9ca3af" />
              <Text style={styles.releaseBadgeText}>Libera em {timeUntilRelease}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function Schedule() {
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

    await createSchedule({ ocorrenciaId: selectedClass.id });

    setIsModalVisible(false);
    setSelectedClass(null);
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
    if (categories?.length) {
      setSelectedCategory(categories[0].id);
    }
  }, [categories]);

  return (
    <SafeAreaView style={styles.container}>
      <ClientHeader />

      <View style={styles.fixedHeader}>
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

      {scheduleLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color={COLORS.mainOrange} />
        </View>
      ) : scheduleError ? (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ color: '#ef4444' }}>Erro ao carregar agenda</Text>
          <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 4 }}>{scheduleError}</Text>
        </View>
      ) : (
        <FlatList
          data={schedule?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClassCard item={item} userGender={user?.gender} userLevel={user?.studentLevel} onBookPress={handleBookPress} key={item.id} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ color: '#9ca3af' }}>Nenhuma aula encontrada para este dia</Text>
            </View>
          }
        />
      )}
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
    paddingBottom: 10,
  },
  filterContainer: {
    marginTop: 15,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 14,
  },
  filterTextSelected: {
    color: '#fff',
  },
  calendarContainer: {
    marginTop: 15,
  },
  calendarContent: {
    paddingHorizontal: 20,
    gap: 10,
  },
  dayCard: {
    width: 60,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#fff5f0',
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
    color: '#9ca3af',
  },
  dayNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6b7280',
    marginVertical: 2,
  },
  dayMonth: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dayTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  classCardDisabled: {
    opacity: 0.6,
    backgroundColor: '#f9fafb',
  },
  disabledReasonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  subscriptionStatusText: {
    color: COLORS.mainOrange,
    fontSize: 12,
    fontWeight: 'bold',
  },
  classHeaderRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeContainer: {
    width: 80,
    alignItems: 'center',
    marginRight: 10,
  },
  classTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.mainOrange,
  },
  classEndTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  classDetails: {
    flex: 1,
  },
  classTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.foreground,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  professorText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginLeft: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
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
    marginTop: 10,
  },
  bookButton: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  releaseBadgeText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },
});
