import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import MercadoPagoCard from "@/components/MercadoPagoCard";
import { useToast } from "@/components/Toast";
import { useAuth } from "@/hooks/auth.hooks";
import { useInvoicePayment } from "@/hooks/studentPayments.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { paymentCustomerSchema } from "@/schemas/payments.schemas";
import {
  CardPaymentFields,
  PayInvoiceRequest,
  PayInvoiceResponse,
  PaymentCustomer,
} from "@/types/payments.types";
import {
  canPayInvoice,
  formatPaymentDate,
  getCheckoutUrl,
  getPaymentResultMessage,
  isPaymentPaid,
} from "@/utils/payments";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, CreditCard, QrCode } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import z from "zod";

const PAYMENT_STEPS = ["identificação", "forma de pagamento", "concluir"] as const;

export default function PaymentScreen() {
  const params = useLocalSearchParams<{ id?: string; page?: string }>();
  const { user } = useAuth();
  const id =
    typeof params.id === "string" && z.uuid().safeParse(params.id).success
      ? params.id
      : "";
  const page =
    typeof params.page === "string" && /^[1-9]\d*$/.test(params.page)
      ? Number(params.page)
      : undefined;
  return (
    <InvoicePaymentScreen
      key={`${user?.tenantId}:${user?.userId}:${id}:${page}`}
      id={id}
      page={page}
    />
  );
}

function InvoicePaymentScreen({ id, page }: { id: string; page?: number }) {
  // A navegação passa apenas o identificador e a página; os dados financeiros vêm da API.
  const { invoice: invoiceQuery, gateway, pay, refreshMembership, isPaying } = useInvoicePayment(id, page);
  const refresh = useScreenRefresh([], { enabled: !!id && !isPaying, refetch: [invoiceQuery.refetch, gateway.refetch] });
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [document, setDocument] = useState("");
  const [checkoutStep, setCheckoutStep] = useState(0);
  const [formError, setFormError] = useState("");
  const [method, setMethod] = useState<"Pix" | "CreditCard">("Pix");
  const [cardCustomer, setCardCustomer] = useState<PaymentCustomer | null>(
    null,
  );
  const [result, setResult] = useState<PayInvoiceResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const successNotified = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const invoice = invoiceQuery.data;
  const paid =
    isPaymentPaid(result?.status ?? "") || isPaymentPaid(invoice?.status ?? "");
  const cardAvailable =
    gateway.data?.gateway === "mercadopago" && !!gateway.data.publicKey?.trim();
  const checkoutUrl = getCheckoutUrl(result?.paymentUrl);
  const isPixResult = method === "Pix" && !!result;
  const terminalFailure = ["failed", "rejected", "recusado", "cancelled", "canceled"].includes(result?.status.trim().toLowerCase() ?? "");
  const { refetch: refetchInvoice } = invoiceQuery;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [checkoutStep, result]);

  const completePayment = useCallback(() => {
    if (successNotified.current) return;
    successNotified.current = true;
    void refreshMembership();
    toast({ title: "Pagamento aprovado!", description: "Sua cobrança foi paga." });
    router.replace("/(user)/paymentPlans");
  }, [toast, refreshMembership]);

  useEffect(() => {
    if (paid) completePayment();
  }, [paid, completePayment]);

  useFocusEffect(useCallback(() => {
    if (!invoice || !canPayInvoice(invoice.status) || paid) return;
    let active = true;
    let checking = false;
    const interval = setInterval(() => {
      if (checking) return;
      checking = true;
      void refetchInvoice().then((refreshed) => {
        if (active && !refreshed.error && isPaymentPaid(refreshed.data?.status ?? "")) {
          completePayment();
        }
      }).catch(() => {
        // A próxima consulta automática tentará novamente.
      }).finally(() => { checking = false; });
    }, 7000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [invoice?.status, paid, refetchInvoice, completePayment]));

  const showError = (description: string) => {
    toast({ title: description, variant: "destructive" });
  };

  const customer = () => {
    const parsed = paymentCustomerSchema.safeParse({
      customerName: name,
      customerEmail: email.trim(),
      customerDocument: document,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0].message);
      return null;
    }
    setFormError("");
    return parsed.data;
  };

  const submit = async (request: PayInvoiceRequest) => {
    if (
      inFlight.current ||
      !invoice ||
      !canPayInvoice(invoice.status) ||
      result ||
      paid
    )
      return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const response = await pay(request);
      setResult(response);
      setCardCustomer(null);
      if (isPaymentPaid(response.status)) {
        completePayment();
      } else if (["rejected", "failed", "recusado"].includes(response.status.trim().toLowerCase())) {
        showError(getPaymentResultMessage(response.status));
      }
    } catch (requestError) {
      showError(
        normalizeApiError(
          requestError,
          "Não foi possível iniciar o pagamento. Tente novamente.",
        ).description,
      );
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const continuePayment = () => {
    const payer = customer();
    if (!payer) return;
    void submit({ ...payer, method: "Pix" });
  };

  const continueToMethod = () => {
    if (customer()) setCheckoutStep(1);
  };

  const continueToFinish = () => {
    const payer = customer();
    if (!payer) {
      setCheckoutStep(0);
      return;
    }
    if (method === "CreditCard" && !cardAvailable) {
      setFormError("Cartão de crédito indisponível para esta cobrança.");
      return;
    }
    setCardCustomer(method === "CreditCard" ? payer : null);
    setCheckoutStep(2);
  };

  const onCardToken = async (fields: CardPaymentFields) => {
    if (cardCustomer)
      await submit({ ...cardCustomer, method: "CreditCard", ...fields });
  };

  const refreshPayment = async () => {
    const refreshed = await invoiceQuery.refetch();
    if (refreshed.error)
      showError(
        normalizeApiError(
          refreshed.error,
          "Não foi possível consultar o pagamento.",
        ).description,
      );
    else if (
      isPaymentPaid(
        refreshed.data?.status ?? "",
      )
    ) {
      completePayment();
    } else {
      toast({
        title: "Consulta atualizada",
        description:
          "Confira o status nas suas pendências. A confirmação pode levar alguns instantes.",
      });
    }
  };

  const button = (label: string, onPress: () => void, disabled = false) => (
    <TouchableOpacity
      accessibilityRole="button"
      style={[styles.button, disabled && styles.disabled]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ClientHeader />
      <KeyboardAvoider>
        <RefreshableScrollView {...refresh}
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.back}
            onPress={() => router.navigate("/(user)/pendingPayments")}
            disabled={submitting}
          >
            <ArrowLeft size={18} color={COLORS.mainOrange} />
            <Text style={styles.backText}>Voltar às pendências</Text>
          </TouchableOpacity>
          <Text style={styles.title}>pagamento</Text>
          <Text style={styles.subtitle}>Acompanhe e finalize sua cobrança.</Text>
          <View style={styles.flow}>
          {invoice && !paid && canPayInvoice(invoice.status) && (
            <>
              <View style={styles.summary}>
                <View style={styles.summaryMeta}>
                  <Text style={styles.summaryEyebrow}>COBRANÇA</Text>
                  <Text style={styles.summaryMuted}>Vence {formatPaymentDate(invoice.dueDate)}</Text>
                </View>
                <View style={styles.summaryMain}>
                  <Text style={styles.summaryHeading} numberOfLines={1}>{invoice.description || "Cobrança"}</Text>
                  <Text style={styles.amount}>{invoice.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
                </View>
              </View>
              <View style={styles.stepsTrack} accessible accessibilityLabel={`Etapa ${result ? 3 : checkoutStep + 1} de ${PAYMENT_STEPS.length}: ${PAYMENT_STEPS[result ? 2 : checkoutStep]}`}>
                {PAYMENT_STEPS.map((step, index) => (
                  <View key={step} style={[styles.stepLine, index <= (result ? 2 : checkoutStep) && styles.stepLineActive]} />
                ))}
              </View>
            </>
          )}
          {!id ? (
            <Text style={styles.error}>Cobrança inválida.</Text>
          ) : invoiceQuery.isLoading || gateway.isLoading ? (
            <ActivityIndicator size="large" color={COLORS.mainOrange} />
          ) : paid ? (
            <View style={styles.messageContent}>
              <Text style={styles.heading}>Pagamento aprovado!</Text>
              <Text style={styles.muted}>Sua cobrança foi paga.</Text>
              {button("Ver pendências", () =>
                router.navigate("/(user)/pendingPayments"),
              )}
            </View>
          ) : result && invoice && canPayInvoice(invoice.status) ? (
            <View style={isPixResult ? styles.pixResult : styles.messageContent}>
              <Text style={styles.heading}>
                {getPaymentResultMessage(result.status)}
              </Text>
              {!!result.pixQrCodeBase64 && (
                <Image
                  accessibilityLabel="QR Code Pix"
                  source={{
                    uri: result.pixQrCodeBase64.startsWith(
                      "data:image/png;base64,",
                    )
                      ? result.pixQrCodeBase64
                      : `data:image/png;base64,${result.pixQrCodeBase64}`,
                  }}
                  style={styles.qrCode}
                  resizeMode="contain"
                />
              )}
              {!!result.pixCopyPaste && (
                <>
                  <Text style={styles.muted}>
                    Copie o código e pague pelo aplicativo do seu banco.
                  </Text>
                  {button("Copiar código Pix", () => {
                    void Clipboard.setStringAsync(result.pixCopyPaste!)
                      .then(() => toast({ title: "Código Pix copiado!" }))
                      .catch(() =>
                        showError("Não foi possível copiar. Tente novamente."),
                      );
                  })}
                </>
              )}
              {!terminalFailure && <Text style={styles.muted}>Verificando pagamento automaticamente.</Text>}
              {isPixResult && (
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.changePayment}
                  onPress={() => {
                    setResult(null);
                    setCheckoutStep(1);
                  }}
                  disabled={submitting}
                >
                  <Text style={[styles.changePaymentText, submitting && styles.disabled]}>
                    Alterar forma de pagamento
                  </Text>
                </TouchableOpacity>
              )}
              {!isPixResult && checkoutUrl &&
                button(
                  result.status === "action_required"
                    ? "Concluir autenticação"
                    : "Abrir pagamento",
                  () => {
                    void WebBrowser.openBrowserAsync(checkoutUrl)
                      .then(() => refreshPayment())
                      .catch(() =>
                        showError("Não foi possível abrir o pagamento."),
                      );
                  },
                )}
              {result.status === "action_required" && !checkoutUrl && (
                <Text style={styles.muted}>
                  O provedor não enviou um link de autenticação. Consulte suas
                  pendências antes de tentar novamente.
                </Text>
              )}
              {!isPixResult && button(
                "Atualizar status",
                () => {
                  void refreshPayment();
                },
                invoiceQuery.isFetching,
              )}
              {!isPixResult && ["rejected", "failed", "recusado"].includes(
                result.status.toLowerCase(),
              ) &&
                button("Tentar novamente", () => {
                  setResult(null);
                  setCardCustomer(null);
                  setCheckoutStep(1);
                })}
              {!isPixResult && button("Ver pendências", () =>
                router.navigate("/(user)/pendingPayments"),
              )}
            </View>
          ) : invoiceQuery.error || gateway.error ? (
            <View style={styles.messageContent}>
              <Text style={styles.error}>
                {
                  normalizeApiError(
                    invoiceQuery.error || gateway.error,
                    "Não foi possível carregar o pagamento.",
                  ).description
                }
              </Text>
              {button(
                "Tentar novamente",
                () => {
                  void invoiceQuery.refetch();
                  void gateway.refetch();
                },
                invoiceQuery.isFetching || gateway.isFetching,
              )}
            </View>
          ) : !invoice ? (
            <Text style={styles.muted}>
              Esta cobrança não está disponível. Volte às pendências para
              consultar a lista atualizada.
            </Text>
          ) : !canPayInvoice(invoice.status) ? (
            <Text style={styles.muted}>
              Esta cobrança está {invoice.status} e não está disponível para
              pagamento.
            </Text>
          ) : (
            <View style={styles.stepContent}>
                {checkoutStep === 0 ? (
                  <>
                    <Text style={styles.heading}>identificação</Text>
                    <View style={styles.field}>
                      <Text style={styles.label}>nome completo</Text>
                      <TextInput accessibilityLabel="Nome completo" style={styles.input} value={name} onChangeText={(value) => { setName(value); setFormError(""); }} editable={!submitting} autoComplete="name" autoCapitalize="words" />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>e-mail</Text>
                      <TextInput accessibilityLabel="E-mail" style={styles.input} value={email} onChangeText={(value) => { setEmail(value); setFormError(""); }} editable={!submitting} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
                    </View>
                    <View style={styles.field}>
                      <Text style={styles.label}>CPF ou CNPJ</Text>
                      <TextInput accessibilityLabel="CPF ou CNPJ" style={styles.input} value={document} onChangeText={(value) => { setDocument(value); setFormError(""); }} editable={!submitting} keyboardType="number-pad" maxLength={18} />
                    </View>
                    {!!formError && <Text style={styles.error} accessibilityLiveRegion="polite">{formError}</Text>}
                    {button("continuar", continueToMethod)}
                  </>
                ) : checkoutStep === 1 ? (
                  <>
                    <Text style={styles.heading}>forma de pagamento</Text>
                    <View style={styles.row}>
                      {(
                        ["Pix", ...(cardAvailable ? ["CreditCard"] : [])] as (
                          | "Pix"
                          | "CreditCard"
                        )[]
                      ).map((option) => (
                        <TouchableOpacity
                          key={option}
                          accessibilityRole="radio"
                          accessibilityState={{
                            checked: method === option,
                            disabled: submitting,
                          }}
                          style={[
                            styles.method,
                            method === option && styles.selected,
                          ]}
                          disabled={submitting}
                          onPress={() => {
                            setMethod(option);
                            setFormError("");
                          }}
                        >
                          {option === "Pix" ? <QrCode size={21} color={COLORS.foreground} /> : <CreditCard size={21} color={COLORS.foreground} />}
                          <View style={styles.methodText}>
                            <Text style={styles.methodTitle}>{option === "Pix" ? "Pix" : "cartão de crédito"}</Text>
                            <Text style={styles.methodDescription}>{option === "Pix" ? "Código para pagar no aplicativo do banco" : "Pagamento com cartão"}</Text>
                          </View>
                          <View style={[styles.radio, method === option && styles.radioSelected]}>
                            {method === option && <View style={styles.radioDot} />}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {!!formError && <Text style={styles.error} accessibilityLiveRegion="polite">{formError}</Text>}
                    {button("continuar", continueToFinish, submitting || !gateway.data)}
                    <TouchableOpacity accessibilityRole="button" style={styles.stepBack} onPress={() => setCheckoutStep(0)}><Text style={styles.stepBackText}>voltar aos dados</Text></TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.heading}>{method === "Pix" ? "concluir com Pix" : "concluir com cartão"}</Text>
                    {method === "Pix" ? (
                      <>
                        <Text style={styles.muted}>Pague pelo aplicativo do seu banco.</Text>
                        {button(submitting || isPaying ? "processando..." : "gerar código Pix", continuePayment, submitting || isPaying || !gateway.data)}
                      </>
                    ) : cardCustomer ? (
                      <>
                        <MercadoPagoCard
                          publicKey={gateway.data!.publicKey!}
                          amount={invoice.amount}
                          customerName={cardCustomer.customerName}
                          customerDocument={cardCustomer.customerDocument}
                          onToken={onCardToken}
                          onError={showError}
                          onFallbackToPix={() => {
                            setMethod("Pix");
                          }}
                        />
                      </>
                    ) : (
                      <Text style={styles.error}>Volte e confirme a forma de pagamento.</Text>
                    )}
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.stepBack}
                      onPress={() => { setCardCustomer(null); setCheckoutStep(1); }}
                      disabled={submitting}
                    >
                      <Text style={[styles.stepBackText, submitting && styles.disabled]}>alterar forma de pagamento</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
          )}
          </View>
        </RefreshableScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  back: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start", minHeight: 36 },
  backText: { color: COLORS.foreground, fontWeight: "700", fontSize: 13 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -1.2, color: COLORS.foreground, textTransform: "lowercase" },
  subtitle: { color: COLORS.mutedForeground, fontSize: 14, lineHeight: 21, marginTop: -12, marginBottom: 6 },
  heading: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5, color: COLORS.foreground },
  flow: { flexGrow: 1, justifyContent: "center", gap: 8 },
  summary: { minHeight: 104, paddingHorizontal: 18, paddingVertical: 12, justifyContent: "center", gap: 8, borderRadius: 18, backgroundColor: COLORS.mainOrange },
  summaryMeta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  summaryEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1, color: COLORS.white, opacity: 0.85 },
  summaryMain: { gap: 2 },
  summaryHeading: { fontSize: 15, fontWeight: "700", color: COLORS.white },
  summaryMuted: { fontSize: 12, color: COLORS.white, opacity: 0.9 },
  stepsTrack: { flexDirection: "row", gap: 8 },
  stepLine: { flex: 1, height: 5, borderRadius: 3, backgroundColor: "#E5E7EB" },
  stepLineActive: { backgroundColor: COLORS.mainOrange },
  stepContent: { gap: 14 },
  messageContent: { gap: 14 },
  pixResult: {
    gap: 14,
    alignItems: "stretch",
    backgroundColor: COLORS.white,
  },
  amount: { fontSize: 30, fontWeight: "800", letterSpacing: -0.8, color: COLORS.white },
  muted: { fontSize: 15, lineHeight: 22, color: COLORS.mutedForeground },
  label: { color: COLORS.foreground, fontSize: 14, fontWeight: "bold", letterSpacing: -0.2 },
  field: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#D5D8DC",
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    color: COLORS.foreground,
    backgroundColor: COLORS.white,
    fontSize: 16,
  },
  row: { gap: 0, marginVertical: 2 },
  method: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  selected: { borderBottomColor: COLORS.mainOrange },
  methodText: { flex: 1, gap: 2 },
  methodTitle: { color: COLORS.foreground, fontSize: 14, fontWeight: "800" },
  methodDescription: { color: COLORS.mutedForeground, fontSize: 13, lineHeight: 19 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#B8BDC5", alignItems: "center", justifyContent: "center" },
  radioSelected: { borderColor: COLORS.mainOrange },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.mainOrange },
  button: {
    minHeight: 54,
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
  },
  buttonText: { color: COLORS.white, fontWeight: "bold", fontSize: 18, letterSpacing: -0.4 },
  stepBack: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  stepBackText: { color: COLORS.foreground, fontWeight: "700", fontSize: 13 },
  changePayment: { alignSelf: "flex-start", paddingVertical: 8 },
  changePaymentText: { color: COLORS.mainOrange, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  error: { color: COLORS.destructive, fontSize: 14 },
  qrCode: { width: 164, height: 164, maxWidth: "100%", alignSelf: "center" },
});
