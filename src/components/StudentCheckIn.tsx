import { CheckCircle2, Clock3 } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import { useStudentCheckIn } from "@/hooks/schedule.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { clockTime, formatWait, useNow } from "@/utils/bookingCountdown";

type CheckInProps = {
  bookingId: string;
  bookingStatus?: string | null;
  /** Quando o CT exige check-in: abertura e prazo (sem check-in até o prazo, a vaga vai para a fila). */
  opensAt?: string | null;
  deadlineAt?: string | null;
  /** "card": card laranja da próxima aula; "compact": botão da agenda. */
  variant: "card" | "compact";
};

/**
 * Check-in do aluno antes da aula. Antes de abrir mostra a contagem ("Check-in abre às 11:00 · em 1h32min");
 * aberto, o botão; feito, a confirmação. Sem `opensAt` (CT não exige check-in), não mostra nada.
 */
export function StudentCheckIn({ bookingId, bookingStatus, opensAt, deadlineAt, variant }: CheckInProps) {
  const { toast } = useToast();
  const { checkIn, isCheckingIn } = useStudentCheckIn();
  const opensAtMs = opensAt ? Date.parse(opensAt) : null;
  const done = bookingStatus === "CheckedIn";
  const waitingOpening = !done && opensAtMs !== null && opensAtMs > Date.now();
  // Segundos só nos últimos 10 minutos antes de abrir; antes disso basta atualizar a cada 30s.
  const fast = opensAtMs !== null && opensAtMs - Date.now() < 10 * 60_000;
  const now = useNow(fast ? 1000 : 30_000, waitingOpening);
  if (!opensAtMs || (bookingStatus !== "Confirmado" && !done)) return null;

  const waitMs = opensAtMs - now;
  const compact = variant === "compact";

  if (done) {
    return compact ? null : (
      <View style={styles.row}>
        <CheckCircle2 size={15} color="#FFFFFF" />
        <Text style={styles.cardText}>Check-in feito ✓</Text>
      </View>
    );
  }

  if (waitMs > 0) {
    return compact ? null : (
      <View style={styles.row} accessible accessibilityLabel={`Check-in abre às ${clockTime(opensAt!)}, em ${formatWait(waitMs)}`}>
        <Clock3 size={15} color="#FFFFFF" />
        <Text style={styles.cardText}>
          Check-in abre às {clockTime(opensAt!)} · em {formatWait(waitMs, waitMs < 10 * 60_000)}
        </Text>
      </View>
    );
  }

  const handlePress = async () => {
    try {
      await checkIn(bookingId);
      toast({ title: "Check-in feito!", description: "Sua vaga está garantida. Bom treino!" });
    } catch (error) {
      toast({
        title: "Não foi possível fazer o check-in",
        description: normalizeApiError(error, "Tente novamente.").description,
        variant: "destructive",
      });
    }
  };

  return (
    <View style={compact ? undefined : styles.cardBlock}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Fazer check-in"
        disabled={isCheckingIn}
        onPress={handlePress}
        style={[compact ? styles.compactButton : styles.cardButton, isCheckingIn && styles.busy]}
      >
        {isCheckingIn ? (
          <ActivityIndicator size="small" color={compact ? "#FFFFFF" : COLORS.mainOrange} />
        ) : (
          <Text style={compact ? styles.compactButtonText : styles.cardButtonText}>
            {compact ? "Check-in" : "Fazer check-in"}
          </Text>
        )}
      </TouchableOpacity>
      {!compact && deadlineAt ? (
        <Text style={styles.cardHint}>Até {clockTime(deadlineAt)}. Sem o check-in, a vaga vai para a fila.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  cardText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  cardBlock: { marginTop: 14, gap: 6 },
  cardButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cardButtonText: { color: COLORS.mainOrange, fontSize: 15, fontWeight: "800" },
  cardHint: { color: "#FFFFFFCC", fontSize: 12 },
  compactButton: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 84,
    alignItems: "center",
  },
  compactButtonText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  busy: { opacity: 0.6 },
});
