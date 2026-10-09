"use client";

import { useState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { saveZoomUrl, type ZoomFormState } from "@/lib/settings-actions";
import type { Messages } from "@/i18n/server";
import { ErrorText, fieldClass } from "@/components/PlanForm";

export default function ZoomForm({ t, initial }: { t: Messages["settings"]; initial: string }) {
  const [state, onSubmit, pending] = useActionForm<ZoomFormState>(saveZoomUrl, {});
  const [url, setUrl] = useState(initial);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        name="zoom_url"
        type="url"
        inputMode="url"
        autoCapitalize="none"
        spellCheck={false}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={t.zoomPlaceholder}
        aria-invalid={state.error === "url" || undefined}
        className={fieldClass}
      />
      {state.error && <ErrorText>{t.errors[state.error]}</ErrorText>}
      {state.saved && !pending && <p className="text-sm text-emerald-700">✓ {t.saved}</p>}
      <button
        type="submit"
        disabled={pending}
        className="min-h-12 rounded-lg bg-gray-900 font-medium text-white disabled:opacity-60"
      >
        {pending ? t.saving : t.save}
      </button>
    </form>
  );
}
