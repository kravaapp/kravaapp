import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { usePayments } from "@/hooks/studentPayments.hooks";
import { canPayInvoice, formatPaymentDate, getPaymentType } from "@/utils/payments";
import { router } from "expo-router";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PendingPayments() {
  const [page, setPage] = useState<number>();
  const { data, payments, isLoading, isRefreshing, error, refetch } = usePayments(page);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ClientHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity accessibilityRole="button" style={styles.back} onPress={() => router.navigate("/(user)/paymentPlans")}>
          <ArrowLeft size={18} color={COLORS.mainOrange} />
          <Text style={styles.backText}>Voltar aos planos</Text>
        </TouchableOpacity>
        <Text style={styles.title}>pendências</Text>
        <Text style={styles.subtitle}>Acompanhe e resolva suas cobranças.</Text>
        {isLoading ? (
          <ActivityIndicator size="large" color={COLORS.mainOrange} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.error}>Não foi possível carregar suas pendências.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => refetch()} disabled={isRefreshing}>
              <Text style={styles.buttonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : payments.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>Tudo em dia.</Text><Text style={styles.muted}>Você não possui pendências.</Text></View>
        ) : payments.map((payment) => {
          const type = getPaymentType(payment.type);
          return (
            <View key={payment.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.type}>{type.label}</Text>
                <Text style={styles.status}>{payment.status}</Text>
              </View>
              {!!payment.description && <Text style={styles.description}>{payment.description}</Text>}
              {!!type.description && <Text style={styles.muted}>{type.description}</Text>}
              <Text style={styles.amount}>{payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
              <Text style={styles.muted}>Vencimento: {formatPaymentDate(payment.dueDate)}</Text>
              {canPayInvoice(payment.status) && (
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={`Pagar ${payment.description || type.label}`}
                  style={styles.button}
                  onPress={() => router.push({
                    pathname: "/(user)/payment",
                    params: { id: payment.id, ...(page !== undefined ? { page: String(page) } : {}) },
                  })}
                >
                  <Text style={styles.buttonText}>Pagar agora</Text>
                  <ArrowRight size={18} color={COLORS.white} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {!error && data && (data.hasPreviousPage || data.hasNextPage) && (
          <View style={styles.row}>
            <TouchableOpacity accessibilityRole="button" style={[styles.pageButton, (!data.hasPreviousPage || isRefreshing) && styles.disabled]} disabled={!data.hasPreviousPage || isRefreshing} onPress={() => setPage(data.page - 1)}>
              <Text style={styles.pageButtonText}>Anterior</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.pageButton, (!data.hasNextPage || isRefreshing) && styles.disabled]} disabled={!data.hasNextPage || isRefreshing} onPress={() => setPage(data.page + 1)}>
              <Text style={styles.pageButtonText}>Próxima</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  card: { padding: 20, gap: 12, borderWidth: 1, borderColor: "#E8E9EC", borderRadius: 18, backgroundColor: COLORS.white },
  empty: { padding: 24, gap: 6, borderWidth: 1, borderColor: "#E8E9EC", borderRadius: 18 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: COLORS.foreground },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  type: { fontSize: 17, fontWeight: "800", color: COLORS.foreground, flexShrink: 1 },
  status: { color: COLORS.foreground, backgroundColor: "#FFF2E9", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, fontSize: 11, fontWeight: "700", overflow: "hidden" },
  description: { fontSize: 14, color: COLORS.foreground },
  muted: { fontSize: 13, lineHeight: 19, color: COLORS.mutedForeground },
  amount: { fontSize: 28, fontWeight: "800", letterSpacing: -0.8, color: COLORS.foreground, marginTop: 4 },
  error: { color: COLORS.destructive },
  button: { minHeight: 48, paddingHorizontal: 16, borderRadius: 12, backgroundColor: COLORS.mainOrange, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 4 },
  buttonText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  pageButton: { minHeight: 44, minWidth: 106, borderWidth: 1, borderColor: "#E8E9EC", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  pageButtonText: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.4 },
});
