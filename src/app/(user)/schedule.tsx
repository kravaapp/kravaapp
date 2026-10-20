import RefreshableFlatList from "@/components/RefreshableFlatList";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { ConfirmBookingModal } from '@/components/ConfirmBookingModal';
import { useToast } from '@/components/Toast';
import { useAuth } from '@/hooks/auth.hooks';
import { useBookingEligibility } from '@/hooks/bookingEligibility.hooks';
import { useCategories } from '@/hooks/categories.hooks';
import { useCreateSchedule, useSchedule } from '@/hooks/schedule.hooks';
import { normalizeApiError } from '@/routes/apiError';
import { Category } from '@/types/categories.types';
import { ScheduleOccurrenceType } from '@/types/schedules.types';
import { getStudentLevelWeight, normalizeStudentLevel } from '@/utils/studentLevel';
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
            hitSlop={{ top: 4, bottom: 4 }}
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
            accessibilityLabel={`${day.label}, ${day.day}/${day.month}/${day.id.slice(0, 4)}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.dayLabel, isSelected && styles.dayTextSelected]}>{day.label}</Text>
            <Text style={[styles.dayNumber, isSelected && styles.dayTextSelected]}>
              {day.day}<Text style={[styles.dayMonth, isSelected && styles.dayTextSelected]}>/{day.month}</Text>
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  </View>
);

const getLevelStyle = (level: string) => {
  switch (normalizeStudentLevel(level)) {
    case 'avancado': return { color: COLORS.foreground, backgroundColor: '#F3F4F6' };
    case 'intermediario': return { color: COLORS.foreground, backgroundColor: '#FFF0E7' };
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
  canBook: boolean;
  onBookPress: (item: ScheduleOccurrenceType) => void;
};

const ClassCard = ({ item, userGender = 'M', userLevel = 'iniciante', canBook, onBookPress }: ClassCardProps) => {
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
  const isLevelAllowed = getStudentLevelWeight(userLevel) >= getStudentLevelWeight(level);

  const isCardDisabled =
    isCancelled ||
    !isGenderAllowed ||
    !isLevelAllowed ||
    (isClassPast && !item.subscriptionStatus);

  // Vagas e status
  const confirmed = item.confirmedCount ?? 0;
  const capacity = item.maxCapacity ?? 0;
  const remainingSpots = typeof item.maxCapacity === 'number' && typeof item.confirmedCount === 'number'
    ? Math.max(0, item.maxCapacity - item.confirmedCount)
    : null;
  const isFull = remainingSpots !== null && remainingSpots === 0;

  // Cor da barra vertical por status/disponibilidade
  const stripeColor = useMemo(() => {
    if (isCancelled || isClassPast) return '#9CA3AF';
    if (isFull) return '#EF4444';
    if (remainingSpots !== null && remainingSpots <= 3) return '#F59E0B';
    return '#10B981';
  }, [isCancelled, isClassPast, isFull, remainingSpots]);

  // Título e subtítulo limpo (sem professor, sem nível redundante)
  const title = item.aulaName || item.modalityName || "Aula";
  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (item.modalityName && item.modalityName.toLowerCase() !== title.toLowerCase()) {
      parts.push(item.modalityName);
    }
    const normLevel = capitalizeText(level);
    if (level && !title.toLowerCase().includes(level.toLowerCase())) {
      parts.push(normLevel);
    }
    if (gender) {
      parts.push(getGenderLabel(gender));
    }
    return parts.join(' · ');
  }, [item.modalityName, title, level, gender]);

  return (
    <View style={[styles.classCard, isCardDisabled && styles.classCardDisabled]}>
      {/* Barra vertical de status */}
      <View style={[styles.statusStripe, { backgroundColor: stripeColor }]} />

      {/* Horário (Início grande + Fim discreto) */}
      <View style={styles.timeSection}>
        <Text style={styles.classTime}>{startTime}</Text>
        {endTime ? <Text style={styles.classEndTime}>{endTime}</Text> : null}
      </View>

      {/* Informações centrais */}
      <View style={styles.classDetails}>
        <Text style={styles.classTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.classSubtitle} numberOfLines={1}>{subtitle}</Text> : null}

        {/* Vagas + Tag de status */}
        <View style={styles.spotsRow}>
          <Text style={styles.spotsCountText}>
            {capacity > 0 ? `${confirmed}/${capacity}` : `${confirmed}`}
          </Text>
          {isCancelled ? (
            <View style={[styles.spotTag, styles.spotTagCancelled]}>
              <Text style={[styles.spotTagText, styles.spotTagTextCancelled]}>CANCELADA</Text>
            </View>
          ) : isFull ? (
            <View style={[styles.spotTag, styles.spotTagFull]}>
              <Text style={[styles.spotTagText, styles.spotTagTextFull]}>LOTADA · ESPERA</Text>
            </View>
          ) : remainingSpots !== null && remainingSpots <= 3 ? (
            <View style={[styles.spotTag, styles.spotTagUrgent]}>
              <Text style={[styles.spotTagText, styles.spotTagTextUrgent]}>
                {remainingSpots} {remainingSpots === 1 ? 'VAGA' : 'VAGAS'}
              </Text>
            </View>
          ) : remainingSpots !== null ? (
            <View style={[styles.spotTag, styles.spotTagAvailable]}>
              <Text style={[styles.spotTagText, styles.spotTagTextAvailable]}>
                {remainingSpots} VAGAS
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Ação à direita */}
      <View style={styles.actionSection}>
        {isCancelled ? (
          <View style={styles.slimBadgeCancelled}>
            <Text style={styles.slimBadgeCancelledText}>Cancelada</Text>
          </View>
        ) : item.subscriptionStatus ? (
          <View style={[
            styles.slimStatusBadge,
            item.subscriptionStatus === 'Confirmado' || item.subscriptionStatus === 'CheckedIn'
              ? styles.slimStatusBadgeConfirmed
              : item.subscriptionStatus === 'Faltou'
              ? styles.slimStatusBadgeMissed
              : styles.slimStatusBadgeWaitlist
          ]}>
            <Text style={[
              styles.slimStatusBadgeText,
              item.subscriptionStatus === 'Confirmado' || item.subscriptionStatus === 'CheckedIn'
                ? styles.slimStatusBadgeTextConfirmed
                : item.subscriptionStatus === 'Faltou'
                ? styles.slimStatusBadgeTextMissed
                : styles.slimStatusBadgeTextWaitlist
            ]}>
              {item.subscriptionStatus === 'Confirmado' ? 'Agendado ✓' :
               item.subscriptionStatus === 'CheckedIn' ? 'Check-in ✓' :
               item.subscriptionStatus === 'ListaEspera' ? 'Na Fila' :
               item.subscriptionStatus === 'WaitlistPending' ? 'Fila Pend.' :
               item.subscriptionStatus === 'Faltou' ? 'Faltou' : ''}
            </Text>
          </View>
        ) : isClassPast ? (
          <View style={styles.slimBadgePast}>
            <Text style={styles.slimBadgePastText}>Encerrada</Text>
          </View>
        ) : !isGenderAllowed ? (
          <View style={styles.slimBadgeRestricted}>
            <Text style={styles.slimBadgeRestrictedText}>{getGenderLabel(gender)}</Text>
          </View>
        ) : !isLevelAllowed ? (
          <View style={styles.slimBadgeRestricted}>
            <Text style={styles.slimBadgeRestrictedText}>{capitalizeText(level)}</Text>
          </View>
        ) : !isReleased ? (
          <View style={styles.slimBadgeRelease}>
            <Clock size={12} color="#6B7280" />
            <Text style={styles.slimBadgeReleaseText}>{timeUntilRelease}</Text>
          </View>
        ) : isFull ? (
          <TouchableOpacity
            style={[styles.slimWaitlistButton, !canBook && styles.bookButtonDisabled]}
            onPress={() => onBookPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Entrar na lista de espera para ${title}`}
          >
            <Text style={styles.slimWaitlistButtonText}>Espera</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.slimBookButton, !canBook && styles.bookButtonDisabled]}
            onPress={() => onBookPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Reservar aula ${title}`}
            accessibilityHint={!canBook ? "É necessário um plano ativo para agendar." : undefined}
          >
            <Text style={styles.slimBookButtonText}>Reservar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function Schedule() {
  const refresh = useScreenRefresh([
    ["categories", { isActive: true }],
    ["schedule"],
    ["plans", "current"],
  ]);
  const { user } = useAuth();
  const { toast } = useToast();
  const { canBook, ensureCanBook } = useBookingEligibility();
  const { categories: rawCategories, isLoading: categoriesLoading, error: categoriesError } =
    useCategories({ isActive: true });
  const categories = useMemo(
    () => (rawCategories ?? []).filter((c) => c.isActive),
    [rawCategories],
  );
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

    try {
      await createSchedule({ ocorrenciaId: selectedClass.id });
      setIsModalVisible(false);
      setSelectedClass(null);
    } catch (err) {
      setIsModalVisible(false);
      setSelectedClass(null);
      toast({
        title: "Agendamento",
        description: normalizeApiError(err, "Não foi possível realizar o agendamento.").description,
        variant: "destructive",
      });
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
        label: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : labels[date.getDay()],
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
          style={styles.scheduleList}
          data={scheduleLoading || scheduleError ? [] : schedule?.items || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ClassCard item={item} userGender={user?.gender} userLevel={user?.studentLevel} canBook={canBook} onBookPress={handleBookPress} key={item.id} />}
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
        isBookingBlocked={!canBook}
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
    flexShrink: 0,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  screenIntro: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  screenTitle: {
    color: COLORS.foreground,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  filterContainer: {
    marginTop: 10,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D8DDE3',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  filterSkeleton: {
    width: 76,
    height: 36,
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
    fontWeight: '600',
    fontSize: 12,
  },
  filterTextSelected: {
    color: '#fff',
  },
  calendarContainer: {
    marginTop: 10,
  },
  calendarContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dayCard: {
    minWidth: 64,
    minHeight: 52,
    borderRadius: 10,
    backgroundColor: '#F4F5F7',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dayCardSelected: {
    backgroundColor: COLORS.mainOrange,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.mutedForeground,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.foreground,
  },
  dayMonth: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  dayTextSelected: {
    color: '#fff',
  },
  scheduleList: {
    flex: 1,
    minHeight: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 8,
  },
  classCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  classCardDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.75,
  },
  statusStripe: {
    width: 4,
    height: 44,
    borderRadius: 2,
  },
  timeSection: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTime: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  classEndTime: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.mutedForeground,
    marginTop: 1,
  },
  classDetails: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  classTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  classSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  spotsCountText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  spotTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  spotTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  spotTagAvailable: {
    backgroundColor: '#ECFDF5',
  },
  spotTagTextAvailable: {
    color: '#059669',
  },
  spotTagUrgent: {
    backgroundColor: '#FEF3C7',
  },
  spotTagTextUrgent: {
    color: '#D97706',
  },
  spotTagFull: {
    backgroundColor: '#FEF3C7',
  },
  spotTagTextFull: {
    color: '#B45309',
  },
  spotTagCancelled: {
    backgroundColor: '#FEE2E2',
  },
  spotTagTextCancelled: {
    color: '#DC2626',
  },
  actionSection: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  slimBookButton: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimBookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  slimWaitlistButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimWaitlistButtonText: {
    color: COLORS.foreground,
    fontSize: 13,
    fontWeight: '600',
  },
  bookButtonDisabled: {
    opacity: 0.5,
  },
  slimStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  slimStatusBadgeConfirmed: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  slimStatusBadgeTextConfirmed: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  slimStatusBadgeWaitlist: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  slimStatusBadgeTextWaitlist: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '700',
  },
  slimStatusBadgeMissed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  slimStatusBadgeTextMissed: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
  slimBadgeCancelled: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  slimBadgeCancelledText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '600',
  },
  slimBadgePast: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  slimBadgePastText: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  slimBadgeRestricted: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  slimBadgeRestrictedText: {
    color: '#B42318',
    fontSize: 11,
    fontWeight: '600',
  },
  slimBadgeRelease: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  slimBadgeReleaseText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '500',
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
