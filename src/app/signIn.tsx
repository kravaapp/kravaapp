import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import { useLogin, useSelfRegister } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { selfRegisterSchema } from "@/schemas/auth.schemas";
import { maskCpf, maskDate, onlyDigits, toIsoDate } from "@/utils/masks";
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
import { SafeAreaView } from "react-native-safe-area-context";

const EMAIL_NOT_CONFIRMED = "Auth.EmailNotConfirmed";

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
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"M" | "F" | "prefer_not" | null>(null);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registrationError, setRegistrationError] = useState("");

  const { login, isLoading } = useLogin();
  const { selfRegister, isLoading: isRegistering } = useSelfRegister();
  const busy = isLoading || isRegistering;

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
    const isoBirthDate = toIsoDate(birthDate);
    const request = selfRegisterSchema.safeParse({
      name,
      email,
      password: senha,
      cpf: onlyDigits(cpf),
      birthDate: isoBirthDate,
      sex: sex === "prefer_not" ? null : sex,
    });
    if (!request.success) {
      const invalidFields = [
        !name.trim() && "nome",
        onlyDigits(cpf).length !== 11 && "CPF",
        !isoBirthDate && "data de nascimento",
        !sex && "sexo",
        !email.trim() && "e-mail",
        !senha && "senha",
      ].filter(Boolean);
      setRegistrationError(
        invalidFields.length
          ? `Preencha corretamente: ${invalidFields.join(", ")}.`
          : "Verifique os dados informados.",
      );
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
      setName("");
      setCpf("");
      setBirthDate("");
      setSex(null);
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <KravaLogo size={64} />

            <Text style={styles.title}>krava</Text>
            <Text style={styles.subtitle}>
              {mode === "login"
                ? "Gestão esportiva inteligente"
                : "Crie sua conta para encontrar um CT"}
            </Text>
          </View>

          <View style={styles.form}>
            {mode === "register" && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nome completo</Text>
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
                </View>

                <View style={styles.inputGroup}>
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
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Data de nascimento</Text>
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
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sexo</Text>
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
                </View>

              </>
            )}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setLoginError("");
                  setRegistrationError("");
                }}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                secureTextEntry
                value={senha}
                onChangeText={(value) => {
                  setSenha(value);
                  setLoginError("");
                  setRegistrationError("");
                }}
              />
            </View>

            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirmar senha</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={(value) => {
                    setConfirmPassword(value);
                    setRegistrationError("");
                  }}
                />
              </View>
            )}

            {(mode === "login" ? loginError : registrationError) && (
              <Text style={styles.errorText}>
                {mode === "login" ? loginError : registrationError}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.button, busy && { opacity: 0.7 }]}
              onPress={mode === "login" ? handleLogin : handleRegister}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {mode === "login" ? "Entrar" : "Criar conta"}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {mode === "login" && (
            <TouchableOpacity
              style={styles.forgotButton}
              onPress={() => router.push("/forgotPassword")}
            >
              <Text style={styles.registerText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => {
              setMode((current) => (current === "login" ? "register" : "login"));
              setSenha("");
              setConfirmPassword("");
              setLoginError("");
              setRegistrationError("");
            }}
          >
            <Text style={styles.registerText}>
              {mode === "login" ? "Criar conta" : "Já tenho uma conta"}
            </Text>
          </TouchableOpacity>
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

  // O card centraliza na área livre; com o teclado aberto o ScrollView rola
  // até o campo focado em vez de deixá-lo escondido atrás dele.
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

  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },

  title: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: "bold",
    color: "#111",
  },

  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#666",
  },

  form: {
    gap: 16,
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

  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  option: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  optionActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: COLORS.mainOrange,
  },

  optionText: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
  },

  optionTextActive: {
    color: "#fff",
  },

  button: {
    marginTop: 8,
    backgroundColor: COLORS.mainOrange,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  registerButton: {
    marginTop: 24,
    alignItems: "center",
  },

  forgotButton: {
    marginTop: 16,
    alignItems: "center",
  },

  registerText: {
    color: COLORS.mainOrange,
    fontSize: 14,
    fontWeight: "500",
  },
  errorText: {
    color: "red",
    fontSize: 14,
    textAlign: "center",
  },
});
