import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader, { COLORS } from "@/components/ClientHeader";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { useToast } from "@/components/Toast";
import { useSubscribeContract } from "@/hooks/contracts.hooks";
import { useCurrentPlan, usePlans } from "@/hooks/plans.hooks";
import { usePayments } from "@/hooks/studentPayments.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { router } from "expo-router";
import { CurrentPlanType, PlanType } from "@/types/plans.types";
import { ArrowRight, Check, ChevronDown, CreditCard, Star } from "lucide-react-native";
import { useRef, useState } from "react";

const ProgressBar = ({ progress }: { progress: number }) => (
  <View style={styles.progressBarBackground}>
    <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
  </View>
);

const formatDate = (iso: string) => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
};

const CurrentPlanSkeleton = () => (
  <View style={styles.cardNavy}>
    <Text style={styles.navySubtitle}>SEU PLANO ATUAL</Text>
    <View style={[styles.skeletonBlock, { width: "60%", height: 22 }]} />
    <View
      style={[styles.skeletonBlock, { width: "35%", height: 16, marginTop: 8 }]}
    />
    <View
      style={[styles.skeletonBlock, { width: "80%", height: 14, marginTop: 12 }]}
    />
    <View
      style={[styles.skeletonBlock, { width: "100%", height: 8, marginTop: 16 }]}
    />
    <View
      style={[styles.skeletonBlock, { width: "50%", height: 14, marginTop: 16 }]}
    />
  </View>
);

const CurrentPlanCard = ({ plan }: { plan: CurrentPlanType }) => {
  const hasLimit =
    plan.maxClassesPerMonth !== null && plan.maxClassesPerMonth > 0;
  const progress = hasLimit
    ? Math.min(
        Math.round((plan.classesUsedThisMonth / plan.maxClassesPerMonth!) * 100),
        100
      )
    : 0;

  return (
    <View style={styles.cardNavy}>
      <View style={styles.currentHeaderRow}>
        <View style={styles.currentHeaderTexts}>
          <Text style={styles.navySubtitle}>SEU PLANO ATUAL</Text>
          <Text style={styles.navyTitle}>{plan.planoName}</Text>
        </View>
        <View style={styles.currentStatus}><Text style={styles.currentStatusText}>{plan.status}</Text></View>
      </View>

      {plan.modalitiesPermitted?.length > 0 && (
        <View style={styles.modalitiesRow}>
          {plan.modalitiesPermitted.map((modalidade) => (
            <View key={modalidade} style={styles.modalityChip}>
              <Text style={styles.modalityChipText}>{modalidade}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressRow}>
          <Text style={styles.progressTextLeft}>
            {hasLimit
              ? `${plan.classesUsedThisMonth} de ${plan.maxClassesPerMonth} aulas usadas`
              : `${plan.classesUsedThisMonth} aula${
                  plan.classesUsedThisMonth === 1 ? "" : "s"
                } usada${plan.classesUsedThisMonth === 1 ? "" : "s"} este mês`}
          </Text>
          {hasLimit && (
            <Text style={styles.progressTextRight}>{progress}%</Text>
          )}
        </View>
        {hasLimit ? (
          <ProgressBar progress={progress} />
        ) : (
          <Text style={styles.unlimitedTag}>Aulas ilimitadas</Text>
        )}
      </View>

      <View style={styles.currentInfoGrid}>
        <View style={styles.currentInfoItem}>
          <Text style={styles.currentInfoLabel}>Início</Text>
          <Text style={styles.currentInfoValue}>
            {formatDate(plan.startDate)}
          </Text>
        </View>
        <View style={styles.currentInfoItem}>
          <Text style={styles.currentInfoLabel}>Término</Text>
          <Text style={styles.currentInfoValue}>{formatDate(plan.endDate)}</Text>
        </View>
        {hasLimit && plan.classesRemainingThisMonth !== null && (
          <View style={styles.currentInfoItem}>
            <Text style={styles.currentInfoLabel}>Aulas restantes</Text>
            <Text style={styles.currentInfoValue}>
              {plan.classesRemainingThisMonth}
            </Text>
          </View>
        )}
        <View style={styles.currentInfoItem}>
          <Text style={styles.currentInfoLabel}>Renovação automática</Text>
          <Text style={styles.currentInfoValue}>
            {plan.autoRenew ? "Ativada" : "Desativada"}
          </Text>
        </View>
      </View>
    </View>
  );
};

const PlanCard = ({
  plan,
  onSubscribe,
  disabled,
  isSubscribing,
}: {
  plan: PlanType;
  onSubscribe: (plan: PlanType) => void;
  disabled: boolean;
  isSubscribing: boolean;
}) => {
  const isPopular = plan.name.toLowerCase().includes("trimestral");

  const isCurrent = false;

  return (
    <View style={[styles.card, isCurrent && styles.cardActive]}>
      {isPopular && (
        <View style={styles.badgeTopRight}>
          <View style={styles.badgeWarning}>
            <Star size={12} color={COLORS.mainOrange} style={{ marginRight: 4 }} />
            <Text style={styles.badgeWarningText}>Mais popular</Text>
          </View>
        </View>
      )}

      {isCurrent && (
        <View style={styles.badgeTopRight}>
          <View style={styles.badgePrimary}>
            <Text style={styles.badgePrimaryText}>Plano atual</Text>
          </View>
        </View>
      )}

      <Text style={[styles.planName, isPopular && styles.planNameWithBadge]}>{plan.name}</Text>
      <View style={styles.rowAlignBottom}>
        <Text style={styles.planPrice}>{plan.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</Text>
        <Text style={styles.planPriceMonth}>/mês</Text>
      </View>
      <Text style={styles.planFreq}>
        {plan.maxClassesPerWeek
          ? `${plan.maxClassesPerWeek}x na semana`
          : "Ilimitado"}{" "}
        • {plan.durationDays} dias
      </Text>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <Check size={16} color={COLORS.mainOrange} style={styles.featureIcon} />
          <Text style={styles.featureText}>
            {plan.maxClassesPerWeek
              ? `${plan.maxClassesPerWeek} sessões por semana`
              : "Sessões ilimitadas"}
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Check size={16} color={COLORS.mainOrange} style={styles.featureIcon} />
          <Text style={styles.featureText}>
            Duração de {plan.durationDays} dias
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Check size={16} color={COLORS.mainOrange} style={styles.featureIcon} />
          <Text style={styles.featureText}>{plan.description}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {isCurrent ? (
          <TouchableOpacity style={styles.btnOutlineDisabled} disabled>
            <Text style={styles.btnOutlineDisabledText}>Plano atual</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled, busy: isSubscribing }}
            style={[styles.btnSolid, disabled && { opacity: 0.6 }]}
            disabled={disabled}
            onPress={() => onSubscribe(plan)}
          >
            {isSubscribing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.btnSolidText}>Assinar Plano</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function PaymentPlans() {
  const { toast } = useToast();
  const { subscribe, isLoading: isSubscribing } = useSubscribeContract();
  const subscriptionInFlight = useRef(false);
  const [subscribingPlanId, setSubscribingPlanId] = useState<string | null>(null);
  const { payments, error: paymentsError, refetch: refetchPayments } = usePayments();
  const { plans, isLoading, error } = usePlans();
  const refresh = useScreenRefresh([["plans", "list"], ["plans", "current"]], { refetch: [refetchPayments] });
  const {
    currentPlan,
    isLoading: isLoadingCurrent,
    error: currentError,
    refetch: refetchCurrent,
  } = useCurrentPlan();
  const [partnerModal, setPartnerModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSubscribe = async (plan: PlanType) => {
    if (subscriptionInFlight.current) return;
    subscriptionInFlight.current = true;
    setSubscribingPlanId(plan.id);
    try {
      const invoice = await subscribe({
        planoId: plan.id,
        cancelExistingActive: true,
      });
      toast({
        title: "Cobrança pendente",
        description: "Conclua o pagamento para efetivar a assinatura.",
      });
      router.push({
        pathname: "/(user)/payment",
        params: { id: invoice.cobrancaId },
      });
    } catch (requestError) {
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível assinar o plano. Tente novamente.",
        ).description,
        variant: "destructive",
      });
    } finally {
      subscriptionInFlight.current = false;
      setSubscribingPlanId(null);
    }
  };

  const handleSendRequest = () => {
    setPartnerModal(false);
    setSelectedPartner(null);
    setPartnerId("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ClientHeader />

      <RefreshableScrollView {...refresh}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollPadding}
      >
        <Text style={styles.screenTitle}>planos</Text>
        <Text style={styles.screenSubtitle}>Escolha o ritmo que combina com você.</Text>
        {payments.length > 0 && (
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.pendingLink}
            onPress={() => router.push("/(user)/pendingPayments")}
          >
            <Text style={styles.pendingLinkText}>Minhas pendências</Text>
            <ArrowRight size={18} color={COLORS.mainOrange} />
          </TouchableOpacity>
        )}
        {paymentsError && (
          <View style={{ marginBottom: 20, gap: 8 }}>
            <Text style={{ color: COLORS.destructive }}>
              Não foi possível consultar suas pendências.
            </Text>
            <TouchableOpacity style={styles.btnSolid} onPress={() => refetchPayments()}>
              <Text style={styles.btnSolidText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
        {isLoadingCurrent ? (
          <CurrentPlanSkeleton />
        ) : currentError ? (
          <View style={styles.cardNavy}>
            <Text style={styles.navySubtitle}>SEU PLANO ATUAL</Text>
            <Text style={styles.currentErrorText}>
              Não foi possível carregar seu plano atual.
            </Text>
            <TouchableOpacity
              style={styles.btnOutlineLight}
              onPress={() => refetchCurrent()}
            >
              <Text style={styles.btnOutlineLightText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : currentPlan ? (
          <CurrentPlanCard plan={currentPlan} />
        ) : (
          <View style={styles.cardNavy}>
            <Text style={styles.navySubtitle}>SEU PLANO ATUAL</Text>
            <Text style={styles.navyDesc}>
              Você ainda não possui um plano ativo.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>planos disponíveis</Text>
        <Text style={styles.subscriptionNotice}>
          O novo plano começará assim que o pagamento for confirmado.
        </Text>
        <View style={styles.plansContainer}>
          {isLoading ? (
            <ActivityIndicator
              size="large"
              color={COLORS.mainOrange}
              style={{ marginVertical: 40 }}
            />
          ) : error ? (
            <View style={{ alignItems: "center", marginVertical: 20 }}>
              <Text style={{ color: "#ef4444" }}>Erro ao carregar planos</Text>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>{error}</Text>
            </View>
          ) : (
            plans?.filter((p) => p.isActive).map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onSubscribe={handleSubscribe}
                disabled={isSubscribing || subscribingPlanId !== null}
                isSubscribing={subscribingPlanId === p.id}
              />
            ))
          )}
        </View>

        <View style={styles.cardLightBlue}>
          <View style={styles.rowAlign}>
            <CreditCard size={16} color={COLORS.mainOrange} />
            <Text style={styles.lightBlueTitle}>
              Utilizo Gympass ou Totalpass
            </Text>
          </View>
          <Text style={styles.lightBlueDesc}>
            Se você utiliza Gympass ou Totalpass, solicite a vinculação. Após
            aprovação pelo local, sua conta será convertida automaticamente.
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.btnSolid}
            onPress={() => setPartnerModal(true)}
          >
            <Text style={styles.btnSolidText}>Solicitar vinculação</Text>
          </TouchableOpacity>
        </View>
      </RefreshableScrollView>

      <Modal visible={partnerModal} transparent animationType="fade" onRequestClose={() => setPartnerModal(false)}>
        <KeyboardAvoider style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Solicitar vinculação com parceiro
            </Text>

            <View style={styles.modalBody}>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.selectTrigger}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <Text
                  style={
                    selectedPartner
                      ? styles.selectText
                      : styles.selectPlaceholder
                  }
                >
                  {selectedPartner === "gympass"
                    ? "Gympass (Wellhub)"
                    : selectedPartner === "totalpass"
                      ? "Totalpass"
                      : "Selecione o parceiro"}
                </Text>
                <ChevronDown size={16} color={COLORS.mutedForeground} />
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={styles.selectDropdown}>
                  <TouchableOpacity
                    style={styles.selectOption}
                    onPress={() => {
                      setSelectedPartner("gympass");
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.selectOptionText}>
                      Gympass (Wellhub)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.selectOption}
                    onPress={() => {
                      setSelectedPartner("totalpass");
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.selectOptionText}>Totalpass</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                style={styles.input}
                placeholder="Seu ID no parceiro (opcional)"
                placeholderTextColor={COLORS.mutedForeground}
                value={partnerId}
                onChangeText={setPartnerId}
              />

              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  A solicitação será analisada pelo FitPira Arena em até 24h
                </Text>
              </View>
            </View>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.btnSolid}
              onPress={handleSendRequest}
            >
              <Text style={styles.btnSolidText}>Enviar solicitação</Text>
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.modalCancel} onPress={() => setPartnerModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  subscriptionNotice: { fontSize: 13, lineHeight: 19, color: COLORS.mutedForeground, marginBottom: 14 },
  screenTitle: { fontSize: 30, fontWeight: "800", letterSpacing: -1.2, color: COLORS.foreground, textTransform: "lowercase" },
  screenSubtitle: { fontSize: 14, lineHeight: 21, color: COLORS.mutedForeground, marginBottom: 22, marginTop: 4 },
  sectionTitle: { color: COLORS.foreground, fontSize: 19, fontWeight: "800", letterSpacing: -0.5, marginBottom: 14 },
  pendingLink: { minHeight: 52, borderWidth: 1, borderColor: "#F2C5A9", backgroundColor: "#FFF7F2", borderRadius: 14, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  pendingLinkText: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  currentStatus: { borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)", paddingHorizontal: 10, paddingVertical: 5 },
  currentStatusText: { color: COLORS.white, fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  modalCancel: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  modalCancelText: { color: COLORS.foreground, fontSize: 14, fontWeight: "700" },
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flex: 1,
  },
  scrollPadding: {
    padding: 20,
    paddingBottom: 40,
  },
  cardNavy: {
    backgroundColor: COLORS.mainOrange,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
  },
  navySubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  navyTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginBottom: 2,
  },
  rowAlignBottom: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  navyPrice: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "bold",
  },
  navyPriceMonth: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  navyDesc: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressTextLeft: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
  },
  progressTextRight: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    borderColor: COLORS.white,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 4,
  },
  navyBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  navyNextBilling: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
  },
  skeletonBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 6,
  },
  currentHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  currentHeaderTexts: {
    flex: 1,
  },
  modalitiesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  modalityChip: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalityChipText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 11,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  unlimitedTag: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  currentInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    paddingTop: 12,
  },
  currentInfoItem: {
    width: "50%",
    marginBottom: 12,
  },
  currentInfoLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  currentInfoValue: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  currentErrorText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    marginTop: 8,
    marginBottom: 12,
  },
  btnOutlineLight: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    minHeight: 44,
    justifyContent: "center",
    borderRadius: 12,
    alignItems: "center",
  },
  btnOutlineLightText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  plansContainer: {
    gap: 12,
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8E9EC",
    position: "relative",
  },
  cardActive: {
    borderWidth: 2,
    borderColor: COLORS.mainOrange,
  },
  badgeTopRight: {
    position: "absolute",
    top: 12,
    right: 12,
  },
  badgeWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF2E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F5D9C8",
  },
  badgeWarningText: {
    color: COLORS.foreground,
    fontSize: 10,
    fontWeight: "600",
  },
  badgePrimary: {
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePrimaryText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  planName: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.foreground,
  },
  planNameWithBadge: { marginTop: 24 },
  planPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.foreground,
    marginTop: 4,
  },
  planPriceMonth: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  planFreq: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.mutedForeground,
    marginTop: 4,
  },
  featuresList: {
    marginTop: 16,
    gap: 10,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  featureIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.foreground,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 18,
  },
  btnSolid: {
    backgroundColor: COLORS.mainOrange,
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 12,
    alignItems: "center",
  },
  btnSolidText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  btnOutlineDisabled: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#f9fafb",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
    opacity: 0.7,
  },
  btnOutlineDisabledText: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    fontWeight: "500",
  },
  btnOutlineDestructive: {
    borderWidth: 1,
    borderColor: COLORS.subOrange,
    backgroundColor: "#fef2f2",
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  btnOutlineDestructiveText: {
    color: COLORS.destructive,
    fontSize: 12,
    fontWeight: "500",
  },
  cardLightBlue: {
    backgroundColor: "#FFF7F2",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#F5D9C8",
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lightBlueTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    marginLeft: 8,
  },
  lightBlueDesc: {
    fontSize: 13,
    color: COLORS.mutedForeground,
    marginBottom: 12,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: COLORS.foreground,
    marginBottom: 16,
  },
  modalBody: {
    gap: 12,
    marginBottom: 20,
  },
  selectTrigger: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  selectPlaceholder: {
    fontSize: 14,
    color: COLORS.mutedForeground,
  },
  selectDropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 6,
    backgroundColor: "#fff",
    marginTop: -8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectOptionText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 50,
    fontSize: 14,
    color: COLORS.foreground,
  },
  warningBox: {
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    padding: 10,
  },
  warningText: {
    color: "#d97706",
    fontSize: 12,
    fontWeight: "500",
  },
});
