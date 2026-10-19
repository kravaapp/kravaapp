import { COLORS } from "@/constants/colors";
import KravaLogo from "@/components/KravaLogo";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import { useAuth, useSetInitialPassword } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { setInitialPasswordFormSchema } from "@/schemas/auth.schemas";
import { router, useLocalSearchParams } from "expo-router";
import { AlertCircle, Check, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const PASSWORD_RULES = [
  { label: "Mínimo de 8 caracteres", test: (value: string) => value.length >= 8 },
  { label: "Pelo menos 1 letra maiúscula", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Pelo menos 1 letra minúscula", test: (value: string) => /[a-z]/.test(value) },
  { label: "Pelo menos 1 número", test: (value: string) => /\d/.test(value) },
] as const;

export default function DefinirSenha() {
  const { toast } = useToast();
  const { signIn } = useAuth();
  const { setInitialPassword, isLoading } = useSetInitialPassword();

  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isTokenInvalid, setIsTokenInvalid] = useState(false);

  const handleSubmit = async () => {
    setApiError(null);
    setFieldErrors({});

    if (!token) {
      setIsTokenInvalid(true);
      return;
    }

    const validation = setInitialPasswordFormSchema.safeParse({
      token,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      const errors: typeof fieldErrors = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0] as keyof typeof fieldErrors;
        if (field && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    try {
      const tokenResponse = await setInitialPassword({
        token,
        newPassword: validation.data.newPassword,
      });

      toast({
        title: "Senha definida!",
        description: "Sua senha foi cadastrada com sucesso. Bem-vindo!",
      });
      await signIn(tokenResponse);
    } catch (err) {
      const normalized = normalizeApiError(
        err,
        "Não foi possível definir sua senha. Tente novamente."
      );
      if (normalized.code === "Auth.InvalidOrExpiredFirstAccessToken") {
        setIsTokenInvalid(true);
      } else if (normalized.code === "Auth.WeakPassword") {
        setFieldErrors((curr) => ({
          ...curr,
          newPassword: "A senha não atende aos requisitos mínimos.",
        }));
      } else {
        setApiError(normalized.description);
      }
    }
  };

  // Estado de token ausente ou expirado
  if (!token || isTokenInvalid) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenScrollView contentContainerStyle={styles.container}>
          <View style={styles.card}>
            <View style={styles.logoRow}>
              <KravaLogo size={36} showWordmark={true} />
            </View>

            <View style={styles.invalidIconContainer}>
              <AlertCircle size={44} color={COLORS.destructive} />
            </View>

            <Text style={styles.invalidTitle}>Link Inválido ou Expirado</Text>
            <Text style={styles.invalidText}>
              Este link de primeiro acesso não é válido ou já ultrapassou o prazo de validade de 48 horas.
            </Text>
            <Text style={styles.invalidSubtext}>
              Se você é o responsável pelo Centro de Treinamento, solicite um novo convite ou entre em contato com nosso suporte.
            </Text>

            <TouchableOpacity
              style={styles.backToLoginButton}
              onPress={() => router.replace("/signIn")}
            >
              <Text style={styles.backToLoginButtonText}>Ir para o Login</Text>
            </TouchableOpacity>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <KravaLogo size={36} showWordmark={true} />
          </View>

          <View style={styles.header}>
            <View style={styles.badge}>
              <ShieldCheck size={16} color={COLORS.primary} />
              <Text style={styles.badgeText}>Primeiro Acesso do Gestor</Text>
            </View>
            <Text style={styles.title}>Defina sua Senha</Text>
            <Text style={styles.subtitle}>
              Crie uma senha segura para administrar o seu Centro de Treinamento no Krava.
            </Text>
          </View>

          {apiError ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{apiError}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            {/* Campo Nova Senha */}
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
                  secureTextEntry={!showPassword}
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
                  onPress={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={COLORS.mutedForeground} />
                  ) : (
                    <Eye size={20} color={COLORS.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.newPassword ? (
                <Text style={styles.fieldError}>{fieldErrors.newPassword}</Text>
              ) : null}
            </View>

            {/* Campo Confirmar Nova Senha */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Nova Senha</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Repita a senha digitada"
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
                    <EyeOff size={20} color={COLORS.mutedForeground} />
                  ) : (
                    <Eye size={20} color={COLORS.mutedForeground} />
                  )}
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword ? (
                <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Checklist de Requisitos de Senha */}
            <View style={styles.requirementsCard}>
              <Text style={styles.requirementsTitle}>A senha deve conter:</Text>
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

            {/* Botão de Submissão */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Definir Senha e Entrar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.replace("/signIn")}
              disabled={isLoading}
            >
              <Text style={styles.loginLinkText}>
                Já tem uma senha configurada? <Text style={styles.loginLinkHighlight}>Fazer login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  logoRow: {
    alignItems: "center",
    marginBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
  },
  errorAlert: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorAlertText: {
    color: COLORS.destructive,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
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
    marginTop: 2,
  },
  requirementsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  requirementsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.mutedForeground,
    marginBottom: 6,
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
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  loginLink: {
    alignItems: "center",
    marginTop: 8,
    padding: 6,
  },
  loginLinkText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
  },
  loginLinkHighlight: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  invalidIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fef2f2",
    alignSelf: "center",
    marginBottom: 16,
  },
  invalidTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  invalidText: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  invalidSubtext: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },
  backToLoginButton: {
    backgroundColor: COLORS.primary,
    height: 46,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backToLoginButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
