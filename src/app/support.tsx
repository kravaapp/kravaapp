import React, { useState } from "react";
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
import { Redirect, router } from "expo-router";
import { ChevronLeft, Send } from "lucide-react-native";
import ClientHeader from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { useToast } from "@/components/Toast";
import { useAuth, useSupportContact } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";

const COLORS = {
  foreground: "#111827",
  background: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  muted: "#64748b",
  primary: "#e85c07",
  primaryLight: "#fff0e7",
  infoCardBg: "#eff6ff",
  infoCardBorder: "#bfdbfe",
  infoCardTitle: "#1d4ed8",
  infoCardText: "#1e40af",
  destructive: "#ef4444",
};

export default function SupportScreen() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { toast } = useToast();
  const { sendSupportMessage, isSending } = useSupportContact();

  if (!user) {
    return <Redirect href="/signIn" />;
  }

  const handleSend = async () => {
    if (!subject.trim()) {
      setErrorMessage("Por favor, preencha o assunto.");
      return;
    }

    if (!message.trim()) {
      setErrorMessage("Por favor, escreva sua mensagem.");
      return;
    }

    setErrorMessage("");

    try {
      await sendSupportMessage({
        subject: subject.trim(),
        message: message.trim(),
      });

      toast({
        title: "Mensagem enviada com sucesso!",
        description: "Responderemos em breve no e-mail da sua conta.",
      });

      router.back();
    } catch (err) {
      const error = normalizeApiError(err, "Não foi possível enviar a mensagem.");
      setErrorMessage(error.description);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ClientHeader />

      <KeyboardAvoider>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.titleRow}>
            <TouchableOpacity
              accessibilityLabel="Voltar"
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft size={20} color={COLORS.foreground} />
            </TouchableOpacity>
            <View>
              <Text style={styles.title}>Fale com o suporte</Text>
              <Text style={styles.subtitle}>Dúvidas, problemas ou sugestões</Text>
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Fale com a gente</Text>
            <Text style={styles.infoDescription}>
              Conte o que aconteceu ou o que você gostaria de ver no Krava.
              Respondemos no e-mail da sua conta.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Assunto</Text>

            <TextInput
              style={styles.input}
              placeholder="Ex.: Não consigo entrar na lista"
              placeholderTextColor={COLORS.muted}
              value={subject}
              onChangeText={(text) => {
                setSubject(text);
                if (errorMessage) setErrorMessage("");
              }}
              maxLength={150}
              editable={!isSending}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mensagem</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="O que você fez, o que esperava e o que aconteceu"
              placeholderTextColor={COLORS.muted}
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                if (errorMessage) setErrorMessage("");
              }}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isSending}
            />
          </View>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!subject.trim() || !message.trim() || isSending) &&
                styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!subject.trim() || !message.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Send size={18} color="#ffffff" />
                <Text style={styles.sendButtonText}>Enviar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: COLORS.foreground,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    padding: 20,
    maxWidth: 560,
    width: "100%",
    alignSelf: "center",
    gap: 20,
  },
  infoCard: {
    backgroundColor: COLORS.infoCardBg,
    borderColor: COLORS.infoCardBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.infoCardTitle,
    marginBottom: 6,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.infoCardText,
  },
  form: {
    gap: 16,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  input: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.foreground,
  },
  textArea: {
    minHeight: 140,
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 13,
    lineHeight: 18,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
