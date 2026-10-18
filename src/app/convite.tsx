import { COLORS } from "@/constants/colors";
import KravaLogo from "@/components/KravaLogo";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  useAuth,
  useCatalogActions,
  useInvitationDetails,
  useLogin,
  useSelfRegister,
} from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { selfRegisterSchema } from "@/schemas/auth.schemas";
import {
  maskCpf,
  maskDate,
  maskPhone,
  onlyDigits,
  toIsoDate,
} from "@/utils/masks";
import { router, useLocalSearchParams } from "expo-router";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserCheck,
} from "lucide-react-native";
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

export default function Convite() {
  const { toast } = useToast();
  const { user, selectTenantState } = useAuth();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = typeof rawToken === "string" ? rawToken.trim() : "";

  const { invitation, isLoading, error } = useInvitationDetails(token || null);
  const accessToken =
    user?.accessToken ??
    selectTenantState?.preAuthToken ??
    selectTenantState?.currentToken?.accessToken ??
    "";
  const { acceptInvitation, isAccepting } = useCatalogActions(accessToken);

  // Form states para novo cadastro
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [sex, setSex] = useState<"M" | "F" | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState("");

  const { selfRegister, isLoading: isRegistering } = useSelfRegister();
  const { login, isLoading: isLoggingIn } = useLogin();
  const isBusy = isAccepting || isRegistering || isLoggingIn;

  // 1. Estado sem token
  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={COLORS.destructive} />
          <Text style={styles.title}>Convite Inválido</Text>
          <Text style={styles.description}>
            Nenhum código de convite foi encontrado no link acessado.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/signIn")}
          >
            <Text style={styles.primaryButtonText}>Ir para o Início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 2. Estado de carregamento
  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <KravaLogo size={44} />
          <ActivityIndicator
            size="large"
            color={COLORS.mainOrange}
            style={{ marginTop: 24 }}
          />
          <Text style={styles.loadingText}>Carregando convite...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 3. Convite não encontrado ou erro
  if (error || !invitation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={COLORS.destructive} />
          <Text style={styles.title}>Convite não Encontrado</Text>
          <Text style={styles.description}>
            Este convite pode ter expirado ou o link é inválido.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/signIn")}
          >
            <Text style={styles.primaryButtonText}>Ir para o Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 4. Convite já aceito anteriormente
  if (invitation.status === "Accepted") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <CheckCircle2 size={48} color={COLORS.success} />
          <Text style={styles.title}>Convite já Aceito</Text>
          <Text style={styles.description}>
            Este convite para o Centro de Treinamento{" "}
            <Text style={styles.highlight}>{invitation.ctName}</Text> já foi aceito anteriormente.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/signIn")}
          >
            <Text style={styles.primaryButtonText}>Ir para o Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 5. Convite cancelado
  if (invitation.status === "Canceled") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <AlertCircle size={48} color={COLORS.destructive} />
          <Text style={styles.title}>Convite Cancelado</Text>
          <Text style={styles.description}>
            Este convite para o Centro de Treinamento{" "}
            <Text style={styles.highlight}>{invitation.ctName}</Text> foi cancelado pela administração.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace("/signIn")}
          >
            <Text style={styles.primaryButtonText}>Ir para o Início</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // 6. Cenário: Usuário já está logado no app
  if (user) {
    const handleAcceptLoggedIn = async () => {
      try {
        await acceptInvitation({
          id: invitation.id,
          ctId: invitation.ctId,
          ctName: invitation.ctName,
          role: invitation.role,
        });
        toast({
          title: `Convite aceito! Bem-vindo(a) ao ${invitation.ctName}.`,
        });
        router.replace("/selectTenant");
      } catch (err) {
        const info = normalizeApiError(err, "Não foi possível aceitar o convite.");
        toast({
          title: "Erro ao aceitar convite",
          description: info.description,
          variant: "destructive",
        });
      }
    };

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <KravaLogo size={36} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Building2 size={32} color={COLORS.mainOrange} />
            </View>

            <Text style={styles.cardTitle}>Você foi convidado!</Text>
            <Text style={styles.cardSubtitle}>
              O Centro de Treinamento{" "}
              <Text style={styles.highlight}>{invitation.ctName}</Text> convidou
              você para ingressar como{" "}
              <Text style={styles.highlight}>{invitation.role}</Text>.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>Conectado como:</Text>
              <Text style={styles.infoValue}>{user.email}</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, isBusy && styles.disabled]}
              onPress={handleAcceptLoggedIn}
              disabled={isBusy}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Aceitar Convite</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace("/selectTenant")}
              disabled={isBusy}
            >
              <Text style={styles.secondaryButtonText}>Agora não</Text>
            </TouchableOpacity>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    );
  }

  // 5. Cenário: Usuário NÃO logado, mas JÁ TEM CONTA no Krava
  if (invitation.userExists) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScreenScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <KravaLogo size={36} />
          </View>

          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <UserCheck size={32} color={COLORS.mainOrange} />
            </View>

            <Text style={styles.cardTitle}>Você já tem uma conta!</Text>
            <Text style={styles.cardSubtitle}>
              O Centro de Treinamento{" "}
              <Text style={styles.highlight}>{invitation.ctName}</Text> convidou
              você para treinar como{" "}
              <Text style={styles.highlight}>{invitation.role}</Text>.
            </Text>

            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>E-mail convidado:</Text>
              <Text style={styles.infoValue}>{invitation.email}</Text>
            </View>

            <Text style={styles.instruction}>
              Faça login com sua senha habitual para confirmar e entrar no novo
              CT.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() =>
                router.replace({
                  pathname: "/signIn",
                  params: { email: invitation.email },
                })
              }
            >
              <Text style={styles.primaryButtonText}>
                Fazer Login para Aceitar
              </Text>
            </TouchableOpacity>
          </View>
        </ScreenScrollView>
      </SafeAreaView>
    );
  }

  // 6. Cenário: Usuário NÃO logado e NÃO TEM CONTA (Novo Cadastro Direto)
  const handleRegisterNewUser = async () => {
    setFormError("");

    if (!name.trim()) {
      setFormError("Informe seu nome completo.");
      return;
    }
    const cleanCpf = onlyDigits(cpf);
    if (cleanCpf.length !== 11) {
      setFormError("Informe um CPF válido com 11 dígitos.");
      return;
    }
    const isoBirth = toIsoDate(birthDate);
    if (!isoBirth) {
      setFormError("Informe uma data de nascimento válida (DD/MM/AAAA).");
      return;
    }
    if (!sex) {
      setFormError("Selecione o sexo.");
      return;
    }
    const cleanPhone = onlyDigits(phone);
    if (cleanPhone.length < 10) {
      setFormError("Informe um telefone válido.");
      return;
    }
    if (password.length < 8) {
      setFormError("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("As senhas não coincidem.");
      return;
    }

    try {
      await selfRegister({
        name: name.trim(),
        email: invitation.email,
        password,
        cpf: cleanCpf,
        birthDate: isoBirth,
        sex,
        phone: cleanPhone,
        invitationId: invitation.id,
      });

      // Como o convite auto-confirma o e-mail, loga imediatamente
      await login({
        email: invitation.email,
        password,
      });

      toast({
        title: `Conta criada! Bem-vindo(a) ao ${invitation.ctName}.`,
      });
    } catch (err) {
      const info = normalizeApiError(err, "Não foi possível criar a conta.");
      setFormError(info.description);
      toast({
        title: "Não foi possível concluir o cadastro",
        description: info.description,
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <KravaLogo size={36} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Building2 size={32} color={COLORS.mainOrange} />
          </View>

          <Text style={styles.cardTitle}>Bem-vindo ao Krava!</Text>
          <Text style={styles.cardSubtitle}>
            Você foi convidado para o{" "}
            <Text style={styles.highlight}>{invitation.ctName}</Text>. Complete
            seu cadastro para ingressar imediatamente:
          </Text>

          {formError ? (
            <View style={styles.errorBox}>
              <AlertCircle size={16} color={COLORS.destructive} />
              <Text style={styles.errorText}>{formError}</Text>
            </View>
          ) : null}

          {/* E-mail (travado, veio do convite) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-mail (fixado pelo convite)</Text>
            <View style={[styles.inputWrapper, styles.disabledInput]}>
              <Mail size={18} color={COLORS.mutedForeground} />
              <TextInput
                value={invitation.email}
                editable={false}
                style={[styles.input, { color: COLORS.mutedForeground }]}
              />
            </View>
          </View>

          {/* Nome */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome Completo *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Seu nome"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>

          {/* CPF */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CPF *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={cpf}
                onChangeText={(v) => setCpf(maskCpf(v))}
                placeholder="000.000.000-00"
                keyboardType="numeric"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>

          {/* Data de Nascimento */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Data de Nascimento *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={birthDate}
                onChangeText={(v) => setBirthDate(maskDate(v))}
                placeholder="DD/MM/AAAA"
                keyboardType="numeric"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>

          {/* Sexo */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sexo *</Text>
            <View style={styles.sexRow}>
              <TouchableOpacity
                style={[
                  styles.sexButton,
                  sex === "M" && styles.sexButtonActive,
                ]}
                onPress={() => setSex("M")}
              >
                <Text
                  style={[
                    styles.sexButtonText,
                    sex === "M" && styles.sexButtonTextActive,
                  ]}
                >
                  Masculino
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sexButton,
                  sex === "F" && styles.sexButtonActive,
                ]}
                onPress={() => setSex("F")}
              >
                <Text
                  style={[
                    styles.sexButtonText,
                    sex === "F" && styles.sexButtonTextActive,
                  ]}
                >
                  Feminino
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Telefone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefone / WhatsApp *</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                value={phone}
                onChangeText={(v) => setPhone(maskPhone(v))}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>

          {/* Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Crie uma Senha *</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={COLORS.mutedForeground} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? (
                  <EyeOff size={18} color={COLORS.mutedForeground} />
                ) : (
                  <Eye size={18} color={COLORS.mutedForeground} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirmar Senha */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirmar Senha *</Text>
            <View style={styles.inputWrapper}>
              <Lock size={18} color={COLORS.mutedForeground} />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                placeholder="Repita a senha"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.input}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isBusy && styles.disabled]}
            onPress={handleRegisterNewUser}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Criar Conta e Ingressar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScreenScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 24,
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.mutedForeground,
    fontSize: 15,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 15,
    color: COLORS.mutedForeground,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  highlight: {
    fontWeight: "600",
    color: COLORS.foreground,
  },
  instruction: {
    fontSize: 14,
    color: COLORS.mutedForeground,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  inputGroup: {
    marginBottom: 16,
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  disabledInput: {
    opacity: 0.65,
    backgroundColor: "#F1F5F9",
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.foreground,
  },
  sexRow: {
    flexDirection: "row",
    gap: 12,
  },
  sexButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  sexButtonActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: "#FFF7ED",
  },
  sexButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.mutedForeground,
  },
  sexButtonTextActive: {
    color: COLORS.mainOrange,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: COLORS.mainOrange,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.destructive,
    fontSize: 13,
    flex: 1,
  },
});
