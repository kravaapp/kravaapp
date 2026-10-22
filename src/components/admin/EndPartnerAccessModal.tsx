import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Modal from "@/components/AppModal";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { COLORS } from "@/components/ClientHeader";
import { ActionButton } from "@/components/admin/AdminUi";
import { PartnerAccessType } from "@/types/partners.types";
import { AlertTriangle, X } from "lucide-react-native";

/** Confirmação do CT para encerrar o acesso do aluno via parceiro (Gympass/TotalPass). */
export function EndPartnerAccessModal({
  access,
  studentName,
  visible,
  onClose,
  onConfirm,
  isEnding,
}: {
  access: PartnerAccessType | null;
  studentName: string;
  visible: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isEnding: boolean;
}) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) setReason("");
  }, [visible]);

  const handleSubmit = async () => {
    if (isEnding) return;
    await onConfirm(reason);
  };

  const bookings = access?.futureBookings ?? 0;

  return (
    <Modal visible={visible && !!access} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoider style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Desvincular {access?.partner}</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Fechar">
              <X size={20} color={COLORS.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.warningCard}>
              <View style={styles.warningHeader}>
                <AlertTriangle size={16} color="#B45309" />
                <Text style={styles.warningTitle}>Confirmação</Text>
              </View>
              <Text style={styles.warningText}>
                {studentName} deixará de agendar aulas pelo {access?.partner} neste CT e será avisado no app.
                {bookings > 0 ? (
                  <Text style={styles.boldText}>
                    {" "}
                    {bookings === 1
                      ? "1 aula agendada pelo parceiro será cancelada."
                      : `${bookings} aulas agendadas pelo parceiro serão canceladas.`}
                  </Text>
                ) : null}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Ex: Aluno não utiliza mais o parceiro..."
                placeholderTextColor={COLORS.mutedForeground}
                multiline
                style={styles.textarea}
              />
            </View>

            <ActionButton
              label={isEnding ? "Desvinculando..." : "Confirmar desvínculo"}
              onPress={handleSubmit}
              disabled={isEnding}
            />
          </ScrollView>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "flex-end" },
  sheet: { maxHeight: "90%", backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
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
  modalContent: { padding: 16, gap: 14, paddingBottom: 36 },
  warningCard: {
    backgroundColor: "#FFFDF5",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  warningHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  warningTitle: { fontSize: 13, fontWeight: "800", color: "#B45309", letterSpacing: -0.2 },
  warningText: { fontSize: 12, color: COLORS.mutedForeground, lineHeight: 18 },
  boldText: { fontWeight: "700", color: COLORS.foreground },
  field: { gap: 6 },
  fieldLabel: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  textarea: {
    minHeight: 84,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingTop: 10,
    textAlignVertical: "top",
    color: COLORS.foreground,
    backgroundColor: "#fff",
  },
});
