import ClientHeader, { COLORS } from '@/components/ClientHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { useCategories } from '@/hooks/categories.hooks';
import { Category } from '@/types/categories.types';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Types
type DayType = {
  id: string;
  label: string;
  day: string;
  month: string;
};

type ClassType = {
  id: string;
  time: string;
  title: string;
  level: string;
  gender: string;
  professor: string;
  enrolled: number;
  capacity: number;
  status: 'encerrada' | 'confirmado' | 'bloqueada';
};

// Mock Data
const CATEGORIES = ['Futevôlei', 'Funcional', 'Todas'];

const DAYS: DayType[] = [
  { id: '1', label: 'Ter', day: '18', month: '03' },
  { id: '2', label: 'Qua', day: '19', month: '03' },
  { id: '3', label: 'Qui', day: '20', month: '03' },
  { id: '4', label: 'Sex', day: '21', month: '03' },
  { id: '5', label: 'Sáb', day: '22', month: '03' },
  { id: '6', label: 'Dom', day: '23', month: '03' },
];

const CLASSES: ClassType[] = [
  {
    id: '1',
    time: '08h00',
    title: 'Futevôlei',
    level: 'Iniciante',
    gender: 'Mista',
    professor: 'Prof. Ricardo',
    enrolled: 14,
    capacity: 14,
    status: 'encerrada',
  },
  {
    id: '2',
    time: '09h00',
    title: 'Futevôlei',
    level: 'Iniciante',
    gender: 'Masculina',
    professor: 'Prof. Ricardo',
    enrolled: 12,
    capacity: 14,
    status: 'encerrada',
  },
  {
    id: '3',
    time: '19h00',
    title: 'Futevôlei',
    level: 'Intermediário',
    gender: 'Mista',
    professor: 'Prof. Ricardo',
    enrolled: 11,
    capacity: 14,
    status: 'confirmado',
  },
  {
    id: '4',
    time: '20h00',
    title: 'Futevôlei',
    level: 'Avançado',
    gender: 'Masculina',
    professor: 'Prof. Ricardo',
    enrolled: 8,
    capacity: 14,
    status: 'bloqueada',
  },
];

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
  switch (level) {
    case 'Avançado': return { color: '#f59e0b', backgroundColor: '#fef3c7' };
    case 'Intermediário': return { color: '#ea580c', backgroundColor: '#ffedd5' };
    default: return { color: '#9ca3af', backgroundColor: '#f3f4f6' };
  }
};

const getGenderStyle = (gender: string) => {
  switch (gender) {
    case 'Masculina': return { color: '#3b82f6', backgroundColor: '#dbeafe' };
    default: return { color: '#9ca3af', backgroundColor: '#f3f4f6' };
  }
};

type ClassCardProps = {
  item: ClassType;
};

const ClassCard = ({ item }: ClassCardProps) => {
  const isLocked = item.status === 'bloqueada';
  const isConfirmed = item.status === 'confirmado';
  const isEnded = item.status === 'encerrada';

  const progress = (item.enrolled / item.capacity) * 100;

  return (
    <View style={styles.classCard}>
      <View style={styles.classHeaderRow}>
        <Text style={styles.classTime}>{item.time}</Text>
        <View style={styles.classDetails}>
          <Text style={styles.classTitle}>{item.title}</Text>
          <View style={styles.tagsRow}>
            <View style={[styles.tag, { backgroundColor: getLevelStyle(item.level).backgroundColor }]}>
              <Text style={[styles.tagText, { color: getLevelStyle(item.level).color }]}>{item.level}</Text>
            </View>
            <View style={[styles.tag, { backgroundColor: getGenderStyle(item.gender).backgroundColor }]}>
              <Text style={[styles.tagText, { color: getGenderStyle(item.gender).color }]}>
                {item.gender === 'Masculina' ? '♂ Masculina' : '⚥ Mista'}
              </Text>
            </View>
            <Text style={styles.professorText}>{item.professor}</Text>
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
        <Text style={styles.progressText}>{item.enrolled}/{item.capacity}</Text>
      </View>

      <View style={styles.statusRow}>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );
};

export default function Schedule() {
  const { categories, isLoading: categoriesLoading, error: categoriesError } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDay, setSelectedDay] = useState(DAYS[0].id);

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
          days={DAYS}
          selectedId={selectedDay}
          onSelect={setSelectedDay}
        />
      </View>

      <FlatList
        data={CLASSES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClassCard item={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  classHeaderRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  classTime: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fb923c',
    width: 80,
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
  },
});
