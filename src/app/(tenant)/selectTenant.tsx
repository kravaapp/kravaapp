import RefreshableScrollView from "@/components/RefreshableScrollView";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import { AdminSkeleton, initials } from "@/components/admin/AdminUi";
import { COLORS } from "@/components/ClientHeader";
import KravaLogo from "@/components/KravaLogo";
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
import { publicImageUrl } from "@/utils/apiUrl";
import { normalizeApiError } from "@/routes/apiError";
import { Redirect, router } from "expo-router";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Mail,
  Search,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
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
    <LayoutGrid color={COLORS.mainOrange} size={21} />
  ) : role === "Aluno" ? (
    <GraduationCap color={COLORS.mainOrange} size={21} />
  ) : (
    <Users color={COLORS.mainOrange} size={21} />
  );
const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value,
  );
type TenantTab = "linked" | "invitations" | "catalog";

export default function SelectTenant() {
  const refresh = useScreenRefresh([["auth-catalog"], ["pending-invitations"]]);
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
    selectTenantState?.preAuthToken ??
    user?.accessToken ??
    selectTenantState?.currentToken?.accessToken ??
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
  const enterTenant = async (tenantId: string) => {
    if (
      !selectTenantState.preAuthToken &&
      selectTenantState.currentToken?.tenantId === tenantId
    ) {
      signIn(selectTenantState.currentToken);
      return;
    }

    const tokenToSend =
      selectTenantState.preAuthToken ??
      user?.accessToken ??
      selectTenantState.currentToken?.accessToken;

    if (!tokenToSend) {
      toast({
        title: "Sessão expirada",
        description: "Faça login novamente para acessar este CT.",
        variant: "destructive",
      });
      router.replace("/signIn");
      return;
    }

    try {
      await selectTenant({ preAuthToken: tokenToSend, tenantId });
    } catch (err: any) {
      const is401 = err?.status === 401 || err?.response?.status === 401;
      toast({
        title: is401 ? "Sessão expirada" : "Não foi possível entrar no CT",
        description: is401
          ? "Seu token de acesso expirou. Faça login novamente para continuar."
          : normalizeApiError(err, "Não foi possível acessar este CT.").description,
        variant: "destructive",
      });
      if (is401) {
        router.replace("/signIn");
      }
    }
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
        <KravaLogo size={36} showWordmark />
        <TouchableOpacity
          onPress={signOut}
          style={styles.logout}
          accessibilityLabel="Sair"
          accessibilityRole="button"
        >
          <LogOut size={18} color={COLORS.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.intro}>
        <Text style={styles.heading}>onde vamos treinar<Text style={styles.headingAccent}>?</Text></Text>
        <Text style={styles.introSubtitle}>Entre no seu CT ou encontre um novo lugar para começar.</Text>
      </View>
      <View style={styles.tabs}>
        <Tab
          label="meus CTs"
          active={activeTab === "linked"}
          onPress={() => setActiveTab("linked")}
        />
        {canViewInvitations && (
          <Tab
            label="convites"
            active={activeTab === "invitations"}
            onPress={() => setActiveTab("invitations")}
          />
        )}
        <Tab
          label="explorar"
          active={activeTab === "catalog"}
          onPress={() => setActiveTab("catalog")}
        />
      </View>
      <RefreshableScrollView {...refresh}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeTab === "linked" && (
          <Section
            title="seus CTs"
            subtitle="Escolha um centro para continuar."
          >
            {selectTenantState.availableTenants.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum CT por aqui.</Text>
                <Text style={styles.emptyDark}>{canViewInvitations ? "Veja seus convites ou explore os CTs públicos." : "Explore os CTs públicos para encontrar um lugar para treinar."}</Text>
              </View>
            ) : (
              selectTenantState.availableTenants.map((tenant) => (
                <TouchableOpacity
                  key={tenant.tenantId}
                  disabled={selecting || !tenant.isActive}
                  onPress={() => enterTenant(tenant.tenantId)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: selecting || !tenant.isActive, busy: selecting }}
                  accessibilityLabel={`Entrar em ${tenant.tenantName} como ${roleLabel(tenant.role)}`}
                >
                  <View
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
                    {!tenant.isActive && <Text style={styles.inactiveLabel}>inativo</Text>}
                    <ChevronRight size={18} color={COLORS.mutedForeground} />
                  </View>
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
            title="convites"
            subtitle="CTs que convidaram você para treinar."
          >
            {invitationsLoading ? (
              <AdminSkeleton height={136} radius={16} />
            ) : invitationsError ? (
              <Text style={styles.error}>
                Não foi possível carregar seus convites.
              </Text>
            ) : invitations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum convite pendente.</Text>
                <Text style={styles.emptyDark}>Quando um CT convidar você, ele aparecerá aqui.</Text>
              </View>
            ) : (
              invitations.map((invitation) => (
                <View key={invitation.id} style={styles.inviteCard}>
                  <View style={styles.inviteTopRow}>
                    <View style={styles.inviteIcon}><Mail size={19} color={COLORS.mainOrange} /></View>
                    <View style={styles.grow}>
                      <Text style={styles.cardTitle}>{invitation.ctName}</Text>
                      <Text style={styles.muted}>Convite para entrar como {roleLabel(invitation.role)}</Text>
                    </View>
                  </View>
                  <View style={styles.inviteBottomRow}>
                    <Text style={styles.date}>Enviado em {new Date(invitation.createdAtUtc).toLocaleDateString("pt-BR")}</Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{ disabled: isAccepting, busy: isAccepting }}
                      disabled={isAccepting}
                      style={[styles.acceptButton, isAccepting && styles.disabled]}
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
                    >
                      <Text style={styles.acceptButtonText}>{isAccepting ? "aceitando..." : "aceitar"}</Text>
                      <Check size={15} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </Section>
        )}

        {activeTab === "catalog" && (
          <Section
            title="explorar CTs"
            subtitle="Conheça centros públicos e peça para entrar."
          >
            <View style={styles.searchBox}>
              <Search size={17} color={COLORS.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar CT"
                placeholderTextColor={COLORS.mutedForeground}
                style={styles.searchInput}
                accessibilityLabel="Buscar CT público"
              />
            </View>
            {catalogLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <AdminSkeleton key={index} height={105} radius={16} />
              ))
            ) : catalogError ? (
              <Text style={styles.error}>
                Não foi possível carregar o catálogo.
              </Text>
            ) : visibleCatalog.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Nenhum CT encontrado.</Text>
                <Text style={styles.emptyDark}>Tente buscar por outro nome.</Text>
              </View>
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
      </RefreshableScrollView>
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
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
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
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel={`Ver ${tenant.name}`}>
      <View style={styles.catalogCard}>
        {tenant.logoUrl ? (
          <Image
            source={{ uri: publicImageUrl(tenant.logoUrl) ?? undefined }}
            style={styles.logo}
          />
        ) : (
          <View style={styles.logoFallback}>
            <Text style={styles.logoText}>{initials(tenant.name)}</Text>
          </View>
        )}
        <View style={styles.catalogInfo}>
          <Text style={styles.cardTitle}>{tenant.name}</Text>
          <View style={styles.pills}>
            {(tenant.modalities ?? []).map((item, index) => (
              <View key={`${item}-${index}`} style={styles.modalityChip}><Text style={styles.modalityChipText}>{item}</Text></View>
            ))}
          </View>
        </View>
        <ChevronRight size={18} color={COLORS.mutedForeground} />
      </View>
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
  const detailsRefresh = useScreenRefresh([["auth-catalog", "details", id]]);
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
          accessibilityRole="button"
        >
          <ArrowLeft size={20} color={COLORS.foreground} />
        </TouchableOpacity>
        <View style={styles.grow}>
          <Text style={styles.detailEyebrow}>explorar CTs</Text>
          <Text style={styles.detailHeaderTitle} numberOfLines={1}>
            {tenant?.name || "Detalhes do CT"}
          </Text>
        </View>
      </View>
      <RefreshableScrollView {...detailsRefresh} contentContainerStyle={styles.details} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <AdminSkeleton height={420} radius={18} />
        ) : error || !tenant ? (
          <View style={styles.errorState}>
            <Text style={styles.error}>Não foi possível carregar este CT.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.joinButton} onPress={onClose}><Text style={styles.joinButtonText}>voltar</Text></TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.tenantHero}>
              {tenant.bannerUrl ? (
                <Image
                  source={{ uri: publicImageUrl(tenant.bannerUrl) ?? undefined }}
                  style={styles.banner}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.bannerFallback} />
              )}
              <View style={styles.tenantIdentity}>
                {tenant.logoUrl ? (
                  <Image
                    source={{ uri: publicImageUrl(tenant.logoUrl) ?? undefined }}
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
                  <View key={`${item}-${index}`} style={styles.modalityChip}><Text style={styles.modalityChipText}>{item}</Text></View>
                ))}
              </View>
            </View>

            <View style={styles.detailSectionHeader}>
              <Text style={styles.detailTitle}>planos disponíveis</Text>
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
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
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
                          <Check size={16} color={COLORS.mainOrange} />
                          <Text style={styles.featureText}>
                            {plan.description}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.featureItem}>
                        <Check size={16} color={COLORS.mainOrange} />
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
                  <Text style={styles.detailTitle}>aulas avulsas</Text>
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
                accessibilityRole="button"
                accessibilityState={{ disabled: isJoining || !accessToken, busy: isJoining }}
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
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  topbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  intro: { paddingHorizontal: 20, paddingTop: 23, paddingBottom: 22 },
  heading: { color: COLORS.foreground, fontSize: 30, fontWeight: "800", letterSpacing: -1.2, lineHeight: 35 },
  headingAccent: { color: COLORS.mainOrange },
  introSubtitle: { color: COLORS.mutedForeground, fontSize: 14, lineHeight: 21, marginTop: 7, maxWidth: 320 },
  logout: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
  },
  tabs: {
    minHeight: 52,
    flexDirection: "row",
    gap: 5,
    marginHorizontal: 20,
    padding: 5,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    borderRadius: 10,
  },
  tabActive: { backgroundColor: COLORS.mainOrange },
  tabText: { color: COLORS.foreground, fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: COLORS.white },
  content: { paddingHorizontal: 20, paddingTop: 26, paddingBottom: 40, flexGrow: 1 },
  section: { gap: 13 },
  sectionTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  sectionSubtitle: { color: COLORS.mutedForeground, fontSize: 13, lineHeight: 19, marginTop: 3, marginBottom: 5 },
  muted: { color: COLORS.mutedForeground, fontSize: 13, lineHeight: 19, marginTop: 3 },
  grow: { flex: 1, minWidth: 0 },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.white,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF2E9",
  },
  cardTitle: { color: COLORS.foreground, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  inactiveLabel: { color: COLORS.mutedForeground, fontSize: 11, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: {
    color: COLORS.destructive,
    backgroundColor: "#FEF2F2",
    padding: 14,
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: { color: COLORS.mutedForeground, fontSize: 13, lineHeight: 19, padding: 18, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16 },
  emptyState: { padding: 22, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, backgroundColor: COLORS.white, gap: 4 },
  emptyTitle: { color: COLORS.foreground, fontSize: 17, fontWeight: "800" },
  emptyDark: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
  },
  inviteCard: {
    gap: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    backgroundColor: COLORS.white,
  },
  inviteTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inviteIcon: { width: 46, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF2E9" },
  inviteBottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 },
  acceptButton: { minHeight: 44, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 10, backgroundColor: COLORS.mainOrange },
  acceptButtonText: { color: COLORS.white, fontSize: 13, fontWeight: "800" },
  date: { color: COLORS.mutedForeground, fontSize: 12 },
  searchBox: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#DDE1E5",
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
  },
  searchInput: { flex: 1, color: COLORS.foreground, fontSize: 14 },
  catalogCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: COLORS.white,
  },
  catalogInfo: { flex: 1, minWidth: 0 },
  logo: { width: 54, height: 54, borderRadius: 12 },
  logoFallback: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#FFF2E9",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { color: COLORS.mainOrange, fontWeight: "800", fontSize: 16 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  modalityChip: { paddingHorizontal: 9, paddingVertical: 5, backgroundColor: "#FFF2E9", borderRadius: 8 },
  modalityChipText: { color: COLORS.foreground, fontSize: 11, fontWeight: "700" },
  detailSafe: { flex: 1, backgroundColor: COLORS.white },
  detailHeader: {
    minHeight: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
  },
  detailEyebrow: { color: COLORS.mainOrange, fontSize: 11, fontWeight: "800" },
  detailHeaderTitle: {
    color: COLORS.foreground,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 1,
  },
  details: {
    padding: 20,
    gap: 18,
    paddingBottom: 40,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  errorState: { gap: 12 },
  tenantHero: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 18,
    overflow: "hidden",
    paddingBottom: 20,
  },
  banner: { width: "100%", aspectRatio: 16 / 6, backgroundColor: "#F3F4F6" },
  bannerFallback: {
    width: "100%",
    aspectRatio: 16 / 6,
    backgroundColor: COLORS.mainOrange,
  },
  tenantIdentity: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  detailLogo: {
    width: 60,
    height: 60,
    borderRadius: 13,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  detailLogoFallback: {
    width: 60,
    height: 60,
    borderRadius: 13,
    backgroundColor: "#FFF2E9",
    alignItems: "center",
    justifyContent: "center",
  },
  detailLogoText: { color: COLORS.mainOrange, fontSize: 17, fontWeight: "800" },
  tenantName: { color: COLORS.foreground, fontSize: 22, fontWeight: "800", letterSpacing: -0.6 },
  description: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  heroPills: { paddingHorizontal: 18, marginTop: 15 },
  detailSectionHeader: { gap: 4, marginTop: 8 },
  detailTitle: { color: COLORS.foreground, fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  detailSubtitle: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 19,
  },
  plan: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  planSelected: { borderWidth: 2, borderColor: COLORS.mainOrange, backgroundColor: "#FFFAF7" },
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
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.mainOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
  },
  selectedBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  priceRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 9 },
  planPrice: { color: COLORS.foreground, fontSize: 27, fontWeight: "800", letterSpacing: -0.7 },
  priceSuffix: {
    color: COLORS.mutedForeground,
    fontSize: 11,
    paddingBottom: 4,
  },
  planFrequency: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  featuresList: {
    gap: 10,
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  featureItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: 13,
    lineHeight: 19,
  },
  avulsosSection: { gap: 10 },
  avulso: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    borderRadius: 14,
  },
  avulsoPrice: { color: COLORS.foreground, fontSize: 16, fontWeight: "800" },
  success: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 15,
    backgroundColor: COLORS.successSurface,
    borderRadius: 14,
  },
  successText: {
    flex: 1,
    color: COLORS.success,
    fontSize: 13,
    fontWeight: "700",
  },
  joinButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.mainOrange,
    borderRadius: 12,
    paddingHorizontal: 18,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
});
