import { Check, Lock } from 'lucide-react-native';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { COLORS } from './ClientHeader';

export type BadgeStatus =
  | 'lotada'
  | 'encerrada'
  | 'confirmado'
  | 'bloqueada'
  | 'agendada'
  | 'em andamento';

type StatusBadgeProps = {
  status: BadgeStatus;
  label?: string;
};

const PulseDot = ({ color }: { color: string }) => {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulseDot, { backgroundColor: color, opacity }]} />;
};

export const StatusBadge = ({ status, label }: StatusBadgeProps) => {
  switch (status) {
    case 'lotada':
    case 'encerrada':
      return (
        <View style={styles.statusBadgeEnded}>
          <Text style={styles.statusTextEnded}>
            {label || (status === 'lotada' ? 'Lotada' : 'Encerrada')}
          </Text>
        </View>
      );
    case 'confirmado':
      return (
        <View style={styles.statusBadgeConfirmed}>
          <Check size={14} color="#22c55e" style={{ marginRight: 4 }} />
          <Text style={styles.statusTextConfirmed}>{label || 'Confirmado'}</Text>
        </View>
      );
    case 'agendada':
      return (
        <View style={styles.statusBadgeScheduled}>
          <Text style={styles.statusTextScheduled}>{label || 'Agendada'}</Text>
        </View>
      );
    case 'em andamento':
      return (
        <View style={styles.statusBadgeOngoing}>
          <PulseDot color={COLORS.success} />
          <Text style={styles.statusTextConfirmed}>{label || 'Em andamento'}</Text>
        </View>
      );
    case 'bloqueada':
      return (
        <View style={styles.statusBadgeLocked}>
          <Lock size={14} color="#f59e0b" style={{ marginRight: 4 }} />
          <Text style={styles.statusTextLocked}>{label || 'Nível insuficiente'}</Text>
        </View>
      );
    default:
      return null;
  }
};

const styles = StyleSheet.create({
  statusBadgeEnded: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusTextEnded: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },
  statusBadgeConfirmed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#dcfce7',
  },
  statusTextConfirmed: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  statusBadgeScheduled: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.infoSurface,
  },
  statusTextScheduled: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: '600',
  },
  statusBadgeOngoing: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.successSurface,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeLocked: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextLocked: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
