import AsyncStorage from "@react-native-async-storage/async-storage";
import { Bell, Calendar, CheckCircle2, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NotificationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onRequestPermission: () => Promise<string | null>;
}

const STORAGE_KEY = "@krava:push_prompt_dismissed_at";

export function NotificationPermissionModal({
  visible,
  onClose,
  onRequestPermission,
}: NotificationPermissionModalProps) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    try {
      await onRequestPermission();
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
      onClose();
    } catch (e) {
      console.warn("Error requesting permission:", e);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {}
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleDismiss}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <X size={20} color="#71717A" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Bell size={32} color="#E85C07" />
          </View>

          <Text style={styles.title}>Fique por dentro dos treinos!</Text>
          <Text style={styles.description}>
            Ative as notificações para receber avisos imediatos e nunca perder
            nada no seu Centro de Treinamento:
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#E85C07" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>
                Vaga liberada na lista de espera
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#E85C07" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>
                Confirmações de presença e novas aulas
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <CheckCircle2 size={18} color="#E85C07" style={styles.benefitIcon} />
              <Text style={styles.benefitText}>
                Lembretes importantes e comunicados do CT
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Ativar notificações</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleDismiss}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Agora não</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#18181B",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#27272A",
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(232, 92, 7, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#A1A1AA",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  benefitsList: {
    width: "100%",
    backgroundColor: "#27272A40",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    gap: 10,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitIcon: {
    marginRight: 10,
  },
  benefitText: {
    fontSize: 13,
    color: "#E4E4E7",
    flex: 1,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#E85C07",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#71717A",
    fontSize: 14,
  },
});
