import { AuthContext } from "@/contexts/authContext";
import { Token } from "@/types/auth.types";
import { router } from "expo-router";
import { Building2, LogOut, UserRound } from "lucide-react-native";
import { useContext, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import KravaLogo from "./KravaLogo";

export const COLORS = {
  card: "#ffffff",
  border: "#e5e7eb",
  primary: "#6366f1",
  primaryFg: "#ffffff",
  foreground: "#111827",
  mutedForeground: "#6b7280",
  destructive: "#ef4444",
  destructiveFg: "#ffffff",
  overlay: "rgba(0,0,0,0.4)",
  white: "#ffffff",
  outline: "#d1d5db",
  mainOrange: "#E85C07",
  subOrange: "#fbdecd",
  grayLabels: "#6b7280",
  navy: "#0f172a",
  navyForeground: "#ffffff",
  warning: "#f59e0b",
  warningSurface: "#fffbeb",
  info: "#3b82f6",
  infoSurface: "#dbeafe",
  success: "#22c55e",
  successSurface: "#dcfce7",
};

type DropdownProps = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
  onProfile?: () => void;
  onExplore?: () => void;
  user: Token | null;
};

const ProfileDropdown = ({
  visible,
  onClose,
  onLogout,
  onProfile,
  onExplore,
  user,
}: DropdownProps) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Pressable style={styles.dropdownBackdrop} onPress={onClose}>
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
  const { signOut, user, selectTenantState } = useContext(AuthContext);

  const handleLogout = () => {
    signOut();
  };

  return (
    <>
      <View style={styles.header}>
        <KravaLogo size={28} showWordmark={true} />

        <TouchableOpacity
          style={styles.avatarButton}
          activeOpacity={0.8}
          onPress={() => setDropdownVisible(true)}
          accessibilityLabel="Abrir menu do perfil"
        >
          <Text style={styles.avatarText}>
            {getInitials(user?.userName || "")}
          </Text>
        </TouchableOpacity>
      </View>

      <ProfileDropdown
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onLogout={handleLogout}
        onProfile={
          user?.role === "Aluno" ? () => router.push("/profile") : undefined
        }
        onExplore={
          selectTenantState ? () => router.push("/selectTenant") : undefined
        }
        user={user}
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
