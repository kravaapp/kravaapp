import ky from "ky";

const api = ky.create({
  prefix: process.env.EXPO_PUBLIC_API_URL || 'https://krava-api-latest.onrender.com/api',
  timeout: false,
  hooks: {
    afterResponse: [
      async ({ response }) => {
        if (response.status === 401) {
          console.error('erro');
        }

        return response;
      },
    ],
  },
});

export default api;