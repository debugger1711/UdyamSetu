"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SubmitApplicationButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/applications/${applicationId}/submit`, { method: "POST" });
    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(typeof payload?.error === "string" ? payload.error : "Application could not be submitted.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="rounded-md bg-[#09192e] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0f243e] disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit application"}
      </button>
      {error ? <p className="text-xs text-rose-700">{error}</p> : null}
      <p className="text-[11px] text-slate-500">
        Submission records the application and opens a department workflow for each approval that names a department. It does not approve the application.
      </p>
    </div>
  );
}
