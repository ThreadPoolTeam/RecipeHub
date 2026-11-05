/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD ? "standalone" : undefined,
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
