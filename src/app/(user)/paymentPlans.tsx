import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import ClientHeader, { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentPlan, usePlans } from "@/hooks/plans.hooks";
import { CurrentPlanType, PlanType } from "@/types/plans.types";
import { Check, ChevronDown, CreditCard, Star } from "lucide-react-native";
import { useState } from "react";

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
  const isActive = plan.status?.toLowerCase() === "ativo";

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
        <StatusBadge
          status={isActive ? "confirmado" : "encerrada"}
          label={plan.status}
        />
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

const PlanCard = ({ plan }: { plan: PlanType }) => {
  const isPopular = plan.name.toLowerCase().includes("trimestral");

  const isCurrent = false;

  return (
    <View style={[styles.card, isCurrent && styles.cardActive]}>
      {isPopular && (
        <View style={styles.badgeTopRight}>
          <View style={styles.badgeWarning}>
            <Star size={12} color="#f59e0b" style={{ marginRight: 4 }} />
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

      <Text style={styles.planName}>{plan.name}</Text>
      <View style={styles.rowAlignBottom}>
        <Text style={styles.planPrice}>R${plan.price.toFixed(2)}</Text>
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
          <Check size={14} color="#22c55e" style={styles.featureIcon} />
          <Text style={styles.featureText}>
            {plan.maxClassesPerWeek
              ? `${plan.maxClassesPerWeek} sessões por semana`
              : "Sessões ilimitadas"}
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Check size={14} color="#22c55e" style={styles.featureIcon} />
          <Text style={styles.featureText}>
            Duração de {plan.durationDays} dias
          </Text>
        </View>
        <View style={styles.featureItem}>
          <Check size={14} color="#22c55e" style={styles.featureIcon} />
          <Text style={styles.featureText}>{plan.description}</Text>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        {isCurrent ? (
          <TouchableOpacity style={styles.btnOutlineDisabled} disabled>
            <Text style={styles.btnOutlineDisabledText}>Plano atual</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.btnSolid}>
            <Text style={styles.btnSolidText}>Assinar Plano</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default function PaymentPlans() {
  const { plans, isLoading, error } = usePlans();
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

  const handleSendRequest = () => {
    setPartnerModal(false);
    setSelectedPartner(null);
    setPartnerId("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ClientHeader />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollPadding}
      >
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
            plans?.map((p) => <PlanCard key={p.id} plan={p} />)
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
            style={styles.btnSolid}
            onPress={() => setPartnerModal(true)}
          >
            <Text style={styles.btnSolidText}>Solicitar vinculação</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={partnerModal} transparent animationType="fade">
        <KeyboardAvoider style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Solicitar vinculação com parceiro
            </Text>

            <View style={styles.modalBody}>
              <TouchableOpacity
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
              style={styles.btnSolid}
              onPress={handleSendRequest}
            >
              <Text style={styles.btnSolidText}>Enviar solicitação</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoider>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORS.mainOrange,
  },
  navySubtitle: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  navyTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  rowAlignBottom: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  navyPrice: {
    color: COLORS.mainOrange,
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
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.mainOrange,
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
    color: COLORS.mainOrange,
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
    paddingVertical: 8,
    borderRadius: 6,
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.subOrange,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  badgeWarningText: {
    color: "#f59e0b",
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
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: "bold",
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
    color: COLORS.mainOrange,
    marginTop: 4,
  },
  featuresList: {
    marginTop: 8,
    gap: 6,
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
    fontSize: 12,
    color: COLORS.foreground,
    flex: 1,
  },
  buttonContainer: {
    marginTop: 12,
  },
  btnSolid: {
    backgroundColor: COLORS.mainOrange,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: "center",
  },
  btnSolidText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
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
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    padding: 16,
  },
  rowAlign: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  lightBlueTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginLeft: 8,
  },
  lightBlueDesc: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    marginBottom: 12,
    lineHeight: 16,
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
    fontSize: 18,
    fontWeight: "600",
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
