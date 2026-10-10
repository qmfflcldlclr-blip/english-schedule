"use client";

import { useTransition } from "react";
import { deleteFeedback } from "@/lib/feedback-actions";

// 피드백 지우기 (확인 창 띄움)
export default function DeleteFeedbackButton({
  id,
  back,
  label,
  confirmMessage,
}: {
  id: string;
  back: string;
  label: string;
  confirmMessage: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(() => deleteFeedback(id, back));
      }}
      className="min-h-11 rounded-full px-3 font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
    >
      {label}
    </button>
  );
}
