import { AlertCircle, Ticket, X } from 'lucide-react-native';
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
import { useBookingSourcePreview } from '@/hooks/schedule.hooks';
import { BookingSourcePreviewType, ScheduleOccurrenceType } from '@/types/schedules.types';

/** "Será descontada do seu plano Mensal · 2 de 3 aulas nesta semana". */
const sourceDescription = (preview: BookingSourcePreviewType) => {
  const where = preview.kind === 'Plan'
    ? `do seu plano ${preview.label ?? ''}`.trim()
    : `do seu ${preview.label ?? 'parceiro'}`;
  if (preview.limit == null || preview.used == null) return `Será descontada ${where}.`;
  const unit = preview.kind === 'Plan' ? 'aulas nesta semana' : 'check-ins este mês';
  return `Será descontada ${where} · ${preview.used + 1} de ${preview.limit} ${unit}.`;
};

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
  const { preview, isLoading: isLoadingPreview } = useBookingSourcePreview(selectedClass?.id, visible);

  if (!selectedClass) return null;

  const sourceBlocked = preview?.kind === 'None';

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

              {isLoadingPreview ? (
                <View style={styles.sourceBox}>
                  <ActivityIndicator size="small" color={COLORS.mainOrange} />
                  <Text style={styles.sourceText}>Verificando seu saldo...</Text>
                </View>
              ) : preview && sourceBlocked ? (
                <View style={[styles.sourceBox, styles.sourceBoxBlocked]}>
                  <AlertCircle size={16} color={COLORS.destructive} />
                  <Text style={[styles.sourceText, styles.sourceTextBlocked]}>{preview.message}</Text>
                </View>
              ) : preview ? (
                <View style={styles.sourceBox}>
                  <Ticket size={16} color={COLORS.mainOrange} />
                  <Text style={styles.sourceText}>{sourceDescription(preview)}</Text>
                </View>
              ) : null}

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
                  style={[styles.modalButton, styles.modalButtonConfirm, (isBookingBlocked || sourceBlocked) && styles.modalButtonDisabled]}
                  onPress={onConfirm}
                  disabled={isCreatingSchedule || sourceBlocked}
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
  sourceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF4EC',
  },
  sourceBoxBlocked: {
    backgroundColor: '#FEF2F2',
  },
  sourceText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.foreground,
    fontWeight: '600',
  },
  sourceTextBlocked: {
    color: COLORS.destructive,
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
