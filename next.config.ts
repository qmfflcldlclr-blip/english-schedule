import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 Wi-Fi의 폰에서 개발 서버에 접속해 확인할 수 있게 허용 (개발 중에만 적용)
  allowedDevOrigins: ["192.168.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
