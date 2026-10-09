"use client";

import { useActionForm } from "@/lib/use-action-form";
import { login, type LoginState } from "@/lib/auth-actions";
import type { Messages } from "@/i18n/server";

export default function LoginForm({ t }: { t: Messages["auth"] }) {
  const [state, onSubmit, pending] = useActionForm<LoginState>(
    login,
    {},
  );

  const inputClass =
    "mt-1 min-h-12 w-full rounded-lg border border-gray-300 px-3 text-base focus:border-gray-900 focus:outline-none";

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="block text-sm font-medium">
        {t.username}
        <input
          name="username"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        {t.password}
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </label>

      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {t[state.error]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 min-h-12 rounded-lg bg-gray-900 font-medium text-white disabled:opacity-60"
      >
        {pending ? t.submitting : t.submit}
      </button>
    </form>
  );
}
