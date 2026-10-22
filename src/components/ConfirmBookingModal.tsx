import { useEffect, useState } from 'react';
import { AlertCircle, X } from 'lucide-react-native';
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
import { useBookingOptions } from '@/hooks/schedule.hooks';
import { BookingOptionType, ScheduleOccurrenceType } from '@/types/schedules.types';

const optionTitle = (option: BookingOptionType) =>
  option.kind === 'Plan' ? `Plano ${option.label}`.replace(/^Plano (plano\b)/i, '$1') : option.label;

/** "2 de 3 nesta semana" (plano) ou "4 de 10 no mês" (parceiro); indisponível mostra o motivo. */
const optionBalance = (option: BookingOptionType) => {
  if (!option.available) return option.reason ?? 'Indisponível';
  const period = option.period === 'week' ? 'nesta semana' : 'no mês';
  return option.limit == null ? `Sem limite ${option.period === 'week' ? 'semanal' : 'mensal'}` : `${option.used} de ${option.limit} ${period}`;
};

type ConfirmBookingModalProps = {
  visible: boolean;
  selectedClass: ScheduleOccurrenceType | null;
  isCreatingSchedule: boolean;
  isBookingBlocked: boolean;
  onClose: () => void;
  /** origin: "Plan" ou o parceiro escolhido; undefined quando a API não oferece a escolha. */
  onConfirm: (origin?: string) => void;
};

export const ConfirmBookingModal = ({
  visible,
  selectedClass,
  isCreatingSchedule,
  isBookingBlocked,
  onClose,
  onConfirm
}: ConfirmBookingModalProps) => {
  const { bookingOptions, isLoading: isLoadingOptions } = useBookingOptions(selectedClass?.id, visible);
  const [selectedOrigin, setSelectedOrigin] = useState<string | null>(null);

  // Cada abertura começa da origem padrão: o plano, ou o único parceiro com saldo.
  useEffect(() => {
    setSelectedOrigin(bookingOptions?.defaultOrigin ?? null);
  }, [bookingOptions, visible]);

  if (!selectedClass) return null;

  const options = bookingOptions?.options ?? [];
  const selectedOption = options.find((option) => option.origin === selectedOrigin) ?? null;
  const hasAvailable = options.some((option) => option.available);
  // Sem a lista (API antiga), a API decide a origem; com ela, o aluno precisa de uma opção disponível.
  // Enquanto as opções carregam, não dá para confirmar sem saber de onde a aula sai.
  const sourceBlocked = isLoadingOptions || (options.length > 0 && !selectedOption?.available);

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

              {isLoadingOptions ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={COLORS.mainOrange} />
                  <Text style={styles.loadingText}>Verificando seu saldo...</Text>
                </View>
              ) : options.length > 0 ? (
                <View style={styles.originSection} accessibilityRole="radiogroup">
                  <Text style={styles.originTitle}>Descontar de</Text>
                  {options.map((option) => {
                    const selected = option.origin === selectedOrigin;
                    return (
                      <TouchableOpacity
                        key={option.origin}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: selected, disabled: !option.available }}
                        aria-checked={selected}
                        accessibilityLabel={`${optionTitle(option)}, ${optionBalance(option)}`}
                        disabled={!option.available || isCreatingSchedule}
                        onPress={() => setSelectedOrigin(option.origin)}
                        style={[
                          styles.originOption,
                          selected && styles.originOptionSelected,
                          !option.available && styles.originOptionDisabled,
                        ]}
                      >
                        <View style={[styles.radio, selected && styles.radioSelected]}>
                          {selected ? <View style={styles.radioDot} /> : null}
                        </View>
                        <View style={styles.originTexts}>
                          <Text style={styles.originLabel} numberOfLines={1}>{optionTitle(option)}</Text>
                          <Text style={[styles.originBalance, !option.available && styles.originBalanceBlocked]}>
                            {optionBalance(option)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {!hasAvailable ? (
                    <View style={styles.blockedRow}>
                      <AlertCircle size={15} color={COLORS.destructive} />
                      <Text style={styles.blockedText}>Nenhuma forma de reserva disponível para esta aula.</Text>
                    </View>
                  ) : !selectedOption ? (
                    <Text style={styles.originHint}>Escolha por onde reservar esta aula.</Text>
                  ) : null}
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
                  onPress={() => onConfirm(selectedOption?.origin)}
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
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  originSection: {
    gap: 8,
  },
  originTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: COLORS.mutedForeground,
  },
  originOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
  },
  originOptionSelected: {
    borderColor: COLORS.mainOrange,
    backgroundColor: '#FFF4EC',
  },
  originOptionDisabled: {
    opacity: 0.5,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D4D4D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: COLORS.mainOrange,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.mainOrange,
  },
  originTexts: {
    flex: 1,
    gap: 2,
  },
  originLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  originBalance: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  originBalanceBlocked: {
    color: COLORS.destructive,
    fontWeight: '600',
  },
  originHint: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
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
