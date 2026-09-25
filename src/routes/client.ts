import { AUTH_STORAGE_KEY } from "@/contexts/authContext";
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

          if (user?.accessToken && !request.headers.has("Authorization")) {
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
          const isLoginRequest = new URL(request.url).pathname.endsWith(
            "/auth/login",
          );

          // Credenciais inválidas no login também retornam 401. A tela deve
          // permanecer montada para conseguir exibir o detalhe retornado.
          if (authState && !isLoginRequest) {
            await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
            router.replace("/signIn");
          }
        }

        return response;
      },
    ],
  },
});

export default api;
