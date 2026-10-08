import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  MessageCircle,
  PhoneCall,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  TrendingDown,
  X,
} from "lucide-react-native";
import ClientHeader, { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  AdminCard,
  AdminPageHeader,
  AdminScreen,
  AdminSkeleton,
} from "@/components/admin/AdminUi";
import { useChurnRiskActions, useStudentsAtRisk } from "@/hooks/dashboard.hooks";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { StudentAtRiskType } from "@/types/dashboard.types";

export const DEFAULT_CHURN_MESSAGE =
  "Olá, {nome}! Tudo bem? 🥊\n\nSentimos sua falta nos treinos do {ct} essa semana! Queremos muito te ver de volta aos treinos. Vamos marcar uma aula para você retomar o ritmo?";

export function formatChurnReengageMessage(
  template: string | null | undefined,
  studentName: string,
  ctName: string,
): string {
  const firstName = studentName.split(" ")[0] || "Aluno";
  const base = template && template.trim().length > 0 ? template : DEFAULT_CHURN_MESSAGE;
  return base
    .replace(/\{nome\}/gi, firstName)
    .replace(/\{aluno\}/gi, firstName)
    .replace(/\{ct\}/gi, ctName);
}

const CONTACT_OUTCOMES = [
  "Prometeu voltar essa semana",
  "Viajando / Lesão em recuperação",
  "Dificuldade de horário / rotina",
  "Dificuldade financeira",
  "Sem retorno / Não atendeu",
];

export default function AdminChurnRiskScreen() {
  const refresh = useScreenRefresh([["admin-students-at-risk"]]);
  const { toast } = useToast();
  const { studentsAtRisk, isLoading } = useStudentsAtRisk();
  const { markStudentContacted, isLoading: isSavingContact } =
    useChurnRiskActions();
  const { tenantSettings } = useAdminSettings();
  const { updateTenant, isUpdatingTenant } = useSettingsActions();

  // Estados de filtro e busca
  const [filterLevel, setFilterLevel] = useState<
    "todos" | "alto" | "medio" | "baixo"
  >("todos");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal de ajuda heurística e configuração de mensagem
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [reengageTemplate, setReengageTemplate] = useState("");

  useEffect(() => {
    if (tenantSettings) {
      setReengageTemplate(
        tenantSettings.churnReengageMessage || DEFAULT_CHURN_MESSAGE,
      );
    }
  }, [tenantSettings]);

  const handleSaveReengageTemplate = async () => {
    if (!tenantSettings) return;
    try {
      await updateTenant({
        name: tenantSettings.name,
        slug: tenantSettings.slug,
        logoUrl: tenantSettings.logoUrl,
        address: tenantSettings.address,
        contact: tenantSettings.contact,
        gympassRepasse: tenantSettings.gympassRepasse,
        totalpassRepasse: tenantSettings.totalpassRepasse,
        waitlistTimeoutMinutes: tenantSettings.waitlistTimeoutMinutes,
        cancellationTimeoutMinutes: tenantSettings.cancellationTimeoutMinutes,
        noShowPenaltyFee: tenantSettings.noShowPenaltyFee,
        partnerCheckInLimit: tenantSettings.partnerCheckInLimit,
        churnReengageMessage: reengageTemplate.trim(),
      });
      setShowSettingsModal(false);
      toast({ title: "Mensagem de reengajamento atualizada!" });
    } catch {
      toast({
        title: "Não foi possível salvar a mensagem.",
        variant: "destructive",
      });
    }
  };

  // Modal de registro de contato
  const [selectedStudentForContact, setSelectedStudentForContact] =
    useState<StudentAtRiskType | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState(CONTACT_OUTCOMES[0]);
  const [customNote, setCustomNote] = useState("");

  // Alunos e métricas derivadas
  const totalCount = studentsAtRisk.length;
  const highRiskCount = studentsAtRisk.filter(
    (s: StudentAtRiskType) => s.score >= 70 || s.level?.toLowerCase() === "high",
  ).length;
  const medRiskCount = studentsAtRisk.filter(
    (s: StudentAtRiskType) =>
      (s.score >= 30 && s.score < 70) || s.level?.toLowerCase() === "medium",
  ).length;
  const lowRiskCount = studentsAtRisk.filter(
    (s: StudentAtRiskType) => s.score < 30 || s.level?.toLowerCase() === "low",
  ).length;

  const filteredStudents = useMemo(() => {
    return studentsAtRisk
      .filter((student: StudentAtRiskType) => {
        const score = student.score;
        const level = student.level?.toLowerCase();

        if (filterLevel === "alto") {
          return score >= 70 || level === "high";
        }
        if (filterLevel === "medio") {
          return (score >= 30 && score < 70) || level === "medium";
        }
        if (filterLevel === "baixo") {
          return score < 30 || level === "low";
        }
        return true;
      })
      .filter((student: StudentAtRiskType) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
          student.alunoName?.toLowerCase().includes(query) ||
          student.reasons?.some((r: string) => r.toLowerCase().includes(query))
        );
      });
  }, [studentsAtRisk, filterLevel, searchQuery]);

  // Ação de Reengajamento (WhatsApp)
  const handleReengage = async (student: StudentAtRiskType) => {
    const studentName = student.alunoName || "Aluno";
    const ctName = tenantSettings?.name || "nosso CT";

    const message = formatChurnReengageMessage(
      tenantSettings?.churnReengageMessage,
      studentName,
      ctName,
    );
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;
    const webWhatsappUrl = `https://wa.me/?text=${encodedMessage}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Linking.openURL(webWhatsappUrl);
      }

      toast({ title: "Mensagem de reengajamento aberta!" });

      // Sugere registrar o contato após reengajar
      setTimeout(() => {
        setSelectedStudentForContact(student);
      }, 800);
    } catch {
      Alert.alert(
        "Reengajar Aluno",
        `Mensagem sugerida para ${studentName}:\n\n"${message}"`,
        [
          { text: "Copiar e fechar", style: "default" },
          {
            text: "Registrar contato",
            onPress: () => setSelectedStudentForContact(student),
          },
        ],
      );
    }
  };

  // Salvar registro de contato administrativo
  const handleSaveContact = async () => {
    if (!selectedStudentForContact) return;

    const resultText = customNote.trim()
      ? `${selectedOutcome} - ${customNote.trim()}`
      : selectedOutcome;

    try {
      await markStudentContacted({
        alunoId: selectedStudentForContact.alunoId,
        result: resultText,
      });

      toast({ title: "Contato registrado com sucesso!" });
      setSelectedStudentForContact(null);
      setCustomNote("");
      setSelectedOutcome(CONTACT_OUTCOMES[0]);
    } catch (err: any) {
      toast({
        title: err?.message || "Não foi possível registrar o contato.",
        variant: "destructive",
      });
    }
  };

  const getScoreColorConfig = (score: number) => {
    if (score >= 70) {
      return {
        text: "#DC2626",
        bg: "#FEF2F2",
        border: "#FECACA",
        badge: "ALTO RISCO",
      };
    }
    if (score >= 30) {
      return {
        text: "#D97706",
        bg: "#FFFBEB",
        border: "#FDE68A",
        badge: "MÉDIO RISCO",
      };
    }
    return {
      text: "#16A34A",
      bg: "#F0FDF4",
      border: "#BBF7D0",
      badge: "BAIXO RISCO",
    };
  };

  return (
    <View style={styles.safe}>
      <ClientHeader />
      <RefreshableScrollView {...refresh}>
        <AdminScreen>
          {/* Header da Tela com Botão Voltar e Botão de Ajuda */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <ArrowLeft size={20} color={COLORS.foreground} />
            </TouchableOpacity>

            <View style={styles.headerTextWrap}>
              <AdminPageHeader
                title="churn risk"
                subtitle="Motor de prevenção de evasão e retenção"
              />
            </View>

            <View style={styles.headerActionBtns}>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(true)}
                style={styles.helpBtn}
                accessibilityRole="button"
                accessibilityLabel="Configurar mensagem de reengajamento"
              >
                <SettingsIcon size={18} color={COLORS.mainOrange} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowFormulaModal(true)}
                style={styles.helpBtn}
                accessibilityRole="button"
                accessibilityLabel="Como o score é calculado"
              >
                <HelpCircle size={18} color={COLORS.mainOrange} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Cards de Resumo e Filtro Rápido */}
          <View style={styles.kpiContainer}>
            <TouchableOpacity
              onPress={() => setFilterLevel("todos")}
              style={[
                styles.kpiCard,
                filterLevel === "todos" && styles.kpiCardActive,
              ]}
            >
              <Text style={styles.kpiLabel}>Total</Text>
              <Text style={styles.kpiValue}>{totalCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterLevel("alto")}
              style={[
                styles.kpiCard,
                filterLevel === "alto" && styles.kpiCardActive,
                styles.kpiCardRed,
              ]}
            >
              <Text style={[styles.kpiLabel, { color: "#DC2626" }]}>Alto</Text>
              <Text style={[styles.kpiValue, { color: "#DC2626" }]}>
                {highRiskCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterLevel("medio")}
              style={[
                styles.kpiCard,
                filterLevel === "medio" && styles.kpiCardActive,
                styles.kpiCardAmber,
              ]}
            >
              <Text style={[styles.kpiLabel, { color: "#D97706" }]}>Médio</Text>
              <Text style={[styles.kpiValue, { color: "#D97706" }]}>
                {medRiskCount}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterLevel("baixo")}
              style={[
                styles.kpiCard,
                filterLevel === "baixo" && styles.kpiCardActive,
                styles.kpiCardGreen,
              ]}
            >
              <Text style={[styles.kpiLabel, { color: "#16A34A" }]}>Baixo</Text>
              <Text style={[styles.kpiValue, { color: "#16A34A" }]}>
                {lowRiskCount}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Campo de Busca Rápida */}
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.grayLabels} />
            <TextInput
              placeholder="Buscar aluno por nome ou motivo..."
              placeholderTextColor={COLORS.grayLabels}
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color={COLORS.grayLabels} />
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de Alunos em Risco */}
          {isLoading ? (
            <View style={{ gap: 12, marginTop: 12 }}>
              <AdminSkeleton height={140} />
              <AdminSkeleton height={140} />
              <AdminSkeleton height={140} />
            </View>
          ) : filteredStudents.length === 0 ? (
            <AdminCard style={styles.emptyCard}>
              <CheckCircle2 size={44} color="#16A34A" />
              <Text style={styles.emptyTitle}>Nenhum aluno neste filtro</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? "Nenhum aluno encontrado para a busca realizada."
                  : "Não há alunos detectados em risco nesta faixa de pontuação."}
              </Text>
            </AdminCard>
          ) : (
            <View style={styles.listContainer}>
              {filteredStudents.map((student: StudentAtRiskType) => {
                const config = getScoreColorConfig(student.score);

                return (
                  <View key={student.alunoId} style={styles.studentCard}>
                    {/* Linha superior: Score + Nome + Badge */}
                    <View style={styles.cardHeader}>
                      <View
                        style={[
                          styles.scoreCircle,
                          {
                            backgroundColor: config.bg,
                            borderColor: config.border,
                          },
                        ]}
                      >
                        <Text
                          style={[styles.scoreNumber, { color: config.text }]}
                        >
                          {student.score}
                        </Text>
                      </View>

                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName} numberOfLines={1}>
                          {student.alunoName || "Aluno sem nome"}
                        </Text>
                        <View style={styles.badgeRow}>
                          <View
                            style={[
                              styles.levelBadge,
                              {
                                backgroundColor: config.bg,
                                borderColor: config.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.levelBadgeText,
                                { color: config.text },
                              ]}
                            >
                              {config.badge}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Tags com motivos e gatilhos de evasão */}
                    {student.reasons && student.reasons.length > 0 && (
                      <View style={styles.reasonsWrap}>
                        {student.reasons.map((reason: string, idx: number) => (
                          <View key={idx} style={styles.reasonTag}>
                            <TrendingDown size={12} color="#DC2626" />
                            <Text style={styles.reasonTagText}>{reason}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Histórico do último contato registrado */}
                    {student.contactedAtUtc && (
                      <View style={styles.contactHistoryBox}>
                        <Clock size={13} color={COLORS.grayLabels} />
                        <Text style={styles.contactHistoryText}>
                          Último contato:{" "}
                          <Text style={{ fontWeight: "600" }}>
                            {student.contactResult || "Registrado"}
                          </Text>
                        </Text>
                      </View>
                    )}

                    {/* Botões de Ação Imediata (Reengajar + Registrar Contato) */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.reengageBtn}
                        onPress={() => handleReengage(student)}
                        accessibilityRole="button"
                        accessibilityLabel="Reengajar pelo WhatsApp"
                      >
                        <MessageCircle size={16} color="#FFFFFF" />
                        <Text style={styles.reengageBtnText}>Reengajar</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.contactBtn}
                        onPress={() => setSelectedStudentForContact(student)}
                        accessibilityRole="button"
                        accessibilityLabel="Registrar contato"
                      >
                        <PhoneCall size={15} color={COLORS.foreground} />
                        <Text style={styles.contactBtnText}>
                          Registrar contato
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </AdminScreen>
      </RefreshableScrollView>

      {/* Modal Explicativo da Fórmula Heurística */}
      <Modal
        visible={showFormulaModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFormulaModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.formulaModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Como o score é calculado</Text>
                <Text style={styles.modalSubtitle}>
                  Soma de 4 dimensões comportamentais (máx. 100 pts)
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFormulaModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <View style={styles.dimensionCard}>
                <View style={styles.dimensionHeader}>
                  <Text style={styles.dimensionTitle}>Inatividade</Text>
                  <Text style={styles.dimensionPoints}>máx 40 pts</Text>
                </View>
                <Text style={styles.dimensionDesc}>
                  Calcula os dias consecutivos sem check-in realizado na
                  academia.
                </Text>
              </View>

              <View style={styles.dimensionCard}>
                <View style={styles.dimensionHeader}>
                  <Text style={styles.dimensionTitle}>Queda de frequência</Text>
                  <Text style={styles.dimensionPoints}>máx 25 pts</Text>
                </View>
                <Text style={styles.dimensionDesc}>
                  Compara a presença das últimas semanas com a média histórica
                  do próprio aluno.
                </Text>
              </View>

              <View style={styles.dimensionCard}>
                <View style={styles.dimensionHeader}>
                  <Text style={styles.dimensionTitle}>Contrato</Text>
                  <Text style={styles.dimensionPoints}>máx 20 pts</Text>
                </View>
                <Text style={styles.dimensionDesc}>
                  Detecta planos prestes a vencer sem renovação automática
                  ativada.
                </Text>
              </View>

              <View style={styles.dimensionCard}>
                <View style={styles.dimensionHeader}>
                  <Text style={styles.dimensionTitle}>Faltas</Text>
                  <Text style={styles.dimensionPoints}>máx 15 pts</Text>
                </View>
                <Text style={styles.dimensionDesc}>
                  Pontua ausências consecutivas em aulas reservadas (no-shows).
                </Text>
              </View>

              <View style={styles.scaleGuide}>
                <Text style={styles.scaleGuideTitle}>Faixas de Ação:</Text>
                <Text style={styles.scaleGuideItem}>
                  🔴 <Text style={{ fontWeight: "700" }}>≥ 70 (Alto Risco):</Text>{" "}
                  Ação imediata necessária para evitar cancelamento.
                </Text>
                <Text style={styles.scaleGuideItem}>
                  🟡 <Text style={{ fontWeight: "700" }}>30 a 69 (Médio Risco):</Text>{" "}
                  Alerta inicial para contato preventivo.
                </Text>
                <Text style={styles.scaleGuideItem}>
                  🟢 <Text style={{ fontWeight: "700" }}>{"<"} 30 (Baixo Risco):</Text>{" "}
                  Aluno engajado, manter acompanhamento padrão.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={() => setShowFormulaModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Entendi"
            >
              <Text style={styles.modalPrimaryBtnText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Registro de Contato */}
      <Modal
        visible={!!selectedStudentForContact}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStudentForContact(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.contactModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Registrar Contato</Text>
                <Text style={styles.modalSubtitle}>
                  {selectedStudentForContact?.alunoName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedStudentForContact(null)}
                style={styles.modalCloseBtn}
              >
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>

            <Text style={styles.contactSectionLabel}>
              Qual foi o desfecho do contato?
            </Text>

            <View style={styles.outcomeOptions}>
              {CONTACT_OUTCOMES.map((outcome) => {
                const isSelected = selectedOutcome === outcome;
                return (
                  <TouchableOpacity
                    key={outcome}
                    onPress={() => setSelectedOutcome(outcome)}
                    style={[
                      styles.outcomeOptionItem,
                      isSelected && styles.outcomeOptionItemSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.radioCircle,
                        isSelected && styles.radioCircleSelected,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text
                      style={[
                        styles.outcomeOptionText,
                        isSelected && {
                          color: COLORS.mainOrange,
                          fontWeight: "700",
                        },
                      ]}
                    >
                      {outcome}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.contactSectionLabel}>
              Observação adicional (opcional):
            </Text>
            <TextInput
              placeholder="Ex: Pediu para ligar na sexta-feira..."
              placeholderTextColor={COLORS.grayLabels}
              value={customNote}
              onChangeText={setCustomNote}
              style={styles.noteInput}
              multiline
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedStudentForContact(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveContact}
                disabled={isSavingContact}
              >
                {isSavingContact ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>Salvar Registro</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Configuração da Mensagem de Reengajamento */}
      <Modal
        visible={showSettingsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.contactModalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Mensagem de Reengajamento</Text>
                <Text style={styles.modalSubtitle}>
                  Personalize o texto do WhatsApp para recuperar alunos
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowSettingsModal(false)}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <X size={18} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>

            <View style={styles.hintBox}>
              <Text style={styles.hintTitle}>Variáveis suportadas:</Text>
              <Text style={styles.hintText}>
                {"• {nome}: Primeiro nome do aluno\n• {ct}: Nome do Centro de Treinamento"}
              </Text>
            </View>

            <TextInput
              value={reengageTemplate}
              onChangeText={setReengageTemplate}
              placeholder="Digite o modelo da mensagem..."
              placeholderTextColor={COLORS.grayLabels}
              style={[styles.noteInput, { minHeight: 110, textAlignVertical: "top" }]}
              multiline
            />

            <Text style={[styles.contactSectionLabel, { marginTop: 4, marginBottom: 6 }]}>
              Pré-visualização do texto:
            </Text>
            <View style={styles.previewBubble}>
              <Text style={styles.previewText}>
                {formatChurnReengageMessage(
                  reengageTemplate,
                  "Gabriel",
                  tenantSettings?.name || "Z10",
                )}
              </Text>
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalResetBtn}
                onPress={() => setReengageTemplate(DEFAULT_CHURN_MESSAGE)}
                accessibilityRole="button"
                accessibilityLabel="Restaurar padrão"
              >
                <RotateCcw size={14} color={COLORS.foreground} />
                <Text style={styles.modalResetBtnText}>Restaurar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveReengageTemplate}
                disabled={isUpdatingTenant}
                accessibilityRole="button"
                accessibilityLabel="Salvar modelo"
              >
                {isUpdatingTenant ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>Salvar Modelo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
  },
  helpBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  kpiCardActive: {
    borderColor: COLORS.mainOrange,
    backgroundColor: "#FFF7ED",
  },
  kpiCardRed: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  kpiCardAmber: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  kpiCardGreen: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.grayLabels,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.foreground,
    marginTop: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.grayLabels,
    textAlign: "center",
  },
  listContainer: {
    gap: 12,
  },
  studentCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scoreCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: "900",
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  levelBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  reasonsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  reasonTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reasonTagText: {
    fontSize: 11,
    color: COLORS.foreground,
    fontWeight: "500",
  },
  contactHistoryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
  },
  contactHistoryText: {
    fontSize: 11,
    color: COLORS.grayLabels,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  reengageBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reengageBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  contactBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    padding: 20,
  },
  formulaModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.foreground,
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.grayLabels,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  dimensionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  dimensionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  dimensionPoints: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.mainOrange,
  },
  dimensionDesc: {
    fontSize: 12,
    color: COLORS.grayLabels,
    lineHeight: 16,
  },
  scaleGuide: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FFEDD5",
    gap: 4,
  },
  scaleGuideTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.mainOrange,
    marginBottom: 2,
  },
  scaleGuideItem: {
    fontSize: 11,
    color: COLORS.foreground,
    lineHeight: 16,
  },
  modalPrimaryBtn: {
    backgroundColor: COLORS.mainOrange,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  contactModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
  },
  contactSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
    marginTop: 10,
    marginBottom: 8,
  },
  outcomeOptions: {
    gap: 6,
    marginBottom: 12,
  },
  outcomeOptionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  outcomeOptionItemSelected: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COLORS.grayLabels,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleSelected: {
    borderColor: COLORS.mainOrange,
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.mainOrange,
  },
  outcomeOptionText: {
    fontSize: 13,
    color: COLORS.foreground,
  },
  noteInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    color: COLORS.foreground,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.mainOrange,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hintBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  hintTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.mutedForeground,
    lineHeight: 18,
  },
  previewBubble: {
    backgroundColor: "#DCF8C6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#C6E8B0",
  },
  previewText: {
    fontSize: 13,
    color: "#0F5132",
    lineHeight: 19,
  },
  modalResetBtn: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
  },
  modalResetBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.foreground,
  },
});
