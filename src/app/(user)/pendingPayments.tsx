import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { usePayments } from "@/hooks/studentPayments.hooks";
import { canPayInvoice, formatPaymentDate, getPaymentType } from "@/utils/payments";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
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
        <Text style={styles.title}>Minhas Pendências</Text>
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
          <Text style={styles.muted}>Você não possui pendências.</Text>
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
                  <Text style={styles.buttonText}>Pagar</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
        {!error && data && (data.hasPreviousPage || data.hasNextPage) && (
          <View style={styles.row}>
            <TouchableOpacity accessibilityRole="button" style={[styles.button, (!data.hasPreviousPage || isRefreshing) && styles.disabled]} disabled={!data.hasPreviousPage || isRefreshing} onPress={() => setPage(data.page - 1)}>
              <Text style={styles.buttonText}>Anterior</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={[styles.button, (!data.hasNextPage || isRefreshing) && styles.disabled]} disabled={!data.hasNextPage || isRefreshing} onPress={() => setPage(data.page + 1)}>
              <Text style={styles.buttonText}>Próxima</Text>
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
  back: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  backText: { color: COLORS.mainOrange, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
  card: { padding: 16, gap: 12, borderWidth: 1, borderColor: COLORS.subOrange, borderRadius: 12, backgroundColor: COLORS.card },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  type: { fontSize: 16, fontWeight: "700", color: COLORS.foreground },
  status: { color: COLORS.foreground, backgroundColor: COLORS.subOrange, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, fontSize: 12 },
  description: { fontSize: 14, color: COLORS.foreground },
  muted: { fontSize: 13, lineHeight: 19, color: COLORS.mutedForeground },
  amount: { fontSize: 24, fontWeight: "bold", color: COLORS.foreground },
  error: { color: COLORS.destructive },
  button: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 6, backgroundColor: COLORS.mainOrange, alignItems: "center" },
  buttonText: { color: COLORS.white, fontWeight: "600" },
  disabled: { opacity: 0.4 },
});
