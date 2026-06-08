import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { createContext, PropsWithChildren, useEffect, useState } from "react";

type AuthState = {
    isAuthenticated: boolean;
    signIn: () => void;
    signOut: () => void;
}

const AUTH_STORAGE_KEY = "@krava:auth-state";

export const AuthContext = createContext<AuthState>({} as AuthState);

export function AuthProvider({ children }: PropsWithChildren) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const storageState = async (state: boolean) => {
        try {
            await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ isAuthenticated: state }));
        } catch (error) {
            console.error("Error setting auth state in storage:", error);
        }
    }

    const signIn = () => {
        setIsAuthenticated(true);
        storageState(true);
        router.replace("/");
    }

    const signOut = () => {
        setIsAuthenticated(false);
        storageState(false);
        router.replace("/signIn");
    }

    useEffect(() => {
        const checkAuthState = async () => {
            try {
                const storageState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
                const state = storageState ? JSON.parse(storageState) : null;
                if (state?.isAuthenticated) {
                    signIn();
                }
            } catch (error) {
                console.error("Error checking auth state in storage:", error);
            }
        }
        checkAuthState();
    }, []);

    return (
        <AuthContext.Provider value={{ isAuthenticated, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
