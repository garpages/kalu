import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Enables local dev support for bindings defined in wrangler.jsonc
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
