import { AuthContext } from '@/contexts/authContext';
import { LogOut } from 'lucide-react-native';
import { useContext, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import KravaLogo from "./KravaLogo";

export const COLORS = {
  card: '#ffffff',
  border: '#e5e7eb',
  primary: '#6366f1',
  primaryFg: '#ffffff',
  foreground: '#111827',
  mutedForeground: '#6b7280',
  destructive: '#ef4444',
  destructiveFg: '#ffffff',
  overlay: 'rgba(0,0,0,0.4)',
  white: '#ffffff',
  outline: '#d1d5db',
  mainOrange: '#e95a07',
  subOrange: '#fbdecd',
  grayLabels: '#6b7280',
};

type DropdownProps = {
  visible: boolean;
  onClose: () => void;
  onLogout: () => void;
};

const ProfileDropdown = ({ visible, onClose, onLogout }: DropdownProps) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onClose}
    statusBarTranslucent
  >
    <Pressable style={styles.dropdownBackdrop} onPress={onClose}>
      <Pressable style={styles.dropdownMenu} onPress={e => e.stopPropagation()}>
        <View style={styles.dropdownLabel}>
          <Text style={styles.dropdownName}>Carlos Mendes</Text>
          <Text style={styles.dropdownMuted}>FitPira Arena</Text>
          <Text style={styles.dropdownMuted}>Plano Intermediário</Text>
        </View>

        <View style={styles.dropdownSeparator} />

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

const AlunoHeader = () => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const { signOut } = useContext(AuthContext);

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
          <Text style={styles.avatarText}>CM</Text>
        </TouchableOpacity>
      </View>

      <ProfileDropdown
        visible={dropdownVisible}
        onClose={() => setDropdownVisible(false)}
        onLogout={handleLogout}
      />
    </>
  );
};

export default AlunoHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.mainOrange,
    fontWeight: '700',
    fontSize: 11,
  },

  dropdownBackdrop: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 16,
  },
  dropdownMenu: {
    width: 224,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingVertical: 4,
    shadowColor: '#000',
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
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: COLORS.destructive,
    fontWeight: '500',
  }
});