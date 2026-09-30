import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import { useLogin, useSelfRegister } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { selfRegisterSchema } from "@/schemas/auth.schemas";
import {
  maskCpf,
  maskDate,
  maskPhone,
  onlyDigits,
  toIsoDate,
} from "@/utils/masks";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const EMAIL_NOT_CONFIRMED = "Auth.EmailNotConfirmed";
const BRAND_ORANGE = "#E85C07";
const REGISTER_STEPS = ["seus dados", "contato", "acesso"] as const;

/** Login bloqueado por e-mail ainda não confirmado — leva para o código OTP. */
function isEmailNotConfirmed(error: unknown) {
  const info = normalizeApiError(error, "");
  return (
    info.code === EMAIL_NOT_CONFIRMED ||
    info.description.includes("confirmado")
  );
}

export default function Login() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [registerStep, setRegisterStep] = useState(0);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "prefer_not" | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const { login, isLoading } = useLogin();
  const { selfRegister, isLoading: isRegistering } = useSelfRegister();
  const busy = isLoading || isRegistering;

  const getStepError = (step: number) => {
    if (step === 0) {
      if (!name.trim()) return "Informe seu nome completo.";
      if (!toIsoDate(birthDate)) return "Informe uma data de nascimento válida.";
      if (!sex) return "Selecione uma opção para sexo.";
    }
    if (step === 1) {
      if (onlyDigits(cpf).length !== 11) return "Informe um CPF com 11 dígitos.";
      if (!/^\d{10,11}$/.test(onlyDigits(phone))) return "Informe um telefone válido.";
      if (!selfRegisterSchema.shape.email.safeParse(email).success) return "Informe um e-mail válido.";
    }
    if (step === 2) {
      if (!senha) return "Crie uma senha para sua conta.";
      if (!confirmPassword) return "Confirme sua senha.";
      if (senha !== confirmPassword) return "As senhas não coincidem.";
    }
    return "";
  };

  const nextRegisterStep = () => {
    const error = getStepError(registerStep);
    setRegistrationError(error);
    if (!error) setRegisterStep((step) => Math.min(step + 1, REGISTER_STEPS.length - 1));
  };

  const handleLogin = async () => {
    if (busy) return;
    if (!email.trim() || !senha) {
      setLoginError("Preencha o e-mail e a senha.");
      return;
    }
    setLoginError("");
    try {
      await login({ email, password: senha });
    } catch (requestError) {
      if (isEmailNotConfirmed(requestError)) {
        router.push({
          pathname: "/confirmEmail",
          params: { email: email.trim() },
        });
        return;
      }
      setLoginError(
        normalizeApiError(requestError, "Não foi possível realizar o login.")
          .description,
      );
    }
  };

  const handleRegister = async () => {
    if (busy) return;
    const stepError = getStepError(registerStep);
    if (stepError) {
      setRegistrationError(stepError);
      return;
    }
    const isoBirthDate = toIsoDate(birthDate);
    const request = selfRegisterSchema.safeParse({
      name,
      email,
      password: senha,
      cpf: onlyDigits(cpf),
      birthDate: isoBirthDate,
      sex: sex === "prefer_not" ? null : sex,
      phone: onlyDigits(phone),
    });
    if (!request.success) {
      const invalidField = String(request.error.issues[0]?.path[0] ?? "");
      if (["name", "birthDate", "sex"].includes(invalidField)) setRegisterStep(0);
      else if (["cpf", "phone", "email"].includes(invalidField)) setRegisterStep(1);
      setRegistrationError("Revise os dados desta etapa.");
      return;
    }
    if (senha !== confirmPassword) {
      setRegistrationError("As senhas não coincidem.");
      return;
    }
    setRegistrationError("");
    try {
      await selfRegister(request.data);
      setMode("login");
      setRegisterStep(0);
      setName("");
      setCpf("");
      setBirthDate("");
      setSex(null);
      setPhone("");
      setSenha("");
      setConfirmPassword("");
      toast({
        title: "Conta criada!",
        description:
          "Enviamos um código de 6 dígitos para confirmar seu e-mail.",
      });
      router.push({
        pathname: "/confirmEmail",
        params: { email: request.data.email },
      });
    } catch (requestError) {
      setRegistrationError(
        normalizeApiError(requestError, "Não foi possível criar a conta.")
          .description,
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenScrollView
        key={`${mode}-${registerStep}`}
        contentContainerStyle={[styles.scrollContent, mode === "register" && styles.registerScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.brandRow}>
            <KravaLogo size={38} showWordmark />
          </View>

          {mode === "register" && (
            <View style={styles.stepsSection}>
              <View style={styles.stepsTrack} accessible accessibilityLabel={`Etapa ${registerStep + 1} de ${REGISTER_STEPS.length}: ${REGISTER_STEPS[registerStep]}`}>
                {REGISTER_STEPS.map((label, index) => (
                  <View key={label} style={[styles.stepLine, index <= registerStep && styles.stepLineActive]} />
                ))}
              </View>
            </View>
          )}

          <View style={[styles.hero, mode === "register" && styles.registerHero]}>
            <Text style={[styles.title, mode === "register" && styles.registerTitle]}>
              {mode === "login" ? (
                <>bom te ver{"\n"}de volta<Text style={styles.titleAccent}>.</Text></>
              ) : registerStep === 0 ? (
                "dados pessoais"
              ) : registerStep === 1 ? (
                "contato"
              ) : (
                "acesso"
              )}
            </Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Entre para agendar sua próxima aula."
                : registerStep === 0
                  ? "Nome, nascimento e sexo."
                  : registerStep === 1
                    ? "CPF, telefone e e-mail."
                    : "Defina e confirme sua senha."}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={[styles.fields, mode === "register" && styles.registerFields]}>
            {mode === "register" && (
              <>
                {registerStep === 0 && <View style={styles.inputGroup}>
                  <Text style={styles.label}>nome completo</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Seu nome"
                    autoCapitalize="words"
                    value={name}
                    onChangeText={(value) => {
                      setName(value);
                      setRegistrationError("");
                    }}
                  />
                </View>}

                {registerStep === 1 && <View style={styles.inputGroup}>
                  <Text style={styles.label}>CPF</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="000.000.000-00"
                    keyboardType="number-pad"
                    value={cpf}
                    maxLength={14}
                    onChangeText={(value) => {
                      setCpf(maskCpf(value));
                      setRegistrationError("");
                    }}
                  />
                </View>}

                {registerStep === 0 && <View style={styles.inputGroup}>
                  <Text style={styles.label}>data de nascimento</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="DD/MM/AAAA"
                    keyboardType="number-pad"
                    value={birthDate}
                    maxLength={10}
                    onChangeText={(value) => {
                      setBirthDate(maskDate(value));
                      setRegistrationError("");
                    }}
                  />
                </View>}

                {registerStep === 1 && <View style={styles.inputGroup}>
                  <Text style={styles.label}>telefone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                    value={phone}
                    maxLength={15}
                    onChangeText={(value) => {
                      setPhone(maskPhone(value));
                      setRegistrationError("");
                    }}
                  />
                </View>}

                {registerStep === 0 && <View style={styles.inputGroup}>
                  <Text style={styles.label}>sexo</Text>
                  <View style={styles.options}>
                    {[
                      { label: "Masculino", value: "M" as const },
                      { label: "Feminino", value: "F" as const },
                      {
                        label: "Prefiro não responder",
                        value: "prefer_not" as const,
                      },
                    ].map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: sex === option.value }}
                        style={[
                          styles.option,
                          sex === option.value && styles.optionActive,
                        ]}
                        onPress={() => {
                          setSex(option.value);
                          setRegistrationError("");
                        }}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            sex === option.value && styles.optionTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>}

              </>
            )}
            {(mode === "login" || registerStep === 1) && <View style={styles.inputGroup}>
              <Text style={styles.label}>e-mail</Text>
              <TextInput
                style={[styles.input, focusedField === "email" && styles.inputFocused]}
                placeholder="seu@email.com"
                placeholderTextColor="#7B818A"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="E-mail"
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setLoginError("");
                  setRegistrationError("");
                }}
              />
            </View>}

            {(mode === "login" || registerStep === 2) && <View style={styles.inputGroup}>
              <Text style={styles.label}>senha</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, focusedField === "password" && styles.inputFocused]}
                  placeholder="••••••••"
                  placeholderTextColor="#7B818A"
                  secureTextEntry={!showPassword}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  accessibilityLabel="Senha"
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  value={senha}
                  onChangeText={(value) => {
                    setSenha(value);
                    setLoginError("");
                    setRegistrationError("");
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
            </View>}

            {mode === "register" && registerStep === 2 && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>confirmar senha</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="••••••••"
                    placeholderTextColor="#7B818A"
                    secureTextEntry={!showConfirmPassword}
                    autoComplete="new-password"
                    accessibilityLabel="Confirmar senha"
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      setRegistrationError("");
                    }}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color={COLORS.mutedForeground} />
                    ) : (
                      <Eye size={20} color={COLORS.mutedForeground} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            </View>

            {(mode === "login" ? loginError : registrationError) && (
              <Text style={styles.errorText} accessibilityLiveRegion="polite">
                {mode === "login" ? loginError : registrationError}
              </Text>
            )}

            {mode === "login" && (
              <TouchableOpacity
                style={styles.forgotButton}
                onPress={() => router.push("/forgotPassword")}
                accessibilityRole="button"
              >
                <Text style={styles.linkText}>esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            <View style={styles.actionsRow}>
              {mode === "register" && registerStep > 0 && (
                <TouchableOpacity
                  style={styles.backStepButton}
                  onPress={() => {
                    setRegistrationError("");
                    setRegisterStep((step) => step - 1);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Voltar à etapa anterior"
                >
                  <ArrowLeft size={19} color={COLORS.foreground} />
                  <Text style={styles.backStepText}>voltar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, busy && styles.buttonDisabled]}
                onPress={mode === "login" ? handleLogin : registerStep === REGISTER_STEPS.length - 1 ? handleRegister : nextRegisterStep}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ disabled: busy, busy }}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      {mode === "login" ? "entrar" : registerStep === REGISTER_STEPS.length - 1 ? "criar conta" : "continuar"}
                    </Text>
                    <ArrowRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>
              {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}
            </Text>
            <TouchableOpacity
              style={styles.registerButton}
              accessibilityRole="button"
              onPress={() => {
                setMode((current) => (current === "login" ? "register" : "login"));
                setRegisterStep(0);
                setSenha("");
                setConfirmPassword("");
                setLoginError("");
                setRegistrationError("");
              }}
            >
              <Text style={styles.registerText}>
                {mode === "login" ? "criar conta" : "entrar"}
              </Text>
              <ArrowRight size={16} color={BRAND_ORANGE} />
            </TouchableOpacity>
          </View>
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  registerScrollContent: { justifyContent: "flex-start" },
  content: {
    width: "100%",
    maxWidth: 440,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepsSection: {
    marginTop: 26,
  },
  stepsTrack: {
    flexDirection: "row",
    gap: 8,
  },
  stepLine: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E5E7EB" },
  stepLineActive: { backgroundColor: BRAND_ORANGE },
  hero: {
    marginTop: 48,
    marginBottom: 32,
  },
  registerHero: { marginTop: 24, marginBottom: 26 },
  title: {
    color: "#111827",
    fontSize: 38,
    fontWeight: "bold",
    letterSpacing: -0.8,
    lineHeight: 43,
  },
  titleAccent: {
    color: BRAND_ORANGE,
  },
  registerTitle: { fontSize: 32, lineHeight: 38 },
  subtitle: {
    marginTop: 12,
    maxWidth: 300,
    color: "#626973",
    fontSize: 15,
    lineHeight: 22,
  },
  form: {
    gap: 14,
  },
  fields: { gap: 14 },
  registerFields: { minHeight: 316 },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D5D8DC",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "#111827",
    fontSize: 16,
  },
  inputFocused: {
    borderColor: BRAND_ORANGE,
    borderWidth: 2,
  },
  passwordWrapper: {
    justifyContent: "center",
  },
  passwordInput: {
    paddingRight: 56,
  },
  eyeButton: {
    position: "absolute",
    right: 2,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#D5D8DC",
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 10,
    justifyContent: "center",
  },
  optionActive: {
    borderColor: BRAND_ORANGE,
    backgroundColor: BRAND_ORANGE,
  },
  optionText: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: -0.2,
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  button: {
    flex: 1,
    minHeight: 54,
    flexDirection: "row",
    backgroundColor: BRAND_ORANGE,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: -0.4,
  },
  actionsRow: { flexDirection: "row", gap: 10, marginTop: 2 },
  backStepButton: {
    minHeight: 54,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#D5D8DC",
    borderRadius: 10,
  },
  backStepText: { color: "#111827", fontSize: 14, fontWeight: "700" },
  forgotButton: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
  },
  linkText: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  switchRow: {
    marginTop: 22,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    columnGap: 5,
  },
  switchPrompt: {
    color: "#626973",
    fontSize: 13,
  },
  registerButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  registerText: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "bold",
    letterSpacing: -0.3,
  },
  errorText: {
    color: "#B42318",
    fontSize: 14,
    lineHeight: 20,
  },
});
