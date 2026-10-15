import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import { getHomeRoute } from "@/contexts/authContext";
import { useMeuPerfilAluno } from "@/hooks/alunos.hooks";
import { useAuth } from "@/hooks/auth.hooks";
import { normalizeApiError } from "@/routes/apiError";
import {
  maskCpf,
  maskDate,
  maskPhone,
  onlyDigits,
  toDateInput,
  toIsoDate,
} from "@/utils/masks";
import { Redirect, router } from "expo-router";
import { ChevronLeft, Check, Lock } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ProfileForm = {
  cpf: string;
  birthDate: string;
  sex: "M" | "F" | null;
  phone: string;
};

const emptyForm: ProfileForm = {
  cpf: "",
  birthDate: "",
  sex: null,
  phone: "",
};

const normalizeSex = (value: string | null): ProfileForm["sex"] =>
  value === "M" || value === "F" ? value : null;

export default function Profile() {
  const refresh = useScreenRefresh([["aluno", "me"]]);
  const { user } = useAuth();
  const { toast } = useToast();
  const isStudent = user?.role === "Aluno";
  const { aluno, isLoading, error, updateMeuPerfil, isSaving } =
    useMeuPerfilAluno(isStudent);
  const [form, setFormState] = useState<ProfileForm>(emptyForm);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const formDirty = useRef(false);
  const setForm = (value: Parameters<typeof setFormState>[0]) => {
    formDirty.current = true;
    setFormState(value);
  };
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!aluno || formDirty.current) return;
    setFormState({
      cpf: maskCpf(aluno.cpf ?? ""),
      birthDate: toDateInput(aluno.birthDate),
      sex: normalizeSex(aluno.sex),
      phone: maskPhone(aluno.phone ?? ""),
    });
    setFormError("");
  }, [aluno]);

  if (!user) return <Redirect href="/signIn" />;
  if (!isStudent) return <Redirect href={getHomeRoute(user.role)} />;

  const save = async () => {
    const cpf = onlyDigits(form.cpf);
    const birthDate = form.birthDate ? toIsoDate(form.birthDate) : null;

    if (form.cpf && cpf.length !== 11) {
      setFormError("Informe um CPF com 11 dígitos.");
      return;
    }
    if (form.birthDate && !birthDate) {
      setFormError("Informe o nascimento no formato DD/MM/AAAA.");
      return;
    }

    setFormError("");
    try {
      await updateMeuPerfil({
        cpf: cpf || null,
        birthDate,
        sex: form.sex,
        phone: onlyDigits(form.phone) || null,
        emergencyContact: aluno?.emergencyContact ?? null,
        emergencyPhone: aluno?.emergencyPhone ?? null,
        medicalNotes: aluno?.medicalNotes ?? null,
        photoUrl: aluno?.photoUrl ?? null,
      });
      formDirty.current = false;
      toast({ title: "Perfil atualizado!" });
    } catch (requestError) {
      setFormError(
        normalizeApiError(
          requestError,
          "Não foi possível atualizar o perfil.",
        ).description,
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ClientHeader />
      <RefreshableScrollView {...refresh} contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            accessibilityLabel="Voltar"
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={20} color={COLORS.foreground} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Meu perfil</Text>
            <Text style={styles.subtitle}>Dados pessoais no CT atual</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={COLORS.mainOrange} />
          </View>
        ) : error || !aluno ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>
              Não foi possível carregar seu perfil.
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Field label="Nome" value={aluno.userName ?? "Não informado"} editable={false} />
            <Field
              label="CPF"
              value={form.cpf}
              placeholder="000.000.000-00"
              keyboardType="number-pad"
              onChangeText={(value) => {
                setForm((current) => ({ ...current, cpf: maskCpf(value) }));
                setFormError("");
              }}
            />
            <Field
              label="Nascimento"
              value={form.birthDate}
              placeholder="DD/MM/AAAA"
              keyboardType="number-pad"
              onChangeText={(value) => {
                setForm((current) => ({ ...current, birthDate: maskDate(value) }));
                setFormError("");
              }}
            />
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Sexo</Text>
              <View style={styles.options}>
                {[
                  { label: "Masculino", value: "M" as const },
                  { label: "Feminino", value: "F" as const },
                  { label: "Prefiro não responder", value: null },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.label}
                    onPress={() => {
                      setForm((current) => ({ ...current, sex: option.value }));
                      setFormError("");
                    }}
                    style={[
                      styles.option,
                      form.sex === option.value && styles.optionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        form.sex === option.value && styles.optionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <Field
              label="Telefone"
              value={form.phone}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setForm((current) => ({ ...current, phone: maskPhone(value) }));
                setFormError("");
              }}
            />

            {formError ? <Text style={styles.fieldError}>{formError}</Text> : null}

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.disabled]}
              disabled={isSaving}
              onPress={save}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Check size={18} color="#fff" />
                  <Text style={styles.saveText}>Salvar alterações</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.changePasswordButton}
              onPress={() => setChangePasswordVisible(true)}
            >
              <Lock size={16} color={COLORS.primary} />
              <Text style={styles.changePasswordButtonText}>Alterar Senha</Text>
            </TouchableOpacity>
          </View>
        )}
      </RefreshableScrollView>

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  placeholder,
  keyboardType,
  editable = true,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder?: string;
  keyboardType?: "default" | "number-pad" | "phone-pad";
  editable?: boolean;
  onChangeText?: (value: string) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, !editable && styles.inputReadOnly]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        keyboardType={keyboardType}
        editable={editable}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: COLORS.foreground, fontSize: 22, fontWeight: "800" },
  subtitle: { color: COLORS.mutedForeground, fontSize: 12, marginTop: 2 },
  loading: { paddingVertical: 60, alignItems: "center" },
  form: {
    gap: 16,
  },
  fieldGroup: { gap: 7 },
  label: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    color: COLORS.foreground,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  inputReadOnly: { backgroundColor: "#f8fafc", color: COLORS.mutedForeground },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: COLORS.mainOrange,
  },
  optionText: { color: COLORS.foreground, fontSize: 13, fontWeight: "600" },
  optionTextActive: { color: "#fff" },
  fieldError: { color: COLORS.destructive, fontSize: 13, lineHeight: 18 },
  errorCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  errorText: { color: COLORS.destructive, fontSize: 13 },
  saveButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.65 },
  changePasswordButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  changePasswordButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
});
