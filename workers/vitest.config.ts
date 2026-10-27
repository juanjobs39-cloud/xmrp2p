import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        // Base fija para las pruebas (solo testnet), independiente de lo desplegado en wrangler.toml.
        miniflare: { bindings: { TEST_MIGRATIONS: migrations, TAKE_TIMEOUT_MS: "1500", ACTIVE_NETWORKS: "arbitrum_sepolia", MONITOR_FACTORY: "" } },
      }),
    ],
    test: { setupFiles: ["./test/setup.ts"] },
  };
});
