import { X } from 'lucide-react-native';
import {
  ActivityIndicator,
  Modal,
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
  onClose: () => void;
  onConfirm: () => void;
};

export const ConfirmBookingModal = ({
  visible,
  selectedClass,
  isCreatingSchedule,
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
              <Text style={styles.modalTitle}>Confirmar Agendamento</Text>
              <TouchableOpacity onPress={onClose} disabled={isCreatingSchedule}>
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
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={onClose}
                  disabled={isCreatingSchedule}
                >
                  <Text style={styles.modalButtonCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={onConfirm}
                  disabled={isCreatingSchedule}
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
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonCancelText: {
    color: '#4b5563',
    fontWeight: 'bold',
  },
  modalButtonConfirm: {
    backgroundColor: COLORS.mainOrange,
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
