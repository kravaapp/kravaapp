import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
import { useToast } from "@/components/Toast";
import {
  useConfirmEmail,
  useResendConfirmationCode,
} from "@/hooks/auth.hooks";
import { normalizeApiError, type ApiErrorInfo } from "@/routes/apiError";
import {
  confirmEmailSchema,
  resendConfirmationCodeSchema,
} from "@/schemas/auth.schemas";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Step = "email" | "code";

const STEP_TITLES: Record<Step, string> = {
  email: "Confirmar e-mail",
  code: "Verifique seu e-mail",
};

const WRONG_CODE_FALLBACK = "Código de confirmação inválido ou expirado.";
const USER_NOT_FOUND = "Auth.UserNotFound";

export default function ConfirmEmail() {
  const { toast } = useToast();
  // O e-mail chega por parâmetro quando o usuário vem do cadastro ou de um
  // login bloqueado por Auth.EmailNotConfirmed.
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const initialEmail = typeof emailParam === "string" ? emailParam.trim() : "";

  const [step, setStep] = useState<Step>(initialEmail ? "code" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [stepError, setStepError] = useState<ApiErrorInfo | null>(null);

  const { confirmEmail, isLoading: isConfirming } = useConfirmEmail();
  const { resendConfirmationCode, isLoading: isResending } =
    useResendConfirmationCode();
  const busy = isConfirming || isResending;

  const submitLabel = step === "email" ? "Enviar código" : "Confirmar e-mail";

  const handleSubmitEmail = async () => {
    if (busy) return;
    setStepError(null);

    const parsed = resendConfirmationCodeSchema.safeParse({ email });
    if (!parsed.success) {
      setStepError({
        code: null,
        description:
          parsed.error.issues[0]?.message ?? "Informe um e-mail válido.",
      });
      return;
    }

    try {
      await resendConfirmationCode(parsed.data);
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

  const handleConfirmEmail = async () => {
    if (busy) return;
    setStepError(null);

    const parsed = confirmEmailSchema.safeParse({ email, code });
    if (!parsed.success) {
      setStepError({
        code: null,
        description:
          parsed.error.issues[0]?.message ?? "Informe os 6 dígitos do código.",
      });
      return;
    }

    try {
      await confirmEmail(parsed.data);
      toast({
        title: "E-mail confirmado!",
        description: "Entre com a sua senha para acessar sua conta.",
      });
      router.replace("/signIn");
    } catch (error) {
      // Código inválido, expirado ou e-mail sem cadastro: permanece na etapa
      // para o usuário corrigir ou reenviar.
      setStepError(normalizeApiError(error, WRONG_CODE_FALLBACK));
    }
  };

  const handleResend = async () => {
    if (busy || !email) return;
    setStepError(null);

    try {
      await resendConfirmationCode({ email });
      setCode("");
      toast({
        title: "Código reenviado",
        description:
          "Se este e-mail estiver cadastrado, enviamos um novo código válido por 15 minutos.",
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.backRow}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Voltar para o login"
          >
            <ArrowLeft size={18} color={COLORS.foreground} />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <KravaLogo size={56} />
            <Text style={styles.title}>{STEP_TITLES[step]}</Text>
          </View>

          <View style={styles.form}>
            {step === "email" && (
              <>
                <Text style={styles.helperText}>
                  Informe o e-mail da sua conta para receber um novo código de 6
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
                  Enviamos um código de 6 dígitos para {email}. O código é
                  válido por 15 minutos.
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

            {stepError ? (
              <Text style={styles.errorText}>{stepError.description}</Text>
            ) : null}

            {stepError?.code === USER_NOT_FOUND ? (
              <Text style={styles.helperText}>
                Confira o e-mail informado ou crie uma conta para continuar.
              </Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, busy && styles.buttonDisabled]}
              onPress={
                step === "email" ? handleSubmitEmail : handleConfirmEmail
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
                    {isResending ? "Reenviando..." : "Reenviar código"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleChangeEmail}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  <Text style={[styles.linkMuted, busy && styles.linkDisabled]}>
                    Usar outro e-mail
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
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

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 8,
  },

  backText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },

  logoContainer: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
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
});
