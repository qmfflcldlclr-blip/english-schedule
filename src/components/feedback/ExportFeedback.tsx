"use client";

import CopyFeedbackButton from "@/components/feedback/CopyFeedbackButton";

type Props = {
  text: string; // 학생의 피드백 모음 (수업 날짜순)
  fileName: string; // "앤디_피드백_2026-10-17.txt"
  labels: { title: string; copy: string; copied: string; download: string };
};

// 학생별 피드백 내보내기: 통째로 복사(카톡 등) + .txt 파일 저장
export default function ExportFeedback({ text, fileName, labels }: Props) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-200 bg-brand-50 px-3 py-1">
      <span className="text-sm font-medium text-brand-800">📤 {labels.title}</span>
      <span className="flex items-center">
        <CopyFeedbackButton text={text} labels={{ copy: labels.copy, copied: labels.copied }} />
        <button type="button" onClick={download} className="flex min-h-11 items-center rounded-full px-3 font-medium text-gray-600 hover:bg-gray-100">
          💾 {labels.download}
        </button>
      </span>
    </div>
  );
}
