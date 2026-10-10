import type { MetadataRoute } from "next";

// 폰 "홈 화면에 추가" 시 앱처럼 보이게 하는 정보 (이름·아이콘·색)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Andy English",
    short_name: "Andy English",
    description: "1:1 online English class schedule & credit management",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f9fe",
    theme_color: "#f5f9fe",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
