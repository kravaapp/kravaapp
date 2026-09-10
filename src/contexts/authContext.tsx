import { AvailableTenant, Token, USER_ROLES } from "@/types/auth.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, router } from "expo-router";
import { createContext, PropsWithChildren, useEffect, useState } from "react";

type SelectTenantState = {
  preAuthToken: string | null;
  currentToken: Token | null;
  availableTenants: AvailableTenant[];
};

type AuthState = {
  isAuthenticated: boolean;
  user: Token | null;
  selectTenantState: SelectTenantState | null;
  setSelectTenant: (data: SelectTenantState) => void;
  addAvailableTenant: (tenant: AvailableTenant) => void;
  signIn: (data: Token) => void;
  signOut: () => void;
};

export const AUTH_STORAGE_KEY = "@krava:auth-state";
const TENANT_SELECTION_STORAGE_KEY = "@krava:tenant-selection";
const EMPTY_TENANT_ID = "00000000-0000-0000-0000-000000000000";

const tokenHasTenant = (token: Token) =>
  !!token.tenantId &&
  token.tenantId !== EMPTY_TENANT_ID &&
  !!token.tenantName?.trim();

export function getHomeRoute(role: string): Href {
  if (role === USER_ROLES.professor || role === USER_ROLES.instructor)
    return "/(teacher)";
  if (role === USER_ROLES.admin) return "/(admin)";
  return "/(user)";
}

export const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: PropsWithChildren) {
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

  const signIn = (data: Token) => {
    setUser(data);
    setIsAuthenticated(true);
    storageState(data);
    router.replace(getHomeRoute(data.role));
  };

  const setSelectTenant = (data: SelectTenantState) => {
    setSelectTenantState(data);
    AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(data));
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
          ? current.availableTenants
          : [...current.availableTenants, tenant],
      };
      AsyncStorage.setItem(TENANT_SELECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const signOut = () => {
    setUser(null);
    setIsAuthenticated(false);
    setSelectTenantState(null);
    storageState(null);
    AsyncStorage.removeItem(TENANT_SELECTION_STORAGE_KEY);
    router.replace("/signIn");
  };

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const storageState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        const storedSelection = await AsyncStorage.getItem(
          TENANT_SELECTION_STORAGE_KEY,
        );
        const data = storageState ? JSON.parse(storageState) : null;
        if (storedSelection) {
          setSelectTenantState(JSON.parse(storedSelection));
        } else if (data) {
          const restoredSelection: SelectTenantState = {
            preAuthToken: null,
            currentToken: data,
            availableTenants: tokenHasTenant(data)
              ? [
                  {
                    tenantId: data.tenantId,
                    tenantName: data.tenantName,
                    role: data.role,
                    isActive: true,
                  },
                ]
              : [],
          };
          setSelectTenantState(restoredSelection);
          await AsyncStorage.setItem(
            TENANT_SELECTION_STORAGE_KEY,
            JSON.stringify(restoredSelection),
          );
        }
        if (data) {
          setUser(data);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Error checking auth state in storage:", error);
      }
    };
    checkAuthState();
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
