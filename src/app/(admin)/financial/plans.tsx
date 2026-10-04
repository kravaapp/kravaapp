import { COLORS } from "@/components/ClientHeader";
import KeyboardAvoider from "@/components/KeyboardAvoider";
import ScreenScrollView from "@/components/ScreenScrollView";
import { useToast } from "@/components/Toast";
import {
  ActionButton,
  AdminCard,
  AdminScreen,
  AdminSkeleton,
  AdminPageHeader,
  Pill,
} from "@/components/admin/AdminUi";
import { useCategories } from "@/hooks/categories.hooks";
import { useAdminPlanActions, useAdminPlans } from "@/hooks/plans.hooks";
import { useAdminSettings, useSettingsActions } from "@/hooks/settings.hooks";
import { normalizeApiError } from "@/routes/apiError";
import { AdminPlanType } from "@/types/plans.types";
import { AvulsoConfigType } from "@/types/settings.types";
import {
  maskCurrency,
  maskInteger,
  parseCurrency,
  toCurrencyInput,
} from "@/utils/masks";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Pencil,
  Plus,
  X,
} from "lucide-react-native";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );

export default function AdminPlans() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPlanType | null | undefined>(
    undefined,
  );
  const { data, plans, isLoading, error } = useAdminPlans(page);
  const { avulsoConfigs, loading: loadingSettings } = useAdminSettings();
  const { updateAvulso, isUpdatingAvulso } = useSettingsActions();
  const [editingAvulso, setEditingAvulso] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  const saveAvulso = async (item: AvulsoConfigType, active = item.active) => {
    const price = parseCurrency(prices[item.modalidadeId] ?? "");
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: "Informe um preço válido.", variant: "destructive" });
      return;
    }
    try {
      await updateAvulso({
        modalidadeId: item.modalidadeId,
        config: { price, active },
      });
      setEditingAvulso(null);
      toast({ title: "Aula avulsa atualizada com sucesso!" });
    } catch {
      toast({
        title: "Não foi possível atualizar a aula avulsa.",
        variant: "destructive",
      });
    }
  };

  return (
    <View style={styles.safe}>
      <ScreenScrollView>
        <AdminScreen>
          <View style={styles.pageHeader}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Voltar"
            >
              <ArrowLeft size={20} color={COLORS.foreground} />
            </TouchableOpacity>
            <View style={styles.pageTitle}>
              <AdminPageHeader
                title="planos e valores"
                subtitle="Assinaturas de alunos e aulas avulsas"
              />
            </View>
            <ActionButton
              label="Novo"
              icon={<Plus size={15} color="#fff" />}
              onPress={() => setEditing(null)}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <AdminSkeleton key={index} height={135} radius={8} />
            ))
          ) : plans.length === 0 ? (
            <AdminCard>
              <Text style={styles.empty}>Nenhum plano cadastrado.</Text>
            </AdminCard>
          ) : (
            plans.map((plan) => (
              <AdminCard key={plan.id} style={styles.planCard}>
                <View style={styles.header}>
                  <View style={styles.grow}>
                    <Text style={styles.planName}>
                      {plan.name || "Plano sem nome"}
                    </Text>
                    <Text style={styles.price}>
                      {currency(plan.price ?? 0)}
                    </Text>
                  </View>
                  <Pill
                    label={plan.isActive ? "Ativo" : "Inativo"}
                    tone={plan.isActive ? "success" : "neutral"}
                  />
                  <TouchableOpacity
                    onPress={() => setEditing(plan)}
                    style={styles.iconButton}
                  >
                    <Pencil size={17} color={COLORS.foreground} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.description}>
                  {plan.description || "Sem descrição"}
                </Text>
                <View style={styles.meta}>
                  <Text style={styles.metaText}>{plan.durationDays} dias</Text>
                  <Text style={styles.metaText}>
                    {plan.maxClassesPerWeek
                      ? `${plan.maxClassesPerWeek}/semana`
                      : "Sem limite semanal"}
                  </Text>
                  <Text style={styles.metaText}>
                    {plan.maxClassesPerDay
                      ? `${plan.maxClassesPerDay}/dia`
                      : "Sem limite diário"}
                  </Text>
                  <Text style={styles.metaText}>
                    {plan.allowsAllModalidades
                      ? "Todas as modalidades"
                      : `${plan.modalidadeIds?.length ?? 0} modalidade(s)`}
                  </Text>
                </View>
              </AdminCard>
            ))
          )}
          {(data?.totalPages ?? 1) > 1 && (
            <View style={styles.pagination}>
              <NavButton
                disabled={page <= 1}
                onPress={() => setPage((value) => value - 1)}
                left
              />
              <Text style={styles.metaText}>
                Página {page} de {data?.totalPages}
              </Text>
              <NavButton
                disabled={page >= (data?.totalPages ?? 1)}
                onPress={() => setPage((value) => value + 1)}
              />
            </View>
          )}

          {/* Seção Integrada de Aulas Avulsas */}
          <AdminCard style={styles.avulsoCard}>
            <View style={styles.avulsoHeader}>
              <View style={styles.avulsoIconWrap}>
                <DollarSign size={20} color={COLORS.mainOrange} />
              </View>
              <View style={styles.grow}>
                <Text style={styles.avulsoTitle}>Aulas Avulsas</Text>
                <Text style={styles.avulsoSubtitle}>
                  Disponibilidade e preço cobrado por aula individual
                </Text>
              </View>
            </View>

            {loadingSettings.avulso ? (
              <AdminSkeleton width="100%" height={100} radius={8} />
            ) : (avulsoConfigs ?? []).length === 0 ? (
              <Text style={styles.empty}>
                Nenhuma modalidade configurada para aula avulsa.
              </Text>
            ) : (
              (avulsoConfigs ?? []).map((item) => (
                <View key={item.modalidadeId} style={styles.avulsoRow}>
                  <View style={styles.grow}>
                    <Text style={styles.avulsoItemName}>
                      {item.modalidadeName || "Modalidade"}
                    </Text>
                    {editingAvulso === item.modalidadeId ? (
                      <View style={styles.avulsoInputRow}>
                        <Text style={styles.currencyPrefix}>R$</Text>
                        <TextInput
                          value={prices[item.modalidadeId] ?? ""}
                          onChangeText={(value) =>
                            setPrices((current) => ({
                              ...current,
                              [item.modalidadeId]: maskCurrency(value),
                            }))
                          }
                          keyboardType="number-pad"
                          style={styles.avulsoInput}
                        />
                        <Text style={styles.metaText}>por aula</Text>
                      </View>
                    ) : (
                      <Text style={styles.metaText}>
                        R${" "}
                        {item.price.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        por aula
                      </Text>
                    )}
                  </View>
                  {editingAvulso === item.modalidadeId ? (
                    <ActionButton
                      label={isUpdatingAvulso ? "..." : "Salvar"}
                      icon={<Check size={14} color="#fff" />}
                      onPress={() => saveAvulso(item)}
                    />
                  ) : (
                    <TouchableOpacity
                      onPress={() => setEditingAvulso(item.modalidadeId)}
                      style={styles.iconButton}
                    >
                      <Pencil size={17} color={COLORS.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <Switch
                    value={item.active}
                    onValueChange={(active) => saveAvulso(item, active)}
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
              ))
            )}
          </AdminCard>
        </AdminScreen>
      </ScreenScrollView>
      <PlanModal
        plan={editing}
        visible={editing !== undefined}
        onClose={() => setEditing(undefined)}
      />
    </View>
  );
}

function PlanModal({
  plan,
  visible,
  onClose,
}: {
  plan: AdminPlanType | null | undefined;
  visible: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { categories, isLoading: loadingCategories } = useCategories();
  const { createPlan, updatePlan, updateModalities, isSaving } =
    useAdminPlanActions();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [maxClassesPerWeek, setMaxClassesPerWeek] = useState("0");
  const [maxClassesPerDay, setMaxClassesPerDay] = useState("0");
  const [allowsAll, setAllowsAll] = useState(true);
  const [active, setActive] = useState(true);
  const [modalidadeIds, setModalidadeIds] = useState<string[]>([]);
  const [modalitiesDirty, setModalitiesDirty] = useState(false);
  const [validationMessage, setValidationMessage] = useState("");

  useEffect(() => {
    if (!visible) return;
    setName(plan?.name ?? "");
    setDescription(plan?.description ?? "");
    setPrice(toCurrencyInput(plan?.price));
    setDurationDays(String(plan?.durationDays ?? ""));
    setMaxClassesPerWeek(String(plan?.maxClassesPerWeek ?? 0));
    setMaxClassesPerDay(String(plan?.maxClassesPerDay ?? 0));
    setAllowsAll(plan?.allowsAllModalidades ?? true);
    setActive(plan?.isActive ?? true);
    setModalidadeIds(plan?.modalidadeIds ?? []);
    setModalitiesDirty(false);
    setValidationMessage("");
  }, [plan, visible]);

  useEffect(() => {
    setValidationMessage("");
  }, [
    name,
    price,
    durationDays,
    maxClassesPerWeek,
    maxClassesPerDay,
    allowsAll,
    modalidadeIds,
  ]);

  const save = async () => {
    if (isSaving) return;
    const parsedPrice = parseCurrency(price);
    const duration = Number(durationDays);
    const weeklyLimit = Number(maxClassesPerWeek);
    const dailyLimit = Number(maxClassesPerDay);
    const missingFields = [
      !name.trim() && "Nome",
      (!Number.isFinite(parsedPrice) || parsedPrice < 0) && "Preço base",
      (!Number.isInteger(duration) || duration <= 0) && "Duração em dias",
      (!Number.isInteger(weeklyLimit) || weeklyLimit < 0) && "Limite semanal",
      (!Number.isInteger(dailyLimit) || dailyLimit < 0) && "Limite diário",
      !allowsAll && modalidadeIds.length === 0 && "Modalidades permitidas",
    ].filter(Boolean) as string[];
    if (missingFields.length) {
      setValidationMessage(`Preencha: ${missingFields.join(", ")}.`);
      return;
    }
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      durationDays: duration,
      maxClassesPerWeek: weeklyLimit,
      maxClassesPerDay: dailyLimit,
      allowsAllModalidades: allowsAll,
    };
    try {
      if (plan) {
        await updatePlan({
          id: plan.id,
          plan: { ...payload, isActive: active },
        });
        if (modalitiesDirty)
          await updateModalities({
            id: plan.id,
            modalidadeIds: allowsAll ? [] : modalidadeIds,
          });
      } else {
        const id = await createPlan(payload);
        if (!allowsAll) await updateModalities({ id, modalidadeIds });
      }
      onClose();
      toast({ title: plan ? "Plano atualizado!" : "Plano criado!" });
    } catch (requestError) {
      onClose();
      toast({
        title: normalizeApiError(
          requestError,
          "Não foi possível salvar o plano.",
        ).description,
        variant: "destructive",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoider>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {plan ? "Editar plano" : "Novo plano"}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X size={20} color={COLORS.foreground} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.form}
              keyboardShouldPersistTaps="handled"
            >
              {validationMessage ? (
                <Text style={styles.validationError}>{validationMessage}</Text>
              ) : null}
              <Field
                label="Nome *"
                value={name}
                onChange={setName}
                placeholder="Plano trimestral"
              />
              <Field
                label="Descrição"
                value={description}
                onChange={setDescription}
                placeholder="Descreva os benefícios"
                multiline
              />
              <View style={styles.fieldsRow}>
                <View style={styles.grow}>
                  <Field
                    label="Preço base *"
                    value={price}
                    onChange={setPrice}
                    placeholder="150,00"
                    numeric
                    mask={maskCurrency}
                  />
                </View>
                <View style={styles.grow}>
                  <Field
                    label="Duração em dias *"
                    value={durationDays}
                    onChange={setDurationDays}
                    placeholder="30"
                    numeric
                    mask={maskInteger}
                  />
                </View>
              </View>
              <View style={styles.fieldsRow}>
                <View style={styles.grow}>
                  <Field
                    label="Checkin's Máximo por semana *"
                    value={maxClassesPerWeek}
                    onChange={setMaxClassesPerWeek}
                    placeholder="0"
                    numeric
                    mask={maskInteger}
                  />
                </View>
                <View style={styles.grow}>
                  <Field
                    label="Checkin's Máximo por dia *"
                    value={maxClassesPerDay}
                    onChange={setMaxClassesPerDay}
                    placeholder="0"
                    numeric
                    mask={maskInteger}
                  />
                </View>
              </View>
              <Text style={styles.muted}>
                Use 0 para não limitar o número de aulas.
              </Text>
              <View style={styles.switchRow}>
                <View style={styles.grow}>
                  <Text style={styles.label}>Todas as modalidades</Text>
                  <Text style={styles.muted}>
                    O plano dá acesso a qualquer modalidade.
                  </Text>
                </View>
                <Switch
                  value={allowsAll}
                  onValueChange={(value) => {
                    setAllowsAll(value);
                    setModalitiesDirty(true);
                  }}
                  trackColor={{ true: COLORS.mainOrange }}
                />
              </View>
              {!allowsAll && (
                <View style={styles.field}>
                  <Text style={styles.label}>Modalidades permitidas *</Text>
                  {loadingCategories ? (
                    <AdminSkeleton height={60} />
                  ) : (
                    <View style={styles.choices}>
                      {(categories ?? [])
                        .filter((item) => item.isActive)
                        .map((item) => {
                          const selected = modalidadeIds.includes(item.id);
                          return (
                            <TouchableOpacity
                              key={item.id}
                              onPress={() => {
                                setModalidadeIds(
                                  selected
                                    ? modalidadeIds.filter((id) => id !== item.id)
                                    : [...modalidadeIds, item.id],
                                );
                                setModalitiesDirty(true);
                              }}
                              style={[
                                styles.choice,
                                selected && styles.choiceActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  selected && styles.choiceTextActive,
                                ]}
                              >
                                {item.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  )}
                </View>
              )}
              {plan && (
                <View style={styles.switchRow}>
                  <View style={styles.grow}>
                    <Text style={styles.label}>Plano ativo</Text>
                    <Text style={styles.muted}>
                      Planos inativos não ficam disponíveis para novas adesões.
                    </Text>
                  </View>
                  <Switch
                    value={active}
                    onValueChange={setActive}
                    trackColor={{ true: COLORS.mainOrange }}
                  />
                </View>
              )}
              <ActionButton
                label={isSaving ? "Salvando..." : "Salvar plano"}
                icon={<Check size={15} color="#fff" />}
                onPress={save}
              />
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoider>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  numeric,
  mask,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  mask?: (value: string) => string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={mask ? (next) => onChange(mask(next)) : onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.mutedForeground}
        multiline={multiline}
        keyboardType={numeric ? "number-pad" : "default"}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}
function NavButton({
  disabled,
  onPress,
  left,
}: {
  disabled: boolean;
  onPress: () => void;
  left?: boolean;
}) {
  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[styles.iconButton, disabled && styles.disabled]}
    >
      {left ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  pageHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  pageTitle: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 240,
    minWidth: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  grow: { flex: 1, minWidth: 0 },
  muted: { color: COLORS.mutedForeground, fontSize: 11, lineHeight: 16 },
  error: {
    color: COLORS.destructive,
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
  },
  validationError: {
    color: COLORS.destructive,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: "600",
  },
  empty: { color: COLORS.mutedForeground, textAlign: "center", padding: 20 },
  planCard: { borderRadius: 18 },
  planName: { color: COLORS.foreground, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  price: {
    color: COLORS.mainOrange,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 3,
  },
  description: { color: COLORS.foreground, fontSize: 12, lineHeight: 18 },
  meta: { flexDirection: "row", flexWrap: "wrap", columnGap: 12, rowGap: 6 },
  metaText: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    fontWeight: "600",
    flexShrink: 1,
    maxWidth: "100%",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  disabled: { opacity: 0.35 },
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    maxHeight: "92%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  form: { padding: 16, paddingBottom: 36, gap: 14 },
  field: { gap: 6 },
  label: { color: COLORS.foreground, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 11,
    color: COLORS.foreground,
  },
  textarea: { minHeight: 82, paddingTop: 10, textAlignVertical: "top" },
  fieldsRow: { flexDirection: "row", gap: 10 },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "#F7F8FA",
    borderRadius: 8,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  choice: {
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
  },
  choiceActive: {
    backgroundColor: COLORS.mainOrange,
    borderColor: COLORS.mainOrange,
  },
  choiceText: { color: COLORS.foreground, fontSize: 11, fontWeight: "600" },
  choiceTextActive: { color: "#fff" },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  avulsoCard: {
    marginTop: 8,
    gap: 12,
  },
  avulsoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  avulsoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avulsoTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.foreground,
    letterSpacing: -0.3,
  },
  avulsoSubtitle: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  avulsoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#ECEDEF",
  },
  avulsoItemName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.foreground,
  },
  avulsoInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  avulsoInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 80,
    color: COLORS.foreground,
    fontSize: 13,
  },
});

/* A listagem nova pode omitir modalidadeIds; restrições existentes só são enviadas após alteração explícita. */
