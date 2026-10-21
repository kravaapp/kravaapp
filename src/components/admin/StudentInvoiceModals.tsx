import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Modal from "@/components/AppModal";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { COLORS } from "@/components/ClientHeader";
import { ActionButton } from "@/components/admin/AdminUi";
import { Payment, RefundInvoiceRequest, StudentInvoice } from "@/types/payments.types";
import { maskCurrency, parseCurrency, toCurrencyInput } from "@/utils/masks";
import { formatCurrency, formatPaymentDate } from "@/utils/payments";
import { AlertTriangle, CreditCard, X } from "lucide-react-native";

/* No react-native-web a bolinha do switch ligado usa `activeThumbColor` (fora da tipagem do RN). */
const WEB_ACTIVE_THUMB: Record<string, string> = { activeThumbColor: "#fff" };

function ModalHeader({
  title,
  onClose,
}: {
  title: string;
  onClose: () => void;
}) {
  return (
    <View style={styles.modalHeader}>
      <Text style={styles.modalTitle}>{title}</Text>
      <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Fechar">
        <X size={20} color={COLORS.foreground} />
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
  error,
  mask,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  error?: string;
  mask?: (value: string) => string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={mask ? (next) => onChange(mask(next)) : onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[
          styles.input,
          multiline && styles.textarea,
          error ? styles.inputError : null,
        ]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function ReceivePaymentModal({
  invoice,
  onClose,
  onConfirm,
  isConfirming,
}: {
  invoice: Payment | null;
  onClose: () => void;
  onConfirm: (paidAmount: number, paymentMethod: string) => Promise<void>;
  isConfirming: boolean;
}) {
  const [method, setMethod] = useState<"Pix" | "Dinheiro" | "Cartao">("Pix");
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (invoice) {
      setAmountStr(toCurrencyInput(invoice.amount));
      setMethod("Pix");
      setError("");
    }
  }, [invoice]);

  const handleSubmit = async () => {
    if (isConfirming || !invoice) return;
    const numericAmount = parseCurrency(amountStr);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Informe um valor de recebimento válido.");
      return;
    }
    setError("");
    await onConfirm(numericAmount, method);
  };

  const methodsList: { label: string; value: "Pix" | "Dinheiro" | "Cartao" }[] = [
    { label: "Pix", value: "Pix" },
    { label: "Dinheiro", value: "Dinheiro" },
    { label: "Cartão (maquininha)", value: "Cartao" },
  ];

  return (
    <Modal
      visible={!!invoice}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader title="Confirmar pagamento" onClose={onClose} />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>
                {invoice?.description || "Cobrança"}
              </Text>
              <Text style={styles.infoSubtitle}>
                Vencimento:{" "}
                {invoice?.dueDate ? formatPaymentDate(invoice.dueDate) : "--"}
                {" · "}Valor original:{" "}
                {invoice ? formatCurrency(invoice.amount) : "R$ 0,00"}
              </Text>
            </View>

            <Field
              label="Valor recebido *"
              value={amountStr}
              onChange={(val) => {
                setAmountStr(val);
                setError("");
              }}
              mask={maskCurrency}
              placeholder="0,00"
              keyboardType="number-pad"
              error={error}
            />

            <View style={styles.tabSection}>
              <Text style={styles.fieldLabel}>Forma de recebimento *</Text>
              <Text style={styles.secondary}>
                Selecione o canal por onde o pagamento no balcão foi feito.
              </Text>
              <View style={styles.choiceRow}>
                {methodsList.map((opt) => {
                  const selected = method === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setMethod(opt.value)}
                      style={[styles.choice, selected && styles.choiceActive]}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          selected && styles.choiceTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <ActionButton
              label={isConfirming ? "Confirmando..." : "Confirmar recebimento"}
              onPress={handleSubmit}
              disabled={isConfirming}
            />
          </ScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

export function CancelInvoiceModal({
  invoice,
  onClose,
  onConfirm,
  isCancelling,
}: {
  invoice: Payment | null;
  onClose: () => void;
  onConfirm: (notes?: string) => Promise<void>;
  isCancelling: boolean;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes("");
  }, [invoice]);

  const handleSubmit = async () => {
    if (isCancelling || !invoice) return;
    await onConfirm(notes);
  };

  return (
    <Modal
      visible={!!invoice}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader title="Cancelar cobrança" onClose={onClose} />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyHeader}>
                <AlertTriangle size={16} color="#B45309" />
                <Text style={styles.emergencyTitle}>Confirmação</Text>
              </View>
              <Text style={styles.emergencySubtitle}>
                Tem certeza de que deseja cancelar esta cobrança no valor de{" "}
                <Text style={styles.boldText}>
                  {invoice ? formatCurrency(invoice.amount) : "R$ 0,00"}
                </Text>
                ? Esta ação é definitiva e não poderá ser desfeita.
              </Text>
            </View>

            <Field
              label="Motivo do cancelamento (opcional)"
              value={notes}
              onChange={setNotes}
              placeholder="Ex: Acordo direto com aluno, cobrança gerada em duplicidade..."
              multiline
            />

            <ActionButton
              label={isCancelling ? "Cancelando..." : "Confirmar cancelamento"}
              onPress={handleSubmit}
              disabled={isCancelling}
            />
          </ScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

export function RefundInvoiceModal({
  invoice,
  gatewayError,
  onClose,
  onConfirm,
  isRefunding,
}: {
  invoice: StudentInvoice | null;
  /** Mensagem da última tentativa que falhou no gateway; libera o registro manual do estorno. */
  gatewayError: string | null;
  onClose: () => void;
  onConfirm: (request: RefundInvoiceRequest) => Promise<void>;
  isRefunding: boolean;
}) {
  const [notes, setNotes] = useState("");
  const [cancelPlan, setCancelPlan] = useState(true);
  const [alreadyRefunded, setAlreadyRefunded] = useState(false);

  useEffect(() => {
    setNotes("");
    setCancelPlan(true);
    setAlreadyRefunded(false);
  }, [invoice]);

  const canCancelPlan = !!invoice?.hasActiveContrato;
  const planLabel = invoice?.contratoPlanoName ?? "vinculado";
  const planUntil = invoice?.contratoEndDate
    ? ` (vigente até ${formatPaymentDate(invoice.contratoEndDate)})`
    : "";

  const handleSubmit = async () => {
    if (isRefunding || !invoice) return;
    await onConfirm({
      notes,
      cancelPlan: canCancelPlan && cancelPlan,
      alreadyRefundedAtGateway: !!gatewayError && alreadyRefunded,
    });
  };

  const submitLabel = isRefunding
    ? "Estornando..."
    : gatewayError && alreadyRefunded
      ? "Registrar estorno"
      : gatewayError
        ? "Tentar estornar novamente"
        : "Confirmar estorno";

  return (
    <Modal
      visible={!!invoice}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <ModalHeader title="Estornar cobrança" onClose={onClose} />
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.emergencyCard}>
              <View style={styles.emergencyHeader}>
                <AlertTriangle size={16} color="#B45309" />
                <Text style={styles.emergencyTitle}>Atenção ao estorno</Text>
              </View>
              <Text style={styles.emergencySubtitle}>
                Tem certeza de que deseja estornar o pagamento desta cobrança no valor de{" "}
                <Text style={styles.boldText}>
                  {invoice ? formatCurrency(invoice.amount) : "R$ 0,00"}
                </Text>
                ? O status será alterado para estornado e o aluno será avisado no app.
              </Text>
            </View>

            {invoice?.paidViaGateway && !gatewayError ? (
              <View style={styles.infoBox}>
                <View style={styles.infoHeader}>
                  <CreditCard size={15} color={COLORS.info} />
                  <Text style={styles.infoTitle}>Pago pelo app</Text>
                </View>
                <Text style={styles.infoSubtitle}>
                  O valor será devolvido ao aluno pelo próprio gateway, no mesmo
                  meio usado no pagamento.
                </Text>
              </View>
            ) : null}

            {gatewayError ? (
              <View style={styles.errorCard}>
                <View style={styles.emergencyHeader}>
                  <AlertTriangle size={16} color={COLORS.destructive} />
                  <Text style={styles.errorTitle}>Estorno não realizado no gateway</Text>
                </View>
                <Text style={styles.emergencySubtitle}>{gatewayError}</Text>
                <View style={styles.switchRow}>
                  <View style={styles.grow}>
                    <Text style={styles.fieldLabel}>
                      Já estornei pelo painel do gateway
                    </Text>
                    <Text style={styles.secondary}>
                      Registra o estorno só no Krava, sem nova tentativa no gateway.
                    </Text>
                  </View>
                  <Switch
                    value={alreadyRefunded}
                    onValueChange={setAlreadyRefunded}
                    trackColor={{ true: COLORS.mainOrange }}
                    thumbColor="#fff"
                    {...WEB_ACTIVE_THUMB}
                    accessibilityLabel="Já estornei pelo painel do gateway"
                  />
                </View>
              </View>
            ) : null}

            {canCancelPlan ? (
              <View style={styles.switchRow}>
                <View style={styles.grow}>
                  <Text style={styles.fieldLabel}>
                    Cancelar também o plano {planLabel}
                    {planUntil}
                  </Text>
                  <Text style={styles.secondary}>
                    Se ele substituiu outro plano ainda vigente, o anterior volta
                    a valer até o fim do período já pago, sem renovação automática.
                  </Text>
                </View>
                <Switch
                  value={cancelPlan}
                  onValueChange={setCancelPlan}
                  trackColor={{ true: COLORS.mainOrange }}
                  thumbColor="#fff"
                  {...WEB_ACTIVE_THUMB}
                  accessibilityLabel={`Cancelar também o plano ${planLabel}`}
                />
              </View>
            ) : null}

            <Field
              label="Motivo do estorno (opcional)"
              value={notes}
              onChange={setNotes}
              placeholder="Ex: Pagamento informado incorretamente..."
              multiline
            />

            <ActionButton
              label={submitLabel}
              onPress={handleSubmit}
              disabled={isRefunding}
            />
          </ScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  infoBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 4,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  infoSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: COLORS.foreground,
    fontSize: 12,
    fontWeight: "700",
  },
  secondary: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: COLORS.foreground,
    backgroundColor: "#fff",
  },
  inputError: {
    borderColor: COLORS.destructive,
  },
  fieldError: {
    color: COLORS.destructive,
    fontSize: 11,
    fontWeight: "600",
  },
  textarea: {
    minHeight: 84,
    paddingTop: 10,
    textAlignVertical: "top",
  },
  tabSection: {
    gap: 8,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  choice: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  choiceActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  choiceText: {
    color: COLORS.foreground,
    fontSize: 11,
    fontWeight: "600",
  },
  choiceTextActive: {
    color: "#fff",
  },
  emergencyCard: {
    backgroundColor: "#FFFDF5",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  emergencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: -0.2,
  },
  emergencySubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: "700",
    color: COLORS.foreground,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.destructive,
    letterSpacing: -0.2,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
  },
  grow: {
    flex: 1,
    minWidth: 0,
  },
});
