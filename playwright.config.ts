import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://localhost:8081",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
  webServer: {
    command: "npx expo start --web --port 8081",
    url: "http://localhost:8081",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
