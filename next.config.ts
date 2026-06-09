import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Fixa a raiz do projeto (ha um package-lock.json no diretorio do usuario
  // que confundia a deteccao automatica do workspace).
  turbopack: { root: process.cwd() },
};

export default nextConfig;
