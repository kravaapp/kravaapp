import { Token } from "@/types/auth.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, PropsWithChildren, useEffect, useState } from "react";

type AuthState = {
    isAuthenticated: boolean;
    user: Token | null;
    signIn: (data: Token) => void;
    signOut: () => void;
}

const AUTH_STORAGE_KEY = "@krava:auth-state";

export const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: PropsWithChildren) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<Token | null>(null);

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
    }

    const signIn = (data: Token) => {
        setUser(data);
        setIsAuthenticated(true);
        storageState(data);
        router.replace("/");
    }

    const signOut = () => {
        setUser(null);
        setIsAuthenticated(false);
        storageState(null);
        router.replace("/signIn");
    }

    useEffect(() => {
        const checkAuthState = async () => {
            try {
                const storageState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
                const data = storageState ? JSON.parse(storageState) : null;
                if (data) {
                    setUser(data);
                    setIsAuthenticated(true);
                }
            } catch (error) {
                console.error("Error checking auth state in storage:", error);
            }
        }
        checkAuthState();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, user, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
