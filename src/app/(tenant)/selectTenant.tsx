import {
  ActionButton,
  AdminCard,
  AdminSkeleton,
  Pill,
  initials,
} from "@/components/admin/AdminUi";
import { COLORS } from "@/components/ClientHeader";
import { useToast } from "@/components/Toast";
import {
  useAuth,
  useCatalog,
  useCatalogActions,
  useCatalogTenant,
  usePendingInvitations,
  useSelectTenant,
} from "@/hooks/auth.hooks";
import { CatalogTenantType } from "@/types/auth.types";
import { Redirect } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Search,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const roleLabel = (role: string) =>
  role === "Admin" ? "Administrador" : role === "Aluno" ? "Aluno" : "Professor";
const RoleIcon = ({ role }: { role: string }) =>
  role === "Admin" ? (
    <LayoutGrid color="#fff" size={21} />
  ) : role === "Aluno" ? (
    <GraduationCap color="#fff" size={21} />
  ) : (
    <Users color="#fff" size={21} />
  );
const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
type TenantTab = "linked" | "invitations" | "catalog";

export default function SelectTenant() {
  const { toast } = useToast();
  const { selectTenantState, signOut, signIn, user } = useAuth();
  const {
    selectTenant,
    isLoading: selecting,
    error: selectError,
  } = useSelectTenant();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TenantTab>("linked");
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(
    null,
  );
  const {
    tenants,
    isLoading: catalogLoading,
    error: catalogError,
  } = useCatalog(search);
  const token =
    user?.accessToken ??
    selectTenantState?.currentToken?.accessToken ??
    selectTenantState?.preAuthToken ??
    null;
  const roles = [
    user?.role,
    selectTenantState?.currentToken?.role,
    ...(selectTenantState?.availableTenants.map((tenant) => tenant.role) ?? []),
  ];
  const canViewInvitations = !roles.some((role) =>
    ["Admin", "Professor", "Instrutor"].includes(role ?? ""),
  );
  const {
    invitations,
    isLoading: invitationsLoading,
    error: invitationsError,
  } = usePendingInvitations(canViewInvitations ? token : null);
  const { acceptInvitation, isAccepting } = useCatalogActions(token ?? "");

  if (!selectTenantState) return <Redirect href="/signIn" />;

  const linkedIds = new Set(
    selectTenantState.availableTenants.map((item) => item.tenantId),
  );
  const visibleCatalog = tenants.filter((item) => !linkedIds.has(item.id));
  const enterTenant = (tenantId: string) => {
    if (selectTenantState.currentToken?.tenantId === tenantId) {
      signIn(selectTenantState.currentToken);
      return;
    }
    if (!selectTenantState.preAuthToken) {
      toast({
        title: "Não foi possível acessar este vínculo. Entre novamente.",
        variant: "destructive",
      });
      return;
    }
    selectTenant({ preAuthToken: selectTenantState.preAuthToken, tenantId });
  };

  if (selectedCatalogId) {
    return (
      <CatalogDetails
        id={selectedCatalogId}
        accessToken={token}
        onClose={() => setSelectedCatalogId(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <View>
          <Text style={styles.brand}>KRAVA</Text>
          <Text style={styles.heading}>Escolha seu CT</Text>
        </View>
        <TouchableOpacity
          onPress={signOut}
          style={styles.logout}
          accessibilityLabel="Sair"
        >
          <LogOut size={18} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.tabs}>
        <Tab
          label="Meus CTs"
          active={activeTab === "linked"}
          onPress={() => setActiveTab("linked")}
        />
        {canViewInvitations && (
          <Tab
            label="Convites"
            active={activeTab === "invitations"}
            onPress={() => setActiveTab("invitations")}
          />
        )}
        <Tab
          label="Explorar"
          active={activeTab === "catalog"}
          onPress={() => setActiveTab("catalog")}
        />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "linked" && (
          <Section
            title="Seus vínculos"
            subtitle="Entre em um centro de treinamento que já faz parte."
          >
            {selectTenantState.availableTenants.length === 0 ? (
              <Text style={styles.emptyDark}>
                Você ainda não possui vínculos ativos.
              </Text>
            ) : (
              selectTenantState.availableTenants.map((tenant) => (
                <TouchableOpacity
                  key={tenant.tenantId}
                  disabled={selecting || !tenant.isActive}
                  onPress={() => enterTenant(tenant.tenantId)}
                  activeOpacity={0.75}
                >
                  <AdminCard
                    style={[
                      styles.rowCard,
                      !tenant.isActive || selecting ? styles.disabled : {},
                    ]}
                  >
                    <View style={styles.roleIcon}>
                      <RoleIcon role={tenant.role} />
                    </View>
                    <View style={styles.grow}>
                      <Text style={styles.cardTitle}>{tenant.tenantName}</Text>
                      <Text style={styles.muted}>{roleLabel(tenant.role)}</Text>
                    </View>
                    <Pill
                      label={tenant.isActive ? "Ativo" : "Inativo"}
                      tone={tenant.isActive ? "success" : "neutral"}
                    />
                    <ChevronRight size={18} color={COLORS.mutedForeground} />
                  </AdminCard>
                </TouchableOpacity>
              ))
            )}
            {selectError ? (
              <Text style={styles.error}>{selectError}</Text>
            ) : null}
          </Section>
        )}

        {canViewInvitations && activeTab === "invitations" && (
          <Section
            title="Convites pendentes"
            subtitle="Convites enviados para o e-mail da sua conta."
          >
            {invitationsLoading ? (
              <AdminSkeleton height={88} radius={8} />
            ) : invitationsError ? (
              <Text style={styles.error}>
                Não foi possível carregar seus convites.
              </Text>
            ) : invitations.length === 0 ? (
              <Text style={styles.emptyDark}>Nenhum convite pendente.</Text>
            ) : (
              invitations.map((invitation) => (
                <AdminCard key={invitation.id} style={styles.inviteCard}>
                  <View style={styles.grow}>
                    <Text style={styles.cardTitle}>{invitation.ctName}</Text>
                    <Text style={styles.muted}>
                      Convite para entrar como {roleLabel(invitation.role)}
                    </Text>
                    <Text style={styles.date}>
                      {new Date(invitation.createdAtUtc).toLocaleDateString(
                        "pt-BR",
                      )}
                    </Text>
                  </View>
                  <ActionButton
                    label={isAccepting ? "Aceitando..." : "Aceitar"}
                    icon={<Check size={14} color="#fff" />}
                    onPress={async () => {
                      if (isAccepting) return;
                      try {
                        await acceptInvitation({
                          id: invitation.id,
                          ctId: invitation.ctId,
                          ctName: invitation.ctName,
                          role: invitation.role,
                        });
                        toast({
                          title: "Convite aceito! Você já pode entrar no CT.",
                        });
                      } catch {
                        toast({
                          title: "Não foi possível aceitar o convite.",
                          variant: "destructive",
                        });
                      }
                    }}
                  />
                </AdminCard>
              ))
            )}
          </Section>
        )}

        {activeTab === "catalog" && (
          <Section
            title="Explorar CTs"
            subtitle="Conheça centros públicos e solicite sua entrada."
          >
            <View style={styles.searchBox}>
              <Search size={17} color={COLORS.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar centro de treinamento..."
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.searchInput}
              />
            </View>
            {catalogLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <AdminSkeleton key={index} height={105} radius={8} />
              ))
            ) : catalogError ? (
              <Text style={styles.error}>
                Não foi possível carregar o catálogo.
              </Text>
            ) : visibleCatalog.length === 0 ? (
              <Text style={styles.emptyDark}>
                Nenhum CT público encontrado.
              </Text>
            ) : (
              visibleCatalog.map((tenant) => (
                <CatalogCard
                  key={tenant.id}
                  tenant={tenant}
                  onPress={() => setSelectedCatalogId(tenant.id)}
                />
              ))
            )}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function CatalogCard({
  tenant,
  onPress,
}: {
  tenant: CatalogTenantType;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <AdminCard style={styles.catalogCard}>
        {tenant.logoUrl ? (
          <Image source={{ uri: tenant.logoUrl }} style={styles.logo} />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoText}>{initials(tenant.name)}</Text>
          </View>
        )}
        <View style={styles.grow}>
          <Text style={styles.cardTitle}>{tenant.name}</Text>
          <View style={styles.pills}>
            {(tenant.modalities ?? []).map((item, index) => (
              <Pill key={`${item}-${index}`} label={item} tone="primary" />
            ))}
          </View>
        </View>
        <ChevronRight size={18} color={COLORS.mutedForeground} />
      </AdminCard>
    </TouchableOpacity>
  );
}

function CatalogDetails({
  id,
  accessToken,
  onClose,
}: {
  id: string;
  accessToken: string | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { tenant, isLoading, error } = useCatalogTenant(id);
  const { requestToJoin, isJoining } = useCatalogActions(accessToken ?? "");
  const [planId, setPlanId] = useState<string | null>(null);
  const [requested, setRequested] = useState(false);

  const join = async () => {
    if (!accessToken || isJoining) return;
    try {
      await requestToJoin({ ctId: id, planId });
      setRequested(true);
    } catch {
      setRequested(false);
      toast({
        title: "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  };

  return (
    <SafeAreaView style={styles.detailSafe}>
      <View style={styles.detailHeader}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityLabel="Voltar para explorar CTs"
        >
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.grow}>
          <Text style={styles.detailEyebrow}>EXPLORAR CTS</Text>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {tenant?.name || "Detalhes do CT"}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.details}>
        {isLoading ? (
          <AdminSkeleton height={420} radius={8} />
        ) : error || !tenant ? (
          <View style={styles.errorState}>
            <Text style={styles.error}>Não foi possível carregar este CT.</Text>
            <ActionButton label="Voltar" onPress={onClose} />
          </View>
        ) : (
          <>
            <View style={styles.tenantHero}>
              {tenant.bannerUrl ? (
                <Image
                  source={{ uri: tenant.bannerUrl }}
                  style={styles.banner}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.bannerFallback} />
              )}
              <View style={styles.tenantIdentity}>
                {tenant.logoUrl ? (
                  <Image
                    source={{ uri: tenant.logoUrl }}
                    style={styles.detailLogo}
                  />
                ) : (
                  <View style={styles.detailLogoFallback}>
                    <Text style={styles.detailLogoText}>
                      {initials(tenant.name)}
                    </Text>
                  </View>
                )}
                <View style={styles.grow}>
                  <Text style={styles.tenantName}>{tenant.name}</Text>
                  <Text style={styles.description}>
                    {tenant.description ||
                      "Este CT ainda não adicionou uma descrição."}
                  </Text>
                </View>
              </View>
              <View style={[styles.pills, styles.heroPills]}>
                {(tenant.modalities ?? []).map((item, index) => (
                  <Pill key={`${item}-${index}`} label={item} tone="primary" />
                ))}
              </View>
            </View>

            <View style={styles.detailSectionHeader}>
              <Text style={styles.detailTitle}>Planos disponíveis</Text>
              <Text style={styles.detailSubtitle}>
                Selecione um plano para enviar junto à solicitação.
              </Text>
            </View>
            {(tenant.plans ?? []).length === 0 ? (
              <Text style={styles.empty}>Nenhum plano disponível.</Text>
            ) : (
              (tenant.plans ?? []).map((plan) => {
                const selected = planId === plan.id;
                const modalities = plan.allowsAllModalidades
                  ? "Todas as modalidades"
                  : (plan.modalidades ?? []).join(", ");
                return (
                  <TouchableOpacity
                    key={plan.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      setPlanId(selected ? null : plan.id);
                      setRequested(false);
                    }}
                    style={[styles.plan, selected && styles.planSelected]}
                  >
                    <View style={styles.planTopRow}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      {selected ? (
                        <View style={styles.selectedBadge}>
                          <Check size={12} color="#fff" />
                          <Text style={styles.selectedBadgeText}>
                            Selecionado
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.priceRow}>
                      <Text style={styles.planPrice}>
                        {currency(plan.basePrice)}
                      </Text>
                      <Text style={styles.priceSuffix}> / plano</Text>
                    </View>
                    <Text style={styles.planFrequency}>
                      {plan.durationDays} dias
                    </Text>
                    <View style={styles.featuresList}>
                      {plan.description ? (
                        <View style={styles.featureItem}>
                          <Check size={14} color={COLORS.success} />
                          <Text style={styles.featureText}>
                            {plan.description}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.featureItem}>
                        <Check size={14} color={COLORS.success} />
                        <Text style={styles.featureText}>
                          {modalities || "Modalidades informadas pelo CT"}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {(tenant.avulsos ?? []).length > 0 && (
              <View style={styles.avulsosSection}>
                <View style={styles.detailSectionHeader}>
                  <Text style={styles.detailTitle}>Aulas avulsas</Text>
                  <Text style={styles.detailSubtitle}>
                    Valores publicados por modalidade.
                  </Text>
                </View>
                {(tenant.avulsos ?? []).map((item) => (
                  <View key={item.modalidadeId} style={styles.avulso}>
                    <View>
                      <Text style={styles.cardTitle}>
                        {item.modalidadeName || "Modalidade"}
                      </Text>
                      <Text style={styles.muted}>Aula avulsa</Text>
                    </View>
                    <Text style={styles.avulsoPrice}>
                      {currency(item.price)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {requested ? (
              <View style={styles.success}>
                <Check size={18} color={COLORS.success} />
                <Text style={styles.successText}>
                  Solicitação enviada. Aguarde a aprovação do CT.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                disabled={isJoining || !accessToken}
                onPress={join}
                style={[
                  styles.joinButton,
                  (isJoining || !accessToken) && styles.disabled,
                ]}
              >
                <Text style={styles.joinButtonText}>
                  {isJoining
                    ? "Enviando..."
                    : planId
                      ? "Solicitar entrada com este plano"
                      : "Solicitar entrada"}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#18181b" },
  topbar: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brand: { color: COLORS.mainOrange, fontSize: 11, fontWeight: "900" },
  heading: { color: "#fff", fontSize: 22, fontWeight: "800", marginTop: 2 },
  logout: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  tabs: {
    height: 46,
    flexDirection: "row",
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#3f3f46",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: COLORS.mainOrange },
  tabText: { color: "#a1a1aa", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  content: { padding: 16, paddingBottom: 36 },
  section: { gap: 11 },
  sectionTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  sectionSubtitle: { color: "#a1a1aa", fontSize: 11, lineHeight: 16 },
  muted: { color: COLORS.mutedForeground, fontSize: 11, lineHeight: 16 },
  grow: { flex: 1 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 8,
  },
  roleIcon: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mainOrange,
  },
  cardTitle: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: {
    color: COLORS.destructive,
    backgroundColor: "#fee2e2",
    padding: 11,
    borderRadius: 8,
    fontSize: 12,
  },
  empty: {
    color: COLORS.mutedForeground,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 12,
  },
  emptyDark: {
    color: "#d4d4d8",
    paddingVertical: 18,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 8,
  },
  date: { color: COLORS.mutedForeground, fontSize: 10, marginTop: 3 },
  searchBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#52525b",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#27272a",
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 13 },
  catalogCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
  },
  logo: { width: 52, height: 52, borderRadius: 8 },
  logoFallback: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: COLORS.subOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: COLORS.mainOrange, fontWeight: "800" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  detailSafe: { flex: 1, backgroundColor: "#f5f5f4" },
  detailHeader: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#18181b",
    borderBottomWidth: 1,
    borderBottomColor: "#3f3f46",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  detailEyebrow: { color: COLORS.mainOrange, fontSize: 10, fontWeight: "800" },
  detailHeaderTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 1,
  },
  details: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  errorState: { gap: 12 },
  tenantHero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    overflow: "hidden",
    paddingBottom: 16,
  },
  banner: { width: "100%", aspectRatio: 16 / 6, backgroundColor: "#e5e7eb" },
  bannerFallback: {
    width: "100%",
    aspectRatio: 16 / 6,
    backgroundColor: "#27272a",
    borderBottomWidth: 3,
    borderBottomColor: COLORS.mainOrange,
  },
  tenantIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  detailLogo: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailLogoFallback: {
    width: 58,
    height: 58,
    borderRadius: 8,
    backgroundColor: COLORS.subOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLogoText: { color: COLORS.mainOrange, fontSize: 17, fontWeight: "800" },
  tenantName: { color: COLORS.foreground, fontSize: 20, fontWeight: "800" },
  description: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  heroPills: { paddingHorizontal: 16 },
  detailSectionHeader: { gap: 2, marginTop: 4 },
  detailTitle: { color: COLORS.foreground, fontSize: 17, fontWeight: "800" },
  detailSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    lineHeight: 16,
  },
  plan: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.subOrange,
  },
  planSelected: { borderWidth: 2, borderColor: COLORS.mainOrange },
  planTopRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  planName: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 4 },
  planPrice: { color: COLORS.foreground, fontSize: 24, fontWeight: "800" },
  priceSuffix: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    paddingBottom: 4,
  },
  planFrequency: {
    color: COLORS.mainOrange,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  featuresList: {
    gap: 7,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  featureItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 12,
    lineHeight: 17,
  },
  avulsosSection: { gap: 8 },
  avulso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 13,
    borderRadius: 8,
  },
  avulsoPrice: { color: COLORS.mainOrange, fontSize: 15, fontWeight: "800" },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 13,
    backgroundColor: COLORS.successSurface,
    borderRadius: 8,
  },
  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 12,
    fontWeight: "700",
  },
  joinButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mainOrange,
    borderRadius: 6,
    paddingHorizontal: 16,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
