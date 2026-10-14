import { Modal, ModalProps, Platform, StyleSheet, View } from "react-native";
import { ToastViewport } from "./Toast";

/** Mantém o toast sobre a janela nativa sem criar um modal que capture toques. */
export default function AppModal({ children, ...props }: ModalProps) {
  return (
    <Modal {...props}>
      <View style={styles.content}>
        {children}
        {Platform.OS !== "web" && <ToastViewport />}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1 },
});
