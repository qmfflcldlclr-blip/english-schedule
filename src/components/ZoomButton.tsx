import Link from "next/link";

type Props = {
  url: string | null;
  t: { openZoom: string; noZoom: string; setZoom: string };
  size?: "large" | "small";
};

// 고정 Zoom 링크 열기 버튼 (새 탭/Zoom 앱으로 열림). 링크가 없으면 설정으로 안내
export default function ZoomButton({ url, t, size = "small" }: Props) {
  if (!url) {
    return (
      <p className="text-sm text-gray-500">
        {t.noZoom}{" "}
        <Link href="/settings" className="underline underline-offset-4">
          {t.setZoom}
        </Link>
      </p>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B5CFF] font-medium text-white hover:bg-[#0A4FDB] ${
        size === "large" ? "min-h-14 w-full text-base" : "min-h-11 px-4 text-sm"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h8A1.5 1.5 0 0 1 15 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 16.5zM16 10l4-2.5v9L16 14z" />
      </svg>
      {t.openZoom}
    </a>
  );
}
