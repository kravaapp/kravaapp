import { X } from 'lucide-react-native';
import Modal from "@/components/AppModal";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';

import { COLORS } from '@/components/ClientHeader';
import { ScheduleOccurrenceType } from '@/types/schedules.types';

type ConfirmBookingModalProps = {
  visible: boolean;
  selectedClass: ScheduleOccurrenceType | null;
  isCreatingSchedule: boolean;
  isBookingBlocked: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const ConfirmBookingModal = ({
  visible,
  selectedClass,
  isCreatingSchedule,
  isBookingBlocked,
  onClose,
  onConfirm
}: ConfirmBookingModalProps) => {
  if (!selectedClass) return null;

  const isWaitlist =
    selectedClass.confirmedCount !== undefined &&
    selectedClass.maxCapacity !== undefined &&
    selectedClass.confirmedCount >= selectedClass.maxCapacity;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
        disabled={isCreatingSchedule}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>confirmar agendamento</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} disabled={isCreatingSchedule}>
                <X size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>
                Deseja realmente {isWaitlist ? 'entrar na fila de espera' : 'agendar'} a aula de{' '}
                <Text style={{ fontWeight: 'bold' }}>{selectedClass.aulaName || selectedClass.modalityName}</Text> às{' '}
                <Text style={{ fontWeight: 'bold' }}>{selectedClass.startTime.substring(0, 5)}</Text>?
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={onClose}
                  disabled={isCreatingSchedule}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.modalButton, styles.modalButtonConfirm, isBookingBlocked && styles.modalButtonDisabled]}
                  onPress={onConfirm}
                  disabled={isCreatingSchedule}
                  accessibilityHint={isBookingBlocked ? "É necessário um plano ativo para agendar." : undefined}
                >
                  {isCreatingSchedule ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonConfirmText}>Confirmar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    padding: 22,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: COLORS.foreground,
  },
  modalBody: {
    gap: 20,
  },
  modalText: {
    fontSize: 16,
    color: COLORS.mutedForeground,
    lineHeight: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 18,
    minHeight: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  modalButtonCancel: {
    backgroundColor: '#F4F4F5',
  },
  modalButtonCancelText: {
    color: COLORS.foreground,
    fontWeight: '700',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.mainOrange,
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
});
