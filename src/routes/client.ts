import { AUTH_STORAGE_KEY } from "@/contexts/authContext";
import { Token } from "@/types/auth.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import ky from "ky";

const baseUrl =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "https://api.kravaapp.com.br/api";

const api = ky.create({
  prefix: baseUrl,
  timeout: false,

  hooks: {
    beforeRequest: [
      async ({ request }) => {
        try {
          const authState = await AsyncStorage.getItem(AUTH_STORAGE_KEY);

          if (!authState) return;

          const user: Token = JSON.parse(authState);

          if (user?.accessToken && !request.headers.has("Authorization")) {
            request.headers.set(
              "Authorization",
              `Bearer ${user.accessToken}`
            );
          }
        } catch (err) {
          console.error("Erro ao carregar token:", err);
        }
      },
    ],

    afterResponse: [
      async ({ request, response }) => {
        if (response.status === 401) {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
          router.replace("/signIn");
        }

        return response;
      },
    ],
  },
});

export default api;
