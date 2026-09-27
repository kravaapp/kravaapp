import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  useForgotPassword,
  useResetPassword,
  useVerifyResetCode,
} from "@/hooks/auth.hooks";
import { normalizeApiError, type ApiErrorInfo } from "@/routes/apiError";
import {
  forgotPasswordSchema,
  resetPasswordFormSchema,
  verifyResetCodeSchema,
} from "@/schemas/auth.schemas";
import { router } from "expo-router";
import { ChevronLeft, Check, Eye, EyeOff } from "lucide-react-native";
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

type Step = "email" | "code" | "password";

const STEP_TITLES: Record<Step, string> = {
  email: "Esqueci minha senha",
  code: "Verifique seu e-mail",
  password: "Definir nova senha",
};

/** Precisa ficar em sincronia com as regras de `resetPasswordSchema`. */
const PASSWORD_RULES = [
  { label: "Mínimo de 8 caracteres", test: (value: string) => value.length >= 8 },
  {
    label: "Pelo menos 1 letra maiúscula",
    test: (value: string) => /[A-Z]/.test(value),
  },
  {
    label: "Pelo menos 1 letra minúscula",
    test: (value: string) => /[a-z]/.test(value),
  },
  { label: "Pelo menos 1 número", test: (value: string) => /\d/.test(value) },
] as const;

const WRONG_CODE_FALLBACK = "Código de verificação inválido ou expirado.";
const WEAK_PASSWORD_CODE = "Auth.WeakPassword";
const INVALID_RESET_CODE = "Auth.InvalidOrExpiredResetCode";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [stepError, setStepError] = useState<ApiErrorInfo | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const { forgotPassword, isLoading: isSending } = useForgotPassword();
  const { verifyResetCode, isLoading: isVerifying } = useVerifyResetCode();
  const { resetPassword, isLoading: isResetting } = useResetPassword();
  const busy = isSending || isVerifying || isResetting;

  const submitLabel =
    step === "email"
      ? "Enviar código"
      : step === "code"
        ? "Validar código"
        : "Alterar senha";

  const handleSubmitEmail = async () => {
    if (busy) return;
    setStepError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setStepError({
        code: null,
        description:
          parsed.error.issues[0]?.message ?? "Informe um e-mail válido.",
      });
      return;
    }

    try {
      await forgotPassword(parsed.data);
      // Guarda o e-mail já normalizado para as próximas requisições do fluxo.
      setEmail(parsed.data.email);
      setCode("");
      setStep("code");
    } catch (error) {
      setStepError(
        normalizeApiError(
          error,
          "Não foi possível enviar o código. Tente novamente.",
        ),
      );
    }
  };

  const handleVerifyCode = async () => {
    if (busy) return;
    setStepError(null);

    const parsed = verifyResetCodeSchema.safeParse({ email, code });
    if (!parsed.success) {
      setStepError({
        code: null,
        description:
          parsed.error.issues[0]?.message ?? "Informe os 6 dígitos do código.",
      });
      return;
    }

    try {
      await verifyResetCode(parsed.data);
      setFieldErrors({});
      setStep("password");
    } catch (error) {
      // Código inválido ou expirado: permanece na etapa para o usuário corrigir.
      setStepError(normalizeApiError(error, WRONG_CODE_FALLBACK));
    }
  };

  const handleResend = async () => {
    if (busy || !email) return;
    setStepError(null);

    try {
      await forgotPassword({ email });
      setCode("");
      toast({
        title: "Código reenviado",
        description:
          "Se este e-mail estiver cadastrado, enviamos um novo código válido por 10 minutos.",
      });
    } catch (error) {
      setStepError(
        normalizeApiError(
          error,
          "Não foi possível reenviar o código. Tente novamente.",
        ),
      );
    }
  };

  const handleChangeEmail = () => {
    setCode("");
    setStepError(null);
    setStep("email");
  };

  const handleBackToCode = () => {
    setCode("");
    setStepError(null);
    setStep("code");
  };

  const handleResetPassword = async () => {
    if (busy) return;
    setStepError(null);

    const parsed = resetPasswordFormSchema.safeParse({
      email,
      code,
      newPassword,
      confirmPassword,
    });

    if (!parsed.success) {
      const next: { newPassword?: string; confirmPassword?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (
          (key === "newPassword" || key === "confirmPassword") &&
          !next[key]
        ) {
          next[key] = issue.message;
        }
      }
      setFieldErrors(next);
      return;
    }

    setFieldErrors({});

    try {
      await resetPassword({ email, code, newPassword });
      toast({
        title: "Senha alterada com sucesso!",
        description: "Entre com a sua nova senha.",
      });
      router.replace("/signIn");
    } catch (error) {
      const info = normalizeApiError(
        error,
        "Não foi possível alterar a senha. Tente novamente.",
      );
      if (info.code === INVALID_RESET_CODE) {
        // O código morreu entre a validação e a troca: volta para a etapa dele.
        setCode("");
        setStep("code");
      }
      setStepError(info);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar para o login"
          >
            <ChevronLeft size={24} color={COLORS.foreground} />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <KravaLogo size={64} />
            <Text style={styles.title}>{STEP_TITLES[step]}</Text>
          </View>

          <View style={styles.form}>
            {step === "email" && (
              <>
                <Text style={styles.helperText}>
                  Informe o e-mail da sua conta para receber um código de 6
                  dígitos.
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>E-mail</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="seu@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      setStepError(null);
                    }}
                  />
                </View>
              </>
            )}

            {step === "code" && (
              <>
                <Text style={styles.helperText}>
                  Se {email} estiver cadastrado, você receberá um código de 6
                  dígitos. O código é válido por 10 minutos.
                </Text>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Código de 6 dígitos</Text>
                  <TextInput
                    style={[
                      styles.input,
                      styles.codeInput,
                      stepError && styles.inputError,
                    ]}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    textContentType="oneTimeCode"
                    autoComplete="one-time-code"
                    editable={!busy}
                    value={code}
                    onChangeText={(value) => {
                      setCode(value.replace(/\D/g, "").slice(0, 6));
                      setStepError(null);
                    }}
                  />
                </View>
              </>
            )}

            {step === "password" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nova senha</Text>
                  <View style={styles.passwordWrapper}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.passwordInput,
                        fieldErrors.newPassword && styles.inputError,
                      ]}
                      placeholder="••••••••"
                      secureTextEntry={!showPassword}
                      editable={!busy}
                      value={newPassword}
                      onChangeText={(value) => {
                        setNewPassword(value);
                        setFieldErrors((current) => ({
                          ...current,
                          newPassword: undefined,
                        }));
                      }}
                    />
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => setShowPassword((current) => !current)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={20} color={COLORS.mutedForeground} />
                      ) : (
                        <Eye size={20} color={COLORS.mutedForeground} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {fieldErrors.newPassword ? (
                    <Text style={styles.fieldError}>
                      {fieldErrors.newPassword}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirmar nova senha</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="••••••••"
                    secureTextEntry={!showPassword}
                    editable={!busy}
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setFieldErrors((current) => ({
                        ...current,
                        confirmPassword: undefined,
                      }));
                    }}
                  />
                  {fieldErrors.confirmPassword ? (
                    <Text style={styles.fieldError}>
                      {fieldErrors.confirmPassword}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.requirements}>
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
              </>
            )}

            {stepError ? (
              <Text style={styles.errorText}>{stepError.description}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={
                step === "email"
                  ? handleSubmitEmail
                  : step === "code"
                    ? handleVerifyCode
                    : handleResetPassword
              }
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>

            {step === "code" && (
              <View style={styles.linksRow}>
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={[styles.linkText, busy && styles.linkDisabled]}>
                    {isSending ? "Reenviando..." : "Reenviar código"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangeEmail}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text
                    style={[styles.linkMuted, busy && styles.linkDisabled]}
                  >
                    Usar outro e-mail
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === "password" &&
            stepError?.code &&
            stepError.code !== WEAK_PASSWORD_CODE ? (
              <TouchableOpacity
                style={styles.escapeButton}
                onPress={handleBackToCode}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>Informar o código novamente</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },

  card: {
    width: "100%",
    maxWidth: 400,
    padding: 24,
  },

  backButton: {
    position: "absolute",
    zIndex: 1,
    top: 24,
    left: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },

  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    marginTop: 16,
    fontSize: 24,
    fontWeight: "bold",
    color: "#111",
    textAlign: "center",
  },

  form: {
    gap: 16,
  },

  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },

  inputGroup: {
    gap: 8,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
  },

  inputError: {
    borderColor: COLORS.destructive,
  },

  codeInput: {
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 8,
  },

  passwordWrapper: {
    justifyContent: "center",
  },

  passwordInput: {
    paddingRight: 44,
  },

  eyeButton: {
    position: "absolute",
    right: 12,
    padding: 4,
  },

  fieldError: {
    fontSize: 13,
    color: COLORS.destructive,
  },

  requirements: {
    gap: 6,
  },

  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  requirementIcon: {
    marginRight: 8,
  },

  requirementText: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    flex: 1,
  },

  requirementTextMet: {
    color: COLORS.success,
  },

  button: {
    marginTop: 8,
    backgroundColor: COLORS.mainOrange,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  errorText: {
    color: COLORS.destructive,
    fontSize: 14,
    textAlign: "center",
  },

  linksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },

  linkText: {
    color: COLORS.mainOrange,
    fontSize: 14,
    fontWeight: "500",
  },

  linkMuted: {
    color: COLORS.mutedForeground,
    fontSize: 14,
  },

  linkDisabled: {
    opacity: 0.5,
  },

  escapeButton: {
    alignItems: "center",
    marginTop: 4,
  },
});
