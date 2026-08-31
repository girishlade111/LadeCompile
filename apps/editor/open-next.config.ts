import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // No custom overrides needed for base setup.
  // Incrementally add KV/R2/D1 bindings here when required.
});
