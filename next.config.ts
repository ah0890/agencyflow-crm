import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module: keep it out of the bundler and let Node
  // require it at runtime.
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],

  // Do not generate AGENTS.md / CLAUDE.md into the repo.
  agentRules: false,

  // Hide the floating dev-mode badge. It sits in the bottom-left corner,
  // directly over the sidebar user card, which spoils demo recordings.
  devIndicators: false,
};

export default nextConfig;
