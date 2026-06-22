import { COLORS } from "@/components/ClientHeader";
import { useAuth, useSelectTenant } from "@/hooks/useAuth";
import { Redirect } from "expo-router";
import { GraduationCap, LayoutGrid, Users } from "lucide-react-native";
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectTenant() {

  const { selectTenantState } = useAuth();
  const { selectTenant, isLoading } = useSelectTenant();

  if (!selectTenantState) {
    return <Redirect href="/signIn" />;
  }

  const getTenantIcon = (tenant: string) => {
    switch (tenant) {
      case "Admin":
        return <LayoutGrid color="#ffffff"  size={24} />;
      case "student":
        return <GraduationCap color="#ffffff"  size={24} />;
      default:
        return <Users color="#ffffff"  size={24} />;
    }
  };

  const getTenantRole = (tenant: string) => {
    switch (tenant) {
      case "Admin":
        return "Administrador";
      case "student":
        return "Aluno";
      default:
        return "Professor";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>K</Text>
        </View>
        <Text style={styles.title}>Selecione o local</Text>
        <Text style={styles.subtitle}>
          Escolha qual local deseja acessar no nosso aplicativo
        </Text>
      </View>

      <FlatList
        data={selectTenantState.availableTenants}
        keyExtractor={(item) => item.tenantId}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, isLoading && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={() => selectTenant({
              preAuthToken: selectTenantState.preAuthToken,
              tenantId: item.tenantId
            })}
            disabled={isLoading}
          >
            <View style={[styles.iconWrapper, { backgroundColor: COLORS.mainOrange }]}>
              {getTenantIcon(item.role)}
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>{item.tenantName}</Text>
              <Text style={styles.cardRole}>{getTenantRole(item.role)}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#18181b", // Dark background based on image
  },
  header: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    backgroundColor: COLORS.mainOrange, // Orange logo
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  logoText: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "bold",
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 14,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#18181b",
    marginBottom: 4,
  },
  cardRole: {
    fontSize: 14,
    color: "#71717a",
  },
});
