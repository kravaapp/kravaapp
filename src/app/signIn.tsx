import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
import { useToast } from "@/components/Toast";
import { useLogin, useSelfRegister } from "@/hooks/auth.hooks";
import { selfRegisterSchema } from "@/schemas/auth.schemas";
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

export default function Login() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const { login, isLoading, error } = useLogin();
  const {
    selfRegister,
    isLoading: isRegistering,
    error: registerError,
  } = useSelfRegister();
  const busy = isLoading || isRegistering;

  const handleLogin = async () => {
    if (!email || !senha) return;
    await login({ email, password: senha });
  };

  const handleRegister = async () => {
    if (busy) return;
    const request = selfRegisterSchema.safeParse({
      name,
      email,
      password: senha,
    });
    if (!request.success) {
      toast({
        title: "Preencha nome, e-mail e senha corretamente.",
        variant: "destructive",
      });
      return;
    }
    if (senha !== confirmPassword) {
      toast({ title: "As senhas não coincidem.", variant: "destructive" });
      return;
    }
    try {
      await selfRegister(request.data);
      setMode("login");
      setName("");
      setSenha("");
      setConfirmPassword("");
      toast({ title: "Conta criada! Entre para escolher seu CT." });
    } catch {
      // O erro detalhado da API é exibido abaixo do formulário.
    }
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                autoCapitalize="words"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
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
                onChangeText={setConfirmPassword}
              />
            </View>
          )}

          {(mode === "login" ? error : registerError) && (
            <Text style={styles.errorText}>
              {mode === "login" ? error : registerError}
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

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => {
            setMode((current) => (current === "login" ? "register" : "login"));
            setSenha("");
            setConfirmPassword("");
          }}
        >
          <Text style={styles.registerText}>
            {mode === "login" ? "Criar conta" : "Já tenho uma conta"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
