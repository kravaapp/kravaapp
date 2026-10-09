import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import { ActionButton, AdminCard, AdminPageHeader, AdminScreen, AdminSkeleton, Pill } from "@/components/admin/AdminUi";
import { usePaymentGateways } from "@/hooks/payments.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { gatewayConfigurationSchema, mercadoPagoConfigurationSchema } from "@/schemas/payments.schemas";
import { PaymentGateway, UpdatePaymentGateway } from "@/types/payments.types";
import { PAYMENT_GATEWAYS, gatewayConfigurationDate } from "@/utils/paymentGateways";
import { Check, Eye, EyeOff, ShieldCheck, X } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Editor = {
  gateway: PaymentGateway;
  configured: boolean;
  isActive: boolean;
  previousActive: boolean;
  intent: "configure" | "activate" | "deactivate";
};

export default function AdminPaymentGateways() {
  const refresh = useScreenRefresh([["payment-gateways"]]);
  const { toast } = useToast();
  const { configurations, hasData, isLoading, isRefreshing, error, refetch, saveGateway, isSaving } = usePaymentGateways();
  const [editor, setEditor] = useState<Editor | null>(null);
  const active = configurations.find((item) => item.isActive);
  const activeName = PAYMENT_GATEWAYS.find((item) => item.gateway === active?.gateway)?.name;
  const busy = isSaving || isRefreshing;

  const save = async (configuration: UpdatePaymentGateway) => {
    if (!editor) return;
    await saveGateway(editor.gateway, configuration);
  };

  const saved = (isActive: boolean) => {
    if (!editor) return;
    const name = PAYMENT_GATEWAYS.find((item) => item.gateway === editor.gateway)?.name;
    const statusChanged = isActive !== editor.previousActive;
    setEditor(null);
    toast({
      title: statusChanged
        ? `${name} ${isActive ? "ativado" : "desativado"}!`
        : `${name} configurado com sucesso!`,
    });
  };

  return (
    <View style={styles.screen}>
      <RefreshableScrollView {...refresh}>
        <AdminScreen>
          <AdminPageHeader title="gateways" subtitle="Configure como o CT recebe pagamentos" />
          {error && (
            <AdminCard>
              <Text accessibilityRole="alert" style={styles.error}>
                {normalizeApiError(error, "Não foi possível carregar os gateways.").description}
              </Text>
              <View style={styles.actions}>
                <ActionButton label={isRefreshing ? "Carregando..." : "Tentar novamente"} onPress={() => void refetch()} disabled={busy} outline />
              </View>
            </AdminCard>
          )}
          {isLoading ? (
            PAYMENT_GATEWAYS.map(({ gateway }) => <AdminSkeleton key={gateway} height={180} radius={16} />)
          ) : hasData ? (
            <>
              <AdminCard style={styles.activeSummary}>
                <View style={styles.summaryRow}>
                  <ShieldCheck size={24} color={COLORS.mainOrange} />
                  <View style={styles.grow}>
                    <Text style={styles.title}>{activeName ? `${activeName} está ativo` : "Nenhum gateway ativo"}</Text>
                    <Text style={styles.muted}>
                      {activeName ? "Este gateway é utilizado para os pagamentos do CT." : "Configure e ative um gateway para receber pagamentos."}
                    </Text>
                  </View>
                </View>
              </AdminCard>
              {PAYMENT_GATEWAYS.map(({ gateway, name }) => {
                const configuration = configurations.find((item) => item.gateway === gateway);
                const configured = !!configuration;
                const isActive = configuration?.isActive ?? false;
                const date = gatewayConfigurationDate(configuration?.createdAtUtc ?? null);
                const edit = (intent: Editor["intent"]) => setEditor({
                  gateway,
                  configured,
                  previousActive: isActive,
                  isActive: intent === "activate" || (intent === "configure" && isActive),
                  intent,
                });
                return (
                  <AdminCard key={gateway} style={isActive ? styles.activeCard : undefined}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.title}>{name}</Text>
                      <Pill label={configured ? (isActive ? "Ativo" : "Inativo") : "Não configurado"} tone={isActive ? "success" : "neutral"} />
                    </View>
                    {date && <Text style={styles.muted}>Configurado em {date}</Text>}
                    <Text style={styles.muted}>
                      {configured ? "Credenciais cadastradas. Os valores salvos não são exibidos." : "Cadastre as credenciais para utilizar este gateway."}
                    </Text>
                    <View style={styles.actions}>
                      <ActionButton label={configured ? "Editar configuração" : "Configurar"} onPress={() => edit("configure")} disabled={busy} outline />
                      <ActionButton label={isActive ? "Desativar" : "Ativar"} onPress={() => edit(isActive ? "deactivate" : "activate")} disabled={busy} />
                    </View>
                  </AdminCard>
                );
              })}
            </>
          ) : null}
        </AdminScreen>
      </RefreshableScrollView>
      {editor && (
        <GatewayModal
          editor={editor}
          activeOther={active?.gateway !== editor.gateway ? activeName : undefined}
          onClose={() => setEditor(null)}
          onSave={save}
          onSaved={saved}
          refreshing={isRefreshing}
        />
      )}
    </View>
  );
}

function GatewayModal({ editor, activeOther, onClose, onSave, onSaved, refreshing }: {
  editor: Editor;
  activeOther?: string;
  onClose: () => void;
  onSave: (configuration: UpdatePaymentGateway) => Promise<void>;
  onSaved: (isActive: boolean) => void;
  refreshing: boolean;
}) {
  const definition = PAYMENT_GATEWAYS.find((item) => item.gateway === editor.gateway)!;
  const [apiKey, setApiKey] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isActive, setIsActive] = useState(editor.isActive);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const submitting = useRef(false);
  const insets = useSafeAreaInsets();
  const busy = saving || refreshing;

  const close = () => {
    if (submitting.current) return;
    setApiKey("");
    setPublicKey("");
    setWebhookSecret("");
    onClose();
  };

  const submit = async (confirmed = false) => {
    if (submitting.current || refreshing) return;
    setError("");
    const schema = editor.gateway === "mercadopago" ? mercadoPagoConfigurationSchema : gatewayConfigurationSchema;
    const parsed = schema.safeParse({ apiKey, publicKey, webhookSecret, isActive });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Verifique os dados informados.");
      return;
    }
    if (isActive && activeOther && !confirmed) {
      setConfirmation(true);
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await onSave({
        apiKey: parsed.data.apiKey,
        ...(editor.gateway === "mercadopago" ? { publicKey: parsed.data.publicKey } : {}),
        ...(parsed.data.webhookSecret ? { webhookSecret: parsed.data.webhookSecret } : {}),
        isActive: parsed.data.isActive,
      });
      setApiKey("");
      setPublicKey("");
      setWebhookSecret("");
      onSaved(parsed.data.isActive);
    } catch (requestError) {
      let message = normalizeApiError(requestError, "Não foi possível salvar o gateway. Tente novamente.").description;
      // Um erro do servidor não deve repetir credenciais digitadas na mensagem.
      for (const secret of [parsed.data.apiKey, parsed.data.webhookSecret]) {
        if (secret) message = message.split(secret).join("[credencial omitida]");
      }
      setError(message);
      setConfirmation(false);
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={close}>
      <KeyboardAvoider>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={[styles.title, styles.grow]}>{confirmation ? "Confirmar troca de gateway" : definition.name}</Text>
              <TouchableOpacity onPress={close} disabled={saving} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Fechar configuração">
                <X size={22} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <ScreenScrollView contentContainerStyle={[styles.form, { paddingBottom: insets.bottom + 16 }]}>
              {confirmation ? (
                <>
                  <Text style={styles.body}>
                    O {activeOther} está atualmente ativo. Ao ativar o {definition.name}, o {activeOther} será desativado. Deseja continuar?
                  </Text>
                  <View style={styles.actions}>
                    <ActionButton label="Voltar à configuração" onPress={() => setConfirmation(false)} disabled={busy} outline />
                    <ActionButton label={saving ? "Ativando..." : "Confirmar troca"} onPress={() => void submit(true)} disabled={busy} />
                  </View>
                </>
              ) : (
                <>
                  {editor.configured && (
                    <Text style={styles.notice}>
                      A credencial salva não pode ser consultada. Informe uma chave para substituí-la ao salvar. Este formulário também envia a credencial ao ativar ou desativar o gateway.
                    </Text>
                  )}
                  <SecretField label={`${definition.credentialLabel} *`} value={apiKey} onChange={setApiKey} disabled={busy} />
                  {editor.gateway === "mercadopago" && (
                    <View style={styles.heading}>
                      <Text style={styles.fieldLabel}>Public Key *</Text>
                      <TextInput
                        accessibilityLabel="Public Key *"
                        style={styles.input}
                        value={publicKey}
                        onChangeText={setPublicKey}
                        placeholder="APP_USR-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        autoComplete="off"
                        editable={!busy}
                      />
                      <Text style={styles.muted}>Necessária para o processamento de cartões de crédito no aplicativo dos alunos.</Text>
                    </View>
                  )}
                  <SecretField label="Webhook Secret (opcional)" value={webhookSecret} onChange={setWebhookSecret} disabled={busy} />
                  <View style={styles.switchRow}>
                    <View style={styles.grow}>
                      <Text style={styles.fieldLabel}>Ativar gateway</Text>
                      <Text style={styles.muted}>{isActive ? "Utilizar este gateway para os pagamentos do CT." : "Salvar este gateway como inativo."}</Text>
                    </View>
                    <Switch value={isActive} onValueChange={setIsActive} disabled={busy} trackColor={{ true: COLORS.mainOrange }} />
                  </View>
                  {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                  <View style={styles.actions}>
                    <ActionButton
                      label={saving ? (editor.intent === "activate" ? "Ativando..." : editor.intent === "deactivate" ? "Desativando..." : "Salvando...") : "Salvar configuração"}
                      icon={saving ? <ActivityIndicator size="small" color="#fff" /> : <Check size={15} color="#fff" />}
                      onPress={() => void submit()}
                      disabled={busy}
                    />
                    <ActionButton label="Cancelar" onPress={close} disabled={busy} outline />
                  </View>
                </>
              )}
            </ScreenScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function SecretField({ label, value, onChange, disabled }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.heading}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          accessibilityLabel={label}
          style={styles.input}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          editable={!disabled}
          placeholder="Digite a credencial"
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setVisible((current) => !current)} disabled={disabled} accessibilityRole="button" accessibilityLabel={`${visible ? "Ocultar" : "Mostrar"} ${label}`}>
          {visible ? <EyeOff size={20} color={COLORS.mutedForeground} /> : <Eye size={20} color={COLORS.mutedForeground} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  heading: { gap: 6 },
  muted: { color: COLORS.mutedForeground, fontSize: 12, lineHeight: 18 },
  body: { color: COLORS.foreground, fontSize: 14, lineHeight: 22 },
  title: { color: COLORS.foreground, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  grow: { flex: 1, minWidth: 0, gap: 4 },
  cardHeader: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  activeSummary: { backgroundColor: "#FFF0E6", borderColor: "#F5D2BB" },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  activeCard: { borderColor: COLORS.mainOrange },
  error: { color: COLORS.destructive, backgroundColor: "#fee2e2", padding: 12, borderRadius: 10, fontSize: 12, lineHeight: 18 },
  notice: { color: COLORS.info, backgroundColor: COLORS.infoSurface, padding: 12, borderRadius: 10, fontSize: 12, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "flex-end", alignItems: "center" },
  sheet: { width: "100%", maxWidth: 560, maxHeight: "90%", backgroundColor: COLORS.card, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  form: { padding: 16, gap: 16 },
  fieldLabel: { color: COLORS.foreground, fontSize: 13, fontWeight: "600" },
  inputWrapper: { justifyContent: "center" },
  input: { minHeight: 46, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingLeft: 12, paddingRight: 48, color: COLORS.foreground, fontSize: 14 },
  eyeButton: { position: "absolute", right: 2, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#F7F8FA", padding: 12, borderRadius: 10 },
});
