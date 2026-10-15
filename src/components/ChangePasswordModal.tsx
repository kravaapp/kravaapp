import AppModal from "@/components/AppModal";
import { COLORS } from "@/constants/colors";
import { useToast } from "@/components/Toast";
import { useChangePassword } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import {
  changePasswordFormSchema,
  ChangePasswordFormValues,
} from "@/schemas/auth.schemas";
import { Check, Eye, EyeOff, Lock, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
};

const PASSWORD_RULES = [
  { label: "Mínimo de 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Pelo menos 1 letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Pelo menos 1 letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Pelo menos 1 número", test: (value: string) => /\d/.test(value) },
] as const;

export default function ChangePasswordModal({ visible, onClose }: Props) {
  const { toast } = useToast();
  const { changePassword, isLoading } = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setFieldErrors({});
    setApiError(null);
  };

  const handleClose = () => {
    if (isLoading) return;
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    setApiError(null);
    setFieldErrors({});

    const result = changePasswordFormSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    });

    if (!result.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof fieldErrors;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    try {
      await changePassword({
        currentPassword: result.data.currentPassword,
        newPassword: result.data.newPassword,
      });

      toast({
        title: "Senha alterada",
        description: "Sua senha foi atualizada com sucesso.",
      });
      handleClose();
    } catch (err) {
      const normalized = normalizeApiError(
        err,
        "Não foi possível alterar a senha. Tente novamente."
      );
      if (normalized.code === "Auth.InvalidCurrentPassword") {
        setFieldErrors((curr) => ({
          ...curr,
          currentPassword: "A senha atual informada está incorreta.",
        }));
      } else if (normalized.code === "Auth.SamePassword") {
        setFieldErrors((curr) => ({
          ...curr,
          newPassword: "A nova senha não pode ser igual à senha atual.",
        }));
      } else if (normalized.code === "Auth.WeakPassword") {
        setFieldErrors((curr) => ({
          ...curr,
          newPassword: "A nova senha não atende aos requisitos mínimos.",
        }));
      } else {
        setApiError(normalized.description);
      }
    }
  };

  return (
    <AppModal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardContainer}
        >
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <Lock size={18} color={COLORS.primary} />
                </View>
                <Text style={styles.title}>Alterar Senha</Text>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isLoading}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <X size={20} color={COLORS.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              {apiError ? (
                <View style={styles.errorAlert}>
                  <Text style={styles.errorAlertText}>{apiError}</Text>
                </View>
              ) : null}

              {/* Senha Atual */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Senha Atual</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.currentPassword && styles.inputError,
                    ]}
                    placeholder="Sua senha atual"
                    placeholderTextColor={COLORS.mutedForeground}
                    secureTextEntry={!showCurrentPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    value={currentPassword}
                    onChangeText={(val) => {
                      setCurrentPassword(val);
                      setFieldErrors((curr) => ({ ...curr, currentPassword: undefined }));
                      setApiError(null);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowCurrentPassword((v) => !v)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} color={COLORS.mutedForeground} />
                    ) : (
                      <Eye size={18} color={COLORS.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.currentPassword ? (
                  <Text style={styles.fieldError}>{fieldErrors.currentPassword}</Text>
                ) : null}
              </View>

              {/* Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.newPassword && styles.inputError,
                    ]}
                    placeholder="Mínimo de 8 caracteres"
                    placeholderTextColor={COLORS.mutedForeground}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    value={newPassword}
                    onChangeText={(val) => {
                      setNewPassword(val);
                      setFieldErrors((curr) => ({ ...curr, newPassword: undefined }));
                      setApiError(null);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowNewPassword((v) => !v)}
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} color={COLORS.mutedForeground} />
                    ) : (
                      <Eye size={18} color={COLORS.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.newPassword ? (
                  <Text style={styles.fieldError}>{fieldErrors.newPassword}</Text>
                ) : null}
              </View>

              {/* Confirmar Nova Senha */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar Nova Senha</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="Repita a nova senha"
                    placeholderTextColor={COLORS.mutedForeground}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    value={confirmPassword}
                    onChangeText={(val) => {
                      setConfirmPassword(val);
                      setFieldErrors((curr) => ({ ...curr, confirmPassword: undefined }));
                      setApiError(null);
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color={COLORS.mutedForeground} />
                    ) : (
                      <Eye size={18} color={COLORS.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
                {fieldErrors.confirmPassword ? (
                  <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
                ) : null}
              </View>

              {/* Requisitos de Senha */}
              <View style={styles.requirementsCard}>
                <Text style={styles.requirementsTitle}>A nova senha deve ter:</Text>
                {PASSWORD_RULES.map((rule) => {
                  const met = rule.test(newPassword);
                  return (
                    <View key={rule.label} style={styles.requirementRow}>
                      <Check
                        size={14}
                        color={met ? COLORS.success : COLORS.mutedForeground}
                        style={styles.requirementIcon}
                      />
                      <Text
                        style={[
                          styles.requirementText,
                          met && styles.requirementTextMet,
                        ]}
                      >
                        {rule.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            {/* Ações */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, isLoading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Salvar Senha</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  keyboardContainer: {
    width: "100%",
    maxWidth: 440,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#fff7ed",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingVertical: 4,
  },
  errorAlert: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  errorAlertText: {
    color: COLORS.destructive,
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.foreground,
  },
  inputError: {
    borderColor: COLORS.destructive,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 6,
  },
  fieldError: {
    fontSize: 12,
    color: COLORS.destructive,
    marginTop: 4,
  },
  requirementsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    marginBottom: 8,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementIcon: {
    marginRight: 6,
  },
  requirementText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  requirementTextMet: {
    color: COLORS.success,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.mutedForeground,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 110,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
