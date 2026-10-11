"use client";

import { useState } from "react";

// 카톡 등에 붙여 넣기 쉽게 피드백을 글로 복사 (예: "[나상현 · 10/12 (월) 수업]\n👍 잘한 점: …")
export default function CopyFeedbackButton({ text, labels }: { text: string; labels: { copy: string; copied: string } }) {
  const [done, setDone] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // 오래된 브라우저·권한 거부: 숨긴 입력칸으로 복사
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setDone(true);
    setTimeout(() => setDone(false), 1500);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={`flex min-h-11 items-center rounded-full px-3 font-medium ${done ? "text-emerald-700" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {done ? `✓ ${labels.copied}` : `📋 ${labels.copy}`}
    </button>
  );
}

