"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateApprovalsButton({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function generate() {
    setPending(true);
    setMessage("");
    const response = await fetch(`/api/applications/${applicationId}/approvals`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setPending(false);
    if (response.ok) {
      router.refresh();
      return;
    }
    if (body?.code === "INSUFFICIENT_PROJECT_INFORMATION") {
      setMessage("Insufficient project information. Record a land classification before calculating approvals.");
      return;
    }
    setMessage("Approvals could not be generated.");
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={generate}
        disabled={pending}
        className="rounded-lg bg-[#0b1d35] hover:bg-[#122e50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors disabled:opacity-60"
      >
        {pending ? "Generating" : "Generate checklist"}
      </button>
      {message ? <p className="text-xs text-amber-700">{message}</p> : null}
    </div>
  );
}
