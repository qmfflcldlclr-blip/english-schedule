"use client";

import { useFormStatus } from "react-dom";

// 서버로 보내는 동안 비활성화되고 "처리 중" 문구로 바뀌는 제출 버튼
export default function SubmitButton({
  label,
  pendingLabel,
  className = "",
  disabled,
}: {
  label: string;
  pendingLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`min-h-12 rounded-lg bg-gray-900 px-5 font-medium text-white disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
