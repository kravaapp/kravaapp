import { AuthContext } from "@/contexts/authContext";
import { COLORS } from "@/constants/colors";
export { COLORS } from "@/constants/colors";
import { useUnreadNotificationCount } from "@/hooks/notifications.hooks";
import { Token } from "@/types/auth.types";
import { router } from "expo-router";
import { Bell, Building2, Lock, LogOut, Settings, UserRound } from "lucide-react-native";
import { useContext, useRef, useState } from "react";
import Modal from "@/components/AppModal";
import ChangePasswordModal from "./ChangePasswordModal";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import KravaLogo from "./KravaLogo";
import { NotificationsModal } from "./NotificationsModal";

/** Posição do menu na janela, medida a partir do avatar. */
type DropdownAnchor = { top: number; right: number };

const DROPDOWN_GAP = 8;

type DropdownProps = {
  visible: boolean;
  anchor: DropdownAnchor | null;
  onClose: () => void;
  onLogout: () => void;
  onProfile?: () => void;
  onExplore?: () => void;
  onChangePassword: () => void;
  user: Token | null;
};

const ProfileDropdown = ({
  visible,
  anchor,
  onClose,
  onLogout,
  onProfile,
  onExplore,
  onChangePassword,
  user,
}: DropdownProps) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Pressable
      style={[styles.dropdownBackdrop, anchor && { paddingTop: anchor.top, paddingRight: anchor.right }]}
      onPress={onClose}
    >
      <Pressable
        style={styles.dropdownMenu}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.dropdownLabel}>
          <Text style={styles.dropdownName}>{user?.userName || "Usuário"}</Text>
          <Text style={styles.dropdownMuted}>
            {user?.tenantName || "Arena"}
          </Text>
          <Text style={styles.dropdownMuted}>{"Plano Intermediário"}</Text>
        </View>

        <View style={styles.dropdownSeparator} />

        {onProfile && (
          <TouchableOpacity
            style={styles.dropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              onProfile();
            }}
          >
            <UserRound color={COLORS.foreground} size={16} />
            <Text style={styles.dropdownExploreText}>Meu perfil</Text>
          </TouchableOpacity>
        )}

        {onExplore && (
          <TouchableOpacity
            style={styles.dropdownItem}
            activeOpacity={0.7}
            onPress={() => {
              onClose();
              onExplore();
            }}
          >
            <Building2 color={COLORS.foreground} size={16} />
            <Text style={styles.dropdownExploreText}>
              Trocar ou explorar CTs
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.dropdownItem}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onChangePassword();
          }}
        >
          <Lock color={COLORS.foreground} size={16} />
          <Text style={styles.dropdownExploreText}>Alterar senha</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdownItem}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            router.push("/settings");
          }}
        >
          <Settings color={COLORS.foreground} size={16} />
          <Text style={styles.dropdownExploreText}>Configurações</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dropdownItem}
          activeOpacity={0.7}
          onPress={() => {
            onClose();
            onLogout();
          }}
        >
          <LogOut color={COLORS.destructive} size={16} />
          <Text style={styles.dropdownItemText}>Sair</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);


export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("");
};

const AlunoHeader = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState<DropdownAnchor | null>(null);
  const avatarRef = useRef<View>(null);
  const { width: windowWidth } = useWindowDimensions();
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const { signOut, user, selectTenantState } = useContext(AuthContext);
  const { unreadCount } = useUnreadNotificationCount();

  const handleLogout = () => {
    signOut();
  };

  const openDropdown = () => {
    const avatar = avatarRef.current;
    if (!avatar) {
      setDropdownVisible(true);
      return;
    }
    avatar.measureInWindow((x, y, width, height) => {
      setDropdownAnchor({
        top: y + height + DROPDOWN_GAP,
        right: Math.max(windowWidth - (x + width), 8),
      });
      setDropdownVisible(true);
    });
  };

  return (
    <>
      <View style={styles.header}>
        <KravaLogo size={28} showWordmark={true} />

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.bellButton}
            activeOpacity={0.7}
            onPress={() => setNotificationsVisible(true)}
            accessibilityLabel="Abrir notificações"
          >
            <Bell color={COLORS.foreground} size={18} />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            ref={avatarRef}
            style={styles.avatarButton}
            activeOpacity={0.8}
            onPress={openDropdown}
            accessibilityLabel="Abrir menu do perfil"
          >
            <Text style={styles.avatarText}>
              {getInitials(user?.userName || "")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ProfileDropdown
        visible={dropdownVisible}
        anchor={dropdownAnchor}
        onClose={() => setDropdownVisible(false)}
        onLogout={handleLogout}
        onProfile={
          user?.role === "Aluno" ? () => router.push("/profile") : undefined
        }
        onExplore={
          selectTenantState ? () => router.push("/selectTenant") : undefined
        }
        onChangePassword={() => setChangePasswordVisible(true)}
        user={user}
      />

      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />

      <ChangePasswordModal
        visible={changePasswordVisible}
        onClose={() => setChangePasswordVisible(false)}
      />
    </>
  );
};

export default AlunoHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bellButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F4F5",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  unreadBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 12,
  },
  avatarButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS.subOrange}`,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: COLORS.mainOrange,
    fontWeight: "700",
    fontSize: 11,
  },

  dropdownBackdrop: {
    flex: 1,
    alignItems: "flex-end",
    paddingTop: 96,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 224,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownLabel: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 2,
  },
  dropdownMuted: {
    fontSize: 12,
    color: COLORS.mutedForeground,
  },
  dropdownSeparator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.destructive,
    fontWeight: "500",
  },
  dropdownExploreText: {
    fontSize: 14,
    color: COLORS.foreground,
    fontWeight: "500",
  },
});
