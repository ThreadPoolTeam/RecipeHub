import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";

const modules = resolve("node_modules");
const realModules = realpathSync(modules);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  experimental: {
    agentUpgrade: "security",
    ...(realModules.toLowerCase() !== modules.toLowerCase()
      ? { turbopackAdditionalRoots: { dependencies: { path: dirname(realModules) } } }
      : {}),
    useTypeScriptCli: false,
  },
};

export default nextConfig;
