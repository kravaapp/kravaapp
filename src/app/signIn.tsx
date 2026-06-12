import KravaLogo from "@/components/KravaLogo";
import { AuthContext } from "@/contexts/authContext";
import { useContext, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const { signIn } = useContext(AuthContext);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <KravaLogo size={64} />

          <Text style={styles.title}>krava</Text>
          <Text style={styles.subtitle}>
            Gestão esportiva inteligente
          </Text>
        </View>

        <View style={styles.form}>
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

          <TouchableOpacity
            style={styles.button}
            onPress={() => signIn()}
          >
            <Text style={styles.buttonText}>Entrar</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.registerButton}
        >
          <Text style={styles.registerText}>
            Criar conta
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
    backgroundColor: "#2563eb",
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
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "500",
  },
});