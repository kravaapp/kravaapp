import { AUTH_STORAGE_KEY, TENANT_SELECTION_STORAGE_KEY } from "@/utils/authSession";
import { Token } from "@/types/auth.types";
import { apiBaseUrl } from "@/utils/apiUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import ky from "ky";

const api = ky.create({
  prefix: apiBaseUrl,
  timeout: false,

  hooks: {
    beforeRequest: [
      async ({ request }) => {
        try {
          const authState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

          if (!authState) return;

          const user: Token = JSON.parse(authState);
          const requestPath = new URL(request.url).pathname;
          const isSelectingTenant = requestPath.endsWith("/auth/select-tenant");

          if (
            user?.accessToken &&
            !isSelectingTenant &&
            !request.headers.has("Authorization")
          ) {
            request.headers.set(
              "Authorization",
              `Bearer ${user.accessToken}`
            );
          }

          // A troca de CT é autorizada pelo JWT, mas não pode carregar o
          // Tenant-Id anterior, pois ele é justamente o contexto a ser mudado.
          if (
            user?.tenantId &&
            !isSelectingTenant &&
            !request.headers.has("Tenant-Id")
          ) {
            request.headers.set("Tenant-Id", user.tenantId);
          }
        } catch (err) {
          console.error("Erro ao carregar token:", err);
        }
      },
    ],

    afterResponse: [
      async ({ request, response }) => {
        if (response.status === 401) {
          const authState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
          const requestPath = new URL(request.url).pathname;
          const isLoginRequest = requestPath.endsWith("/auth/login");
          const isSelectTenantRequest = requestPath.endsWith("/auth/select-tenant");

          // Credenciais inválidas no login ou seleção tratada não devem ejetar
          // a tela antes do catch do componente conseguir exibir o erro.
          if (authState && !isLoginRequest && !isSelectTenantRequest) {
            await Promise.all([
              AsyncStorage.removeItem(AUTH_STORAGE_KEY),
              AsyncStorage.removeItem(TENANT_SELECTION_STORAGE_KEY),
            ]);
            router.replace("/signIn");
          }
        }

        return response;
      },
    ],
  },
});

export default api;
