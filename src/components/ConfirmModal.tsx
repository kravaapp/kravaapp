import { X } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS } from "@/components/ClientHeader";

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "primary" | "destructive";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
};

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  variant = "primary",
  isLoading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) => {
  if (!visible) return null;

  const isDestructive = variant === "destructive";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
        disabled={isLoading}
      >
        <TouchableWithoutFeedback>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                onPress={onClose}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalText}>{message}</Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={onClose}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalButtonCancelText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={[
                    styles.modalButton,
                    isDestructive
                      ? styles.modalButtonDestructive
                      : styles.modalButtonPrimary,
                  ]}
                  onPress={onConfirm}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.modalButtonConfirmText,
                        isDestructive && styles.modalButtonDestructiveText,
                      ]}
                    >
                      {confirmText}
                    </Text>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: COLORS.foreground,
    flex: 1,
    paddingRight: 10,
  },
  modalBody: {
    gap: 20,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  modalButton: {
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 90,
  },
  modalButtonCancel: {
    backgroundColor: "#F4F4F5",
  },
  modalButtonCancelText: {
    color: COLORS.foreground,
    fontWeight: "700",
    fontSize: 13,
  },
  modalButtonPrimary: {
    backgroundColor: COLORS.mainOrange,
  },
  modalButtonDestructive: {
    backgroundColor: COLORS.destructive,
  },
  modalButtonConfirmText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  modalButtonDestructiveText: {
    color: "#FFFFFF",
  },
});

export default ConfirmModal;
