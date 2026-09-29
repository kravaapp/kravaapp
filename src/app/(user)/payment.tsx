import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import MercadoPagoCard from "@/components/MercadoPagoCard";
import { useToast } from "@/components/Toast";
import { useMeuPerfilAluno } from "@/hooks/alunos.hooks";
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
import { ArrowLeft } from "lucide-react-native";
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
  const { invoices, gateway, pay, isPaying } = useInvoicePayment(id, page);
  const { user } = useAuth();
  const { aluno } = useMeuPerfilAluno(!!id);
  const { toast } = useToast();
  const [name, setName] = useState(user?.userName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [document, setDocument] = useState("");
  const [method, setMethod] = useState<"Pix" | "CreditCard">("Pix");
  const [cardCustomer, setCardCustomer] = useState<PaymentCustomer | null>(
    null,
  );
  const [result, setResult] = useState<PayInvoiceResponse | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const successNotified = useRef(false);
  const invoice = invoices.data?.items.find((item) => item.id === id);
  const paid =
    isPaymentPaid(result?.status ?? "") || isPaymentPaid(invoice?.status ?? "");
  const cardAvailable =
    gateway.data?.gateway === "mercadopago" && !!gateway.data.publicKey?.trim();
  const checkoutUrl = getCheckoutUrl(result?.paymentUrl);
  const isPixResult = method === "Pix" && !!result;
  const { refetch: refetchInvoice } = invoices;

  const completePayment = useCallback(() => {
    if (successNotified.current) return;
    successNotified.current = true;
    toast({ title: "Pagamento aprovado!", description: "Sua cobrança foi paga." });
    router.replace("/(user)/paymentPlans");
  }, [toast]);

  useEffect(() => {
    if (paid) completePayment();
  }, [paid, completePayment]);

  useFocusEffect(useCallback(() => {
    if (!isPixResult || paid || ["failed", "rejected", "recusado", "cancelled", "canceled"].includes(result.status.trim().toLowerCase())) return;
    let active = true;
    let checking = false;
    const interval = setInterval(() => {
      if (checking) return;
      checking = true;
      void refetchInvoice().then((refreshed) => {
        if (active && isPaymentPaid(refreshed.data?.items.find((item) => item.id === id)?.status ?? "")) {
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
  }, [isPixResult, paid, result?.status, id, refetchInvoice, completePayment]));

  const showError = (description: string) => {
    setError(description);
    toast({ title: description, variant: "destructive" });
  };

  useEffect(() => {
    if (aluno?.cpf) setDocument((current) => current || aluno.cpf!);
  }, [aluno?.cpf]);

  const customer = () => {
    const parsed = paymentCustomerSchema.safeParse({
      customerName: name,
      customerEmail: email.trim(),
      customerDocument: document,
    });
    if (!parsed.success) {
      showError(parsed.error.issues[0].message);
      return null;
    }
    setError("");
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
    setError("");
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
    if (method === "CreditCard") {
      if (cardAvailable) setCardCustomer(payer);
    } else {
      void submit({ ...payer, paymentMethod: "Pix" });
    }
  };

  const onCardToken = async (fields: CardPaymentFields) => {
    if (cardCustomer)
      await submit({ ...cardCustomer, paymentMethod: "Cartao", ...fields });
  };

  const refreshPayment = async () => {
    const refreshed = await invoices.refetch();
    if (refreshed.error)
      showError(
        normalizeApiError(
          refreshed.error,
          "Não foi possível consultar o pagamento.",
        ).description,
      );
    else if (
      isPaymentPaid(
        refreshed.data?.items.find((item) => item.id === id)?.status ?? "",
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
    <SafeAreaView style={styles.container}>
      <ClientHeader />
      <KeyboardAvoider>
        <ScrollView
          contentContainerStyle={[styles.content, isPixResult && styles.pixContent]}
          keyboardShouldPersistTaps="handled"
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
          <Text style={styles.title}>Pagamento</Text>
          {!id ? (
            <Text style={styles.error}>Cobrança inválida.</Text>
          ) : invoices.isLoading || gateway.isLoading ? (
            <ActivityIndicator size="large" color={COLORS.mainOrange} />
          ) : paid ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Pagamento aprovado!</Text>
              <Text style={styles.muted}>Sua cobrança foi paga.</Text>
              {button("Ver pendências", () =>
                router.navigate("/(user)/pendingPayments"),
              )}
            </View>
          ) : result ? (
            <View style={isPixResult ? styles.pixResult : styles.card}>
              <Text style={[styles.heading, isPixResult && styles.pixText]}>
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
                  <Text style={[styles.muted, styles.pixText]}>
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
              {isPixResult && <Text style={[styles.muted, styles.pixText]}>O status é verificado automaticamente a cada 7 segundos.</Text>}
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
                invoices.isFetching,
              )}
              {!isPixResult && ["rejected", "failed", "recusado"].includes(
                result.status.toLowerCase(),
              ) &&
                button("Tentar novamente", () => {
                  setResult(null);
                  setError("");
                })}
              {!isPixResult && button("Ver pendências", () =>
                router.navigate("/(user)/pendingPayments"),
              )}
            </View>
          ) : invoices.error || gateway.error ? (
            <View style={styles.card}>
              <Text style={styles.error}>
                {
                  normalizeApiError(
                    invoices.error || gateway.error,
                    "Não foi possível carregar o pagamento.",
                  ).description
                }
              </Text>
              {button(
                "Tentar novamente",
                () => {
                  void invoices.refetch();
                  void gateway.refetch();
                },
                invoices.isFetching || gateway.isFetching,
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
            <>
              <View style={styles.card}>
                <Text style={styles.heading}>
                  {invoice.description || "Cobrança"}
                </Text>
                <Text style={styles.amount}>
                  {invoice.amount.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>
                <Text style={styles.muted}>
                  Vencimento: {formatPaymentDate(invoice.dueDate)}
                </Text>
              </View>
              <View style={styles.card}>
                {!cardCustomer ? (
                  <>
                    <Text style={styles.heading}>Dados do pagador</Text>
                    <Text style={styles.label}>Nome completo</Text>
                    <TextInput
                      accessibilityLabel="Nome completo"
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      editable={!submitting}
                      autoComplete="name"
                    />
                    <Text style={styles.label}>E-mail</Text>
                    <TextInput
                      accessibilityLabel="E-mail"
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      editable={!submitting}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                    <Text style={styles.label}>CPF ou CNPJ</Text>
                    <TextInput
                      accessibilityLabel="CPF ou CNPJ"
                      style={styles.input}
                      value={document}
                      onChangeText={setDocument}
                      editable={!submitting}
                      keyboardType="number-pad"
                      maxLength={18}
                    />
                    <Text style={styles.heading}>Forma de pagamento</Text>
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
                            setError("");
                          }}
                        >
                          <Text style={styles.label}>
                            {option === "Pix" ? "Pix" : "Cartão de crédito"}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {button(
                      submitting
                        ? "Processando..."
                        : method === "Pix"
                          ? "Gerar Pix"
                          : "Continuar com cartão",
                      continuePayment,
                      submitting || isPaying || !gateway.data,
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.heading}>Cartão de crédito</Text>
                    <Text style={styles.muted}>
                      {cardCustomer.customerName} · {cardCustomer.customerEmail}
                    </Text>
                    <MercadoPagoCard
                      publicKey={gateway.data!.publicKey!}
                      amount={invoice.amount}
                      customerName={cardCustomer.customerName}
                      customerDocument={cardCustomer.customerDocument}
                      onToken={onCardToken}
                    />
                    {button(
                      "Alterar dados ou forma de pagamento",
                      () => setCardCustomer(null),
                      submitting,
                    )}
                  </>
                )}
              </View>
            </>
          )}
          {!!error && (
            <Text accessibilityRole="alert" style={styles.error}>
              {error}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  pixContent: { flexGrow: 1 },
  back: { flexDirection: "row", gap: 8, alignItems: "center" },
  backText: { color: COLORS.mainOrange, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
  heading: { fontSize: 17, fontWeight: "700", color: COLORS.foreground },
  card: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.subOrange,
    borderRadius: 12,
    backgroundColor: COLORS.card,
  },
  pixResult: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 16,
    gap: 18,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  amount: { fontSize: 26, fontWeight: "bold", color: COLORS.foreground },
  muted: { fontSize: 13, lineHeight: 19, color: COLORS.mutedForeground },
  pixText: { textAlign: "center" },
  label: { color: COLORS.foreground, fontSize: 14, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 6,
    color: COLORS.foreground,
    backgroundColor: COLORS.white,
  },
  row: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  method: {
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selected: {
    borderColor: COLORS.mainOrange,
    backgroundColor: COLORS.subOrange,
  },
  button: {
    padding: 14,
    borderRadius: 6,
    backgroundColor: COLORS.mainOrange,
    alignItems: "center",
  },
  buttonText: { color: COLORS.white, fontWeight: "600" },
  disabled: { opacity: 0.4 },
  error: { color: COLORS.destructive, fontSize: 14 },
  qrCode: { width: 230, height: 230, maxWidth: "100%", alignSelf: "center" },
});
