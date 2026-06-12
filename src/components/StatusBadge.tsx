import { Check, Lock } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from './ClientHeader';

export type BadgeStatus = 'lotada' | 'encerrada' | 'confirmado' | 'bloqueada';

type StatusBadgeProps = {
  status: BadgeStatus;
  label?: string;
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
