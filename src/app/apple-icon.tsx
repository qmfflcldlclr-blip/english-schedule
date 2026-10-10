import { ImageResponse } from "next/og";

// 아이폰 홈 화면 아이콘 (PNG 180×180). 아이폰이 모서리를 알아서 둥글게 깎으므로 꽉 찬 사각형으로 그림
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
<rect width="180" height="180" fill="#2a84ea"/>
<path d="M62 38h56a26 26 0 0 1 26 26v34a26 26 0 0 1-26 26H86l-26 22v-23A26 26 0 0 1 36 98V64a26 26 0 0 1 26-26Z" fill="#fff"/>
<path d="M68 104 90 52l22 52M77 86h26" fill="none" stroke="#2a84ea" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="140" cy="42" r="15" fill="#ffc933" stroke="#2a84ea" stroke-width="5"/>
</svg>`;

export default function AppleIcon() {
  return new ImageResponse(
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" width={180} height={180} src={`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`} />,
    size,
  );
}
