import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router } from "expo-router";
import Constants from "expo-constants";
import {
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  KeyRound,
  Lock,
  Scale,
  ShieldCheck,
  Trash2,
} from "lucide-react-native";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { useToast } from "@/components/Toast";
import { useAuth, useDeleteAccount } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";

const COLORS = {
  foreground: "#111827",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  primary: "#e85c07",
  primaryLight: "#fff0e7",
  destructive: "#dc2626",
  destructiveLight: "#fee2e2",
};

export default function SettingsScreen() {
  const { user } = useAuth();
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [passwordForDelete, setPasswordForDelete] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const { toast } = useToast();
  const { requestDeletion, isDeleting } = useDeleteAccount();

  if (!user) {
    return <Redirect href="/signIn" />;
  }

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";

  const handleConfirmDelete = async () => {
    if (!passwordForDelete) {
      setDeleteError("Digite sua senha para confirmar.");
      return;
    }

    setDeleteError("");
    try {
      await requestDeletion({
        password: passwordForDelete,
        reason: "Solicitação direta de encerramento pelo usuário no aplicativo",
      });

      setDeleteModalVisible(false);
      toast({
        title: "Solicitação de exclusão recebida",
        description: "Sua conta foi desativada e um protocolo foi enviado para seu e-mail.",
      });
      router.replace("/signIn");
    } catch (err) {
      const error = normalizeApiError(err, "Não foi possível processar a exclusão.");
      setDeleteError(error.description);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Voltar"
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={22} color={COLORS.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Bloco: Segurança */}
        <Text style={styles.sectionHeader}>SEGURANÇA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.7}
            onPress={() => setChangePasswordVisible(true)}
          >
            <View style={styles.iconCircle}>
              <KeyRound size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Senha</Text>
              <Text style={styles.rowSubtitle}>Alterar sua senha de acesso</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Bloco: Sobre e LGPD */}
        <Text style={styles.sectionHeader}>SOBRE E TRANSPARÊNCIA</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/legal" as any,
                params: { section: "termos" },
              })
            }
          >
            <View style={styles.iconCircle}>
              <Scale size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Termos de Uso</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/legal" as any,
                params: { section: "privacidade" },
              })
            }
          >
            <View style={styles.iconCircle}>
              <ShieldCheck size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Política de Privacidade</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({
                pathname: "/legal" as any,
                params: { section: "lgpd" },
              })
            }
          >
            <View style={styles.iconCircle}>
              <ShieldCheck size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>LGPD e seus direitos</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>

          <View style={styles.separator} />

          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.7}
            onPress={() => router.push("/support" as any)}
          >
            <View style={styles.iconCircle}>
              <HelpCircle size={18} color={COLORS.primary} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Fale com o suporte</Text>
              <Text style={styles.rowSubtitle}>Dúvida, problema ou sugestão</Text>
            </View>
            <ChevronRight size={18} color={COLORS.muted} />
          </TouchableOpacity>


          <View style={styles.separator} />

          <View style={[styles.cardRow, styles.staticRow]}>
            <View style={styles.iconCircle}>
              <Lock size={18} color={COLORS.muted} />
            </View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Versão</Text>
            </View>
            <Text style={styles.versionBadge}>{appVersion}</Text>
          </View>
        </View>

        {/* Bloco: Excluir Conta */}
        <TouchableOpacity
          style={styles.deleteButton}
          activeOpacity={0.8}
          onPress={() => {
            setPasswordForDelete("");
            setDeleteError("");
            setDeleteModalVisible(true);
          }}
        >
          <Trash2 size={18} color={COLORS.destructive} />
          <Text style={styles.deleteButtonText}>Excluir conta</Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>Krava — Gestão esportiva inteligente</Text>
      </ScrollView>

      {/* Modal de Alteração de Senha */}
      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />

      {/* Modal de Confirmação de Exclusão de Conta (LGPD / App Store) */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDeleteModalVisible(false)}
        >
          <Pressable
            style={styles.modalDialog}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={styles.warningIconCircle}>
                <Trash2 size={24} color={COLORS.destructive} />
              </View>
              <Text style={styles.modalTitle}>Excluir conta</Text>
            </View>

            <Text style={styles.modalDescription}>
              Ao confirmar a solicitação de exclusão, seu acesso ao aplicativo
              será encerrado imediatamente.
            </Text>

            <Text style={styles.modalSubDescription}>
              Seus dados pessoais serão eliminados em até 15 dias corridos,
              observadas as obrigações legais de conservação de registros fiscais
              e contratuais.
            </Text>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalInputLabel}>
                Confirme sua senha atual:
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Sua senha de login"
                placeholderTextColor={COLORS.muted}
                secureTextEntry
                value={passwordForDelete}
                onChangeText={(text) => {
                  setPasswordForDelete(text);
                  if (deleteError) setDeleteError("");
                }}
                editable={!isDeleting}
              />
              {deleteError ? (
                <Text style={styles.modalError}>{deleteError}</Text>
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
              >
                <Text style={styles.cancelModalButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmModalButton,
                  (!passwordForDelete || isDeleting) && styles.disabledButton,
                ]}
                onPress={handleConfirmDelete}
                disabled={!passwordForDelete || isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmModalButtonText}>
                    Confirmar Exclusão
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  content: {
    padding: 20,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 4,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  staticRow: {
    opacity: 0.85,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 54,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTexts: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  rowSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  versionBadge: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.muted,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.destructiveLight,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
  },
  deleteButtonText: {
    color: COLORS.destructive,
    fontSize: 15,
    fontWeight: "700",
  },
  footerNote: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalDialog: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  warningIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.destructiveLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.foreground,
  },
  modalSubDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  modalInputGroup: {
    marginTop: 8,
    gap: 6,
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.foreground,
  },
  modalError: {
    color: COLORS.destructive,
    fontSize: 12,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  cancelModalButton: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  confirmModalButton: {
    flex: 1.2,
    minHeight: 44,
    backgroundColor: COLORS.destructive,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmModalButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
