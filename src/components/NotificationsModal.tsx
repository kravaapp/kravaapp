import { useAuth } from "@/hooks/auth.hooks";
import { useNotificationActions, useNotifications } from "@/hooks/notifications.hooks";
import { USER_ROLES } from "@/types/auth.types";
import { useScreenRefresh } from "@/hooks/screenRefresh.hooks";
import RefreshableFlatList from "@/components/RefreshableFlatList";
import { NotificationDto } from "@/types/notifications.types";
import { router } from "expo-router";
import {
  AlertTriangle,
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Users,
} from "lucide-react-native";
import React from "react";
import Modal from "@/components/AppModal";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs <= 0 || diffMin < 1) return "agora";
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHours < 24) return `há ${diffHours} h`;
    if (diffDays === 1) return "ontem";
    if (diffDays < 7) return `há ${diffDays} dias`;

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}/${month}`;
  } catch {
    return "";
  }
}

function formatNotificationMessage(message: string): string {
  if (!message) return "";
  // Converte datas no formato americano/ISO (YYYY-MM-DD) para o padrão brasileiro (DD/MM/YYYY)
  return message.replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g, "$3/$2/$1");
}

interface TypeStyleConfig {
  icon: React.ReactNode;
  iconBg: string;
}

function getTypeConfig(type: string): TypeStyleConfig {
  switch (type) {
    case "WaitlistPromoted":
      return {
        icon: <Users size={20} color="#E85C07" />,
        iconBg: "#FFEDD5",
      };
    case "PaymentConfirmed":
      return {
        icon: <Check size={20} color="#16A34A" strokeWidth={2.5} />,
        iconBg: "#DCFCE7",
      };
    case "ClassCancelled":
    case "BookingConfirmed":
      return {
        icon: <Calendar size={20} color="#2563EB" />,
        iconBg: "#DBEAFE",
      };
    case "PaymentDue":
      return {
        icon: <AlertTriangle size={20} color="#DC2626" />,
        iconBg: "#FEE2E2",
      };
    default:
      return {
        icon: <Bell size={20} color="#E85C07" />,
        iconBg: "#FFF0E6",
      };
  }
}

export const NotificationsModal = ({ visible, onClose }: NotificationsModalProps) => {
  const { user } = useAuth();
  const refresh = useScreenRefresh([["notifications", "list"], ["notifications", "unread-count"]], { enabled: visible });
  const { notifications, isLoading } = useNotifications();
  const { markAsRead, markAllAsRead, isMarkingAllRead } = useNotificationActions();

  const handleItemPress = async (item: NotificationDto) => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }

    onClose();

    let payloadData: Record<string, any> | null = null;
    if (item.payload) {
      try {
        payloadData = typeof item.payload === "string" ? JSON.parse(item.payload) : item.payload;
      } catch {
        payloadData = null;
      }
    }

    const role = user?.role;
    const isAdmin = role === USER_ROLES.admin || role === "Admin";
    const isTeacher =
      role === USER_ROLES.professor ||
      role === USER_ROLES.instructor ||
      role === "Professor" ||
      role === "Instrutor";

    // 1. Visão do Administrador
    if (isAdmin) {
      if (
        item.type === "PaymentDue" ||
        item.type === "PaymentConfirmed" ||
        item.title?.toLowerCase().includes("pagamento recebido")
      ) {
        router.push("/(admin)/financial");
      } else if (
        item.type === "WaitlistPromoted" ||
        item.type === "BookingConfirmed" ||
        item.type === "ClassCancelled"
      ) {
        router.push("/(admin)/classes");
      } else if (item.type === "General" || item.type === "Reengagement") {
        if (
          payloadData?.type === "churn_risk" ||
          payloadData?.type === "admin_churn_alert" ||
          item.title?.toLowerCase().includes("churn") ||
          item.message?.toLowerCase().includes("churn")
        ) {
          router.push("/(admin)/churn");
        } else if (
          payloadData?.alunoId ||
          payloadData?.type === "aluno_delinquent_booked" ||
          payloadData?.type === "join_request_created" ||
          payloadData?.type === "partner_request_created" ||
          item.title?.toLowerCase().includes("inadimpl") ||
          item.title?.toLowerCase().includes("solicita") ||
          item.message?.toLowerCase().includes("inadimpl")
        ) {
          router.push("/(admin)/students");
        }
      }
      return;
    }

    // 2. Visão do Professor / Instrutor
    if (isTeacher) {
      if (
        item.type === "WaitlistPromoted" ||
        item.type === "BookingConfirmed" ||
        item.type === "ClassCancelled"
      ) {
        router.push("/(teacher)/classes");
      }
      return;
    }

    // 3. Visão do Aluno (padrão)
    if (item.type === "PaymentDue" || item.type === "PaymentConfirmed") {
      const invoiceId = payloadData?.cobrancaId || payloadData?.invoiceId || payloadData?.id;
      const isValidUuid =
        typeof invoiceId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId);

      if (isValidUuid) {
        router.push({
          pathname: "/(user)/payment",
          params: { id: invoiceId },
        });
      } else {
        router.push("/(user)/pendingPayments");
      }
    } else if (
      item.type === "WaitlistPromoted" ||
      item.type === "BookingConfirmed" ||
      item.type === "ClassCancelled" ||
      item.type === "Reengagement" ||
      item.title?.toLowerCase().includes("aula cancelada")
    ) {
      router.push("/schedule");
    } else if (item.type === "ContractExpiring") {
      router.push("/(user)/paymentPlans");
    } else if (
      item.title?.toLowerCase().includes("convênio") ||
      payloadData?.type === "partner_request_approved" ||
      payloadData?.type === "partner_request_rejected"
    ) {
      router.push("/profile");
    } else if (
      item.title?.toLowerCase().includes("solicitação aprovada") ||
      payloadData?.type === "join_request_approved"
    ) {
      router.push("/(user)");
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  const renderItem = ({ item }: { item: NotificationDto }) => {
    const config = getTypeConfig(item.type);
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity
        style={[styles.card, isUnread ? styles.cardUnread : styles.cardRead]}
        activeOpacity={0.7}
        onPress={() => handleItemPress(item)}
      >
        <View style={[styles.iconBox, { backgroundColor: config.iconBg }]}>
          {config.icon}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardMessage}>{formatNotificationMessage(item.message)}</Text>
          <Text style={styles.cardTime}>{formatRelativeTime(item.createdAtUtc)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheetContainer} onPress={(e) => e.stopPropagation()}>
          {/* Drag handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Notificações</Text>

            <View style={styles.headerActions}>
              {hasUnread && (
                <TouchableOpacity
                  style={styles.markAllButton}
                  onPress={() => markAllAsRead()}
                  disabled={isMarkingAllRead}
                  accessibilityLabel="Marcar todas como lidas"
                >
                  <CheckCheck size={18} color="#6B7280" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.closeButton}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
            <RefreshableFlatList {...refresh}
              data={isLoading ? [] : notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={[styles.listContent, notifications.length === 0 && { flexGrow: 1 }]}
              ListEmptyComponent={isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#E85C07" />
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Bell size={42} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                  <Text style={styles.emptySubtitle}>
                    Avisos sobre aulas, pagamentos e fila de espera aparecerão aqui.
                  </Text>
                </View>
              )}
              showsVerticalScrollIndicator={false}
            />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "85%",
    minHeight: 380,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handleContainer: {
    alignItems: "center",
    paddingVertical: 4,
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  markAllButton: {
    padding: 4,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: "700",
    color: "#E85C07",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  cardUnread: {
    backgroundColor: "#FFFDFB",
    borderWidth: 1.2,
    borderColor: "#FED7AA",
    shadowColor: "#E85C07",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRead: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  cardMessage: {
    fontSize: 13.5,
    color: "#4B5563",
    lineHeight: 19,
  },
  cardTime: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
    fontWeight: "500",
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
    marginTop: 14,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
});
