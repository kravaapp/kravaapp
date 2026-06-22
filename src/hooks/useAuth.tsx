import { AuthContext } from "@/contexts/authContext";
import { AuthRoutes } from "@/routes/auth.routes";
import { LoginRequest, SelectTenantRequest } from "@/schemas/auth.schemas";
import { useMutation } from "@tanstack/react-query";
import { HTTPError } from "ky";
import { useContext, useEffect } from "react";

export function useAuth() {
    const context = useContext(AuthContext);
    return context;
}

export function useLogin() {
    const { signIn } = useAuth();

    const loginMutation = useMutation({
        mutationFn: async (request: LoginRequest) => {
            const authRoutes = new AuthRoutes();
            return await authRoutes.login(request);
        },
        onSuccess: (data) => {
            signIn(data.token);
        },
        onError: (error: HTTPError) => {
            console.log(JSON.stringify(error));
        }
    });

    useEffect(() => {
        console.log(loginMutation.error);
    }, [loginMutation.error])

    return {
        login: loginMutation.mutateAsync,
        isLoading: loginMutation.isPending,
        error: loginMutation.error
            ? (loginMutation.error as any).data?.detail || loginMutation.error.message || "Erro ao realizar login"
            : null
    };
}

export function useSelectTenant() {

    const { signIn } = useAuth();

    const selectTenantMutation = useMutation({
        mutationFn: async (request: SelectTenantRequest) => {
            const authRoutes = new AuthRoutes();
            return await authRoutes.selectTenant(request);
        },
        onSuccess: (data) => {
            signIn(data);
        },
        onError: (error: HTTPError) => {
            console.log(JSON.stringify(error));
        }
    });

    return {
        selectTenant: selectTenantMutation.mutateAsync,
        isLoading: selectTenantMutation.isPending,
        error: selectTenantMutation.error
            ? (selectTenantMutation.error as any).data?.detail || selectTenantMutation.error.message || "Erro ao selecionar tenant"
            : null
    };
}