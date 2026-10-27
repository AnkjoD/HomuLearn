import { defineConfig } from "@playwright/test";

if (!/\/_?[^/?]*_test(?:\?|$)/.test(process.env.DB_URL || "")) {
  throw new Error("Browser tests require DB_URL pointing to a dedicated *_test PostgreSQL database.");
}

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  retries: 0,
  use: { baseURL: "http://127.0.0.1:5176", browserName: "chromium" },
  webServer: [
    {
      command: `${process.platform === "win32" ? "gradlew.bat" : "./gradlew"} bootRun --args=--server.port=18080 --console=plain`,
      cwd: "../backend/homulearn",
      url: "http://127.0.0.1:18080/api/v1/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5176 --strictPort",
      url: "http://127.0.0.1:5176",
      reuseExistingServer: false,
      env: { HOMULEARN_API_TARGET: "http://127.0.0.1:18080" },
    },
  ],
});
