"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: keyof typeof icons };

const icons = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2",
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  students:
    "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M22 19v-1a4 4 0 0 0-3-3.87M16 4.13a3 3 0 0 1 0 5.75",
};

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

// PC: 위쪽 가로 메뉴
export function TopNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="rounded-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 aria-[current=page]:bg-gray-100 aria-[current=page]:font-semibold aria-[current=page]:text-gray-900"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// 폰: 화면 아래 고정 탭 (아이폰 홈 바 영역만큼 아래 여백)
export function BottomNav({ items, label }: { items: Item[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs text-gray-500 aria-[current=page]:font-semibold aria-[current=page]:text-gray-900"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d={icons[item.icon]} />
          </svg>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
