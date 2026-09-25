import { AuthContext } from "@/contexts/authContext";
import { AuthRoutes } from "@/routes/auth.routes";
import { normalizeApiError } from "@/routes/apiError";
import {
  ConfirmEmailRequest,
  CreateInvitationRequest,
  ForgotPasswordRequest,
  LoginRequest,
  ResendConfirmationCodeRequest,
  ResetPasswordRequest,
  SelectTenantRequest,
  SelfRegisterRequest,
  VerifyResetCodeRequest,
} from "@/schemas/auth.schemas";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useContext } from "react";

export function useAuth() {
  const context = useContext(AuthContext);
  return context;
}

export function useLogin() {
  const { setSelectTenant } = useAuth();

  const loginMutation = useMutation({
    mutationFn: async (request: LoginRequest) => {
      const authRoutes = new AuthRoutes();
      return await authRoutes.login(request);
    },
    onSuccess: (data) => {
      const availableTenants = [...(data.availableTenants ?? [])];
      const tokenTenantId = data.token?.tenantId;
      const tokenHasTenant =
        !!tokenTenantId &&
        tokenTenantId !== "00000000-0000-0000-0000-000000000000" &&
        !!data.token?.tenantName?.trim();
      if (
        data.token &&
        tokenHasTenant &&
        !availableTenants.some((item) => item.tenantId === tokenTenantId)
      ) {
        availableTenants.push({
          tenantId: tokenTenantId,
          tenantName: data.token.tenantName,
          role: data.token.role,
          isActive: true,
        });
      }
      setSelectTenant({
        preAuthToken: data.preAuthToken,
        currentToken: data.token,
        availableTenants,
      });
    },
  });

  return {
    login: loginMutation.mutateAsync,
    isLoading: loginMutation.isPending,
    error: loginMutation.error
      ? normalizeApiError(loginMutation.error, "Erro ao realizar login")
          .description
      : null,
  };
}

export function useSelfRegister() {
  const mutation = useMutation({
    mutationFn: (request: SelfRegisterRequest) =>
      new AuthRoutes().selfRegister(request),
  });

  return {
    selfRegister: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error
      ? (mutation.error as any).data?.detail ||
        mutation.error.message ||
        "Erro ao criar conta"
      : null,
  };
}

/**
 * Recuperação de senha. Sem `error` exposto de propósito: a tela precisa do
 * `code` (WeakPassword vs InvalidOrExpiredResetCode) para decidir o fluxo, e o
 * `mutation.error` do React Query só atualiza no render seguinte — a tela
 * inspeciona o erro lançado por `mutateAsync` com `normalizeApiError`.
 */
export function useForgotPassword() {
  const mutation = useMutation({
    mutationFn: (request: ForgotPasswordRequest) =>
      new AuthRoutes().forgotPassword(request),
  });

  return {
    forgotPassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useVerifyResetCode() {
  const mutation = useMutation({
    mutationFn: (request: VerifyResetCodeRequest) =>
      new AuthRoutes().verifyResetCode(request),
  });

  return {
    verifyResetCode: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useResetPassword() {
  const mutation = useMutation({
    mutationFn: (request: ResetPasswordRequest) =>
      new AuthRoutes().resetPassword(request),
  });

  return {
    resetPassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

/**
 * Confirmação de e-mail pós-cadastro. Sem `error` exposto pelo mesmo motivo de
 * `useForgotPassword`: a tela precisa do `code` (Auth.UserNotFound vs
 * Auth.InvalidOrExpiredConfirmationCode) e o `mutation.error` do React Query só
 * atualiza no render seguinte — a tela inspeciona o erro lançado por
 * `mutateAsync` com `normalizeApiError`.
 */
export function useConfirmEmail() {
  const mutation = useMutation({
    mutationFn: (request: ConfirmEmailRequest) =>
      new AuthRoutes().confirmEmail(request),
  });

  return {
    confirmEmail: mutation.mutateAsync,
    isLoading: mutation.isPending,
  };
}

export function useResendConfirmationCode() {
  const mutation = useMutation({
    mutationFn: (request: ResendConfirmationCodeRequest) =>
      new AuthRoutes().resendConfirmationCode(request),
  });

  return {
    resendConfirmationCode: mutation.mutateAsync,
    isLoading: mutation.isPending,
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
  });

  return {
    selectTenant: selectTenantMutation.mutateAsync,
    isLoading: selectTenantMutation.isPending,
    error: selectTenantMutation.error
      ? (selectTenantMutation.error as any).data?.detail ||
        selectTenantMutation.error.message ||
        "Erro ao selecionar tenant"
      : null,
  };
}

export function useCreateInvitation() {
  const invitationMutation = useMutation({
    mutationFn: (request: CreateInvitationRequest) =>
      new AuthRoutes().createInvitation(request),
  });

  return {
    createInvitation: invitationMutation.mutateAsync,
    isLoading: invitationMutation.isPending,
  };
}

export function useCatalog(searchTerm: string) {
  const query = useQuery({
    queryKey: ["auth-catalog", searchTerm],
    queryFn: () => new AuthRoutes().getCatalog(searchTerm || undefined),
  });
  return {
    tenants: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCatalogTenant(ctId: string | null) {
  const query = useQuery({
    queryKey: ["auth-catalog", "details", ctId],
    queryFn: () => new AuthRoutes().getCatalogTenant(ctId!),
    enabled: !!ctId,
  });
  return { tenant: query.data, isLoading: query.isLoading, error: query.error };
}

export function usePendingInvitations(accessToken: string | null) {
  const query = useQuery({
    queryKey: ["pending-invitations"],
    queryFn: () => new AuthRoutes().getPendingInvitations(accessToken!),
    enabled: !!accessToken,
  });
  return {
    invitations: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useCatalogActions(accessToken: string) {
  const client = useQueryClient();
  const { addAvailableTenant } = useAuth();
  const join = useMutation({
    mutationFn: ({ ctId, planId }: { ctId: string; planId?: string | null }) =>
      new AuthRoutes().requestToJoin(ctId, { planId }, accessToken),
  });
  const accept = useMutation({
    mutationFn: (invitation: {
      id: string;
      ctId: string;
      ctName: string;
      role: string;
    }) => new AuthRoutes().acceptInvitation(invitation.id, accessToken),
    onSuccess: (_, invitation) => {
      addAvailableTenant({
        tenantId: invitation.ctId,
        tenantName: invitation.ctName,
        role: invitation.role,
        isActive: true,
      });
      client.invalidateQueries({ queryKey: ["pending-invitations"] });
    },
  });
  return {
    requestToJoin: join.mutateAsync,
    acceptInvitation: accept.mutateAsync,
    isJoining: join.isPending,
    isAccepting: accept.isPending,
  };
}
