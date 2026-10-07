import { COLORS } from "@/components/ClientHeader";
import { Payment } from "@/types/payments.types";
import { formatPaymentDate, getPaymentStatusConfig, getPaymentType } from "@/utils/payments";
import { router } from "expo-router";
import { AlertCircle, ArrowRight, Check, Clock, X } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PaymentInvoiceCardProps {
  payment: Payment;
  onPay?: (payment: Payment) => void;
}

export default function PaymentInvoiceCard({ payment, onPay }: PaymentInvoiceCardProps) {
  const type = getPaymentType(payment.type);
  const statusConfig = getPaymentStatusConfig(payment.status);

  const handlePay = () => {
    if (onPay) {
      onPay(payment);
    } else {
      router.push({
        pathname: "/(user)/payment",
        params: { id: payment.id },
      });
    }
  };

  const title = payment.description || type.label;
  const subtitle = statusConfig.isPaid
    ? `Pago em ${formatPaymentDate(payment.dueDate)}`
    : `Vencimento: ${formatPaymentDate(payment.dueDate)}`;

  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, { backgroundColor: statusConfig.iconBg }]}>
          {statusConfig.isPaid ? (
            <Check size={20} color={statusConfig.iconColor} strokeWidth={2.5} />
          ) : statusConfig.label === "Atrasado" ? (
            <AlertCircle size={20} color={statusConfig.iconColor} strokeWidth={2.2} />
          ) : statusConfig.label === "Cancelado" ? (
            <X size={20} color={statusConfig.iconColor} strokeWidth={2.2} />
          ) : (
            <Clock size={20} color={statusConfig.iconColor} strokeWidth={2.2} />
          )}
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.amount}>
          {payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Text>

        {statusConfig.isPaid ? (
          <View style={[styles.badge, { backgroundColor: statusConfig.badgeBg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.badgeText }]}>PAGO</Text>
          </View>
        ) : statusConfig.canPay ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Pagar ${title}`}
            style={styles.payButton}
            onPress={handlePay}
          >
            <Text style={styles.payButtonText}>Pagar agora</Text>
            <ArrowRight size={13} color={COLORS.white} strokeWidth={2.5} />
          </TouchableOpacity>
        ) : (
          <View style={[styles.badge, { backgroundColor: statusConfig.badgeBg }]}>
            <Text style={[styles.badgeText, { color: statusConfig.badgeText }]}>
              {statusConfig.label.toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EBECEF",
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginTop: 2,
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 5,
  },
  amount: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  payButton: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  payButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "700",
  },
});
