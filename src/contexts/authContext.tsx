import { AvailableTenant, Token, USER_ROLES } from "@/types/auth.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, router } from "expo-router";
import { createContext, PropsWithChildren, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { COLORS } from "@/constants/colors";
import { AUTH_STORAGE_KEY, TENANT_SELECTION_STORAGE_KEY, isValidStoredToken } from "@/utils/authSession";
export { AUTH_STORAGE_KEY } from "@/utils/authSession";

type SelectTenantState = {
  preAuthToken: string | null;
  currentToken: Token | null;
  availableTenants: AvailableTenant[];
};

type AuthState = {
  isAuthenticated: boolean;
  user: Token | null;
  selectTenantState: SelectTenantState | null;
  setSelectTenant: (data: SelectTenantState) => Promise<void>;
  addAvailableTenant: (tenant: AvailableTenant) => void;
  updateAvailableTenants: (tenants: AvailableTenant[]) => void;
  updateCurrentTenantLogo: (logoUrl: string | null) => void;
  signIn: (data: Token) => Promise<void>;
  signOut: () => Promise<void>;
};

const EMPTY_TENANT_ID = "00000000-0000-0000-0000-000000000000";

const tokenHasTenant = (token: Token) =>
  !!token.tenantId &&
  token.tenantId !== EMPTY_TENANT_ID &&
  !!token.tenantName?.trim();

const tenantFromToken = (token: Token): AvailableTenant => ({
  tenantId: token.tenantId,
  tenantName: token.tenantName,
  role: token.role,
  isActive: true,
  logoUrl: token.logoUrl ?? null,
});

export function getHomeRoute(role: string): Href {
  if (role === USER_ROLES.professor || role === USER_ROLES.instructor)
    return "/(teacher)";
  if (role === USER_ROLES.admin) return "/(admin)";
  return "/(user)";
}

export const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: PropsWithChildren) {
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<Token | null>(null);
  const [selectTenantState, setSelectTenantState] =
    useState<SelectTenantState | null>(null);

  const storageState = async (data: Token | null) => {
    try {
      if (data) {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
      } else {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    } catch (error) {
      console.error("Error setting auth state in storage:", error);
    }
  };

  const signIn = async (data: Token) => {
    await storageState(data);
    setUser(data);
    setIsAuthenticated(true);
    setSelectTenantState((current) => {
      const currentTenant = tokenHasTenant(data) ? tenantFromToken(data) : null;
      let availableTenants = current?.availableTenants ?? [];
      if (currentTenant) {
        const existingIndex = availableTenants.findIndex(
          (t) => t.tenantId === currentTenant.tenantId,
        );
        if (existingIndex >= 0) {
          const existing = availableTenants[existingIndex];
          const merged: AvailableTenant = {
            ...existing,
            ...currentTenant,
            logoUrl: currentTenant.logoUrl ?? existing.logoUrl ?? null,
          };
          availableTenants = [
            ...availableTenants.slice(0, existingIndex),
            merged,
            ...availableTenants.slice(existingIndex + 1),
          ];
        } else {
          availableTenants = [...availableTenants, currentTenant];
        }
      }
      const next: SelectTenantState = {
        // Depois que o JWT foi emitido, nunca reutilizar o token temporário.
        preAuthToken: null,
        currentToken: data,
        availableTenants,
      };
      AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    router.replace(getHomeRoute(data.role));
  };

  const setSelectTenant = async (data: SelectTenantState) => {
    if (data.preAuthToken) {
      setUser(null);
      setIsAuthenticated(false);
      await storageState(null);
    } else if (data.currentToken) {
      await storageState(data.currentToken);
      setUser(data.currentToken);
      setIsAuthenticated(true);
    }
    setSelectTenantState(data);
    await AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(data));
    router.replace("/selectTenant");
  };

  const addAvailableTenant = (tenant: AvailableTenant) => {
    setSelectTenantState((current) => {
      if (!current) return current;
      const next = {
        ...current,
        availableTenants: current.availableTenants.some(
          (item) => item.tenantId === tenant.tenantId,
        )
          ? current.availableTenants.map((item) =>
              item.tenantId === tenant.tenantId
                ? { ...item, ...tenant, logoUrl: tenant.logoUrl ?? item.logoUrl }
                : item,
            )
          : [...current.availableTenants, tenant],
      };
      AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateAvailableTenants = (tenants: AvailableTenant[]) => {
    setSelectTenantState((current) => {
      if (!current) {
        return {
          preAuthToken: null,
          currentToken: user,
          availableTenants: tenants,
        };
      }
      const next: SelectTenantState = {
        ...current,
        availableTenants: tenants,
      };
      AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const updateCurrentTenantLogo = (logoUrl: string | null) => {
    setUser((currentUser) => {
      if (!currentUser) return null;
      const updatedUser: Token = { ...currentUser, logoUrl };
      storageState(updatedUser);
      return updatedUser;
    });

    setSelectTenantState((current) => {
      if (!current) return current;
      const tenantId = current.currentToken?.tenantId ?? user?.tenantId;
      const next: SelectTenantState = {
        ...current,
        currentToken: current.currentToken
          ? { ...current.currentToken, logoUrl }
          : null,
        availableTenants: current.availableTenants.map((t) =>
          !tenantId || t.tenantId === tenantId ? { ...t, logoUrl } : t,
        ),
      };
      AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const signOut = async () => {
    setUser(null);
    setIsAuthenticated(false);
    setSelectTenantState(null);
    await Promise.all([
      storageState(null),
      AsyncStorage.removeItem(TENANT_SELECTION_STORAGE_KEY),
    ]);
    router.replace("/signIn");
  };

  useEffect(() => {
    let active = true;
    const checkAuthState = async () => {
      try {
        const [storedAuth, storedSelection] = await Promise.all([
          AsyncStorage.getItem(AUTH_STORAGE_KEY),
          AsyncStorage.getItem(TENANT_SELECTION_STORAGE_KEY),
        ]);
        if (!active) return;
        let savedToken: unknown = null;
        let selection: SelectTenantState | null = null;
        try { savedToken = storedAuth ? JSON.parse(storedAuth) : null; } catch {}
        try {
          const parsed = storedSelection ? JSON.parse(storedSelection) : null;
          if (parsed && Array.isArray(parsed.availableTenants)) selection = parsed;
        } catch {}

        // Compatibilidade com logins antigos que só persistiam o token na seleção de CT.
        const data = isValidStoredToken(savedToken) ? savedToken
          : !storedAuth && !selection?.preAuthToken && isValidStoredToken(selection?.currentToken)
          ? selection.currentToken : null;
        if (data) {
          const restoredSelection: SelectTenantState = {
            preAuthToken: null,
            currentToken: data,
            availableTenants: selection?.availableTenants
              ?? (tokenHasTenant(data) ? [tenantFromToken(data)] : []),
          };
          setSelectTenantState(restoredSelection);
          setUser(data);
          setIsAuthenticated(true);
          await Promise.all([
            AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data)),
            AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(restoredSelection)),
          ]);
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          if (!storedAuth && selection?.preAuthToken && !selection.currentToken) {
            setSelectTenantState(selection);
          } else {
            await AsyncStorage.removeItem(TENANT_SELECTION_STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error("Error checking auth state in storage:", error);
      } finally {
        if (active) setIsRestoringSession(false);
      }
    };
    checkAuthState();
    return () => { active = false; };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        signIn,
        signOut,
        selectTenantState,
        setSelectTenant,
        addAvailableTenant,
        updateAvailableTenants,
        updateCurrentTenantLogo,
      }}
    >
      {isRestoringSession ? (
        <View testID="auth-loading" style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background }}>
          <ActivityIndicator accessibilityLabel="Carregando sessão" color={COLORS.mainOrange} />
        </View>
      ) : children}
    </AuthContext.Provider>
  );
}
