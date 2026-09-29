"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { renewalDueAt } from "@/lib/renewals/eligibility";
import { formatTimestamp } from "@/lib/sla/state";

export type RenewalCertificate = {
  id: string;
  name: string;
  authority: string | null;
  number: string;
  validUntil: string | null;
  status: string;
};

export type RenewalRow = {
  id: string;
  certificateId: string;
  status: string;
  dueAt: string | null;
};

function daysRemaining(validUntil: string | null): string {
  const due = renewalDueAt(validUntil);
  if (!due) return "Not recorded";
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return `${days} days`;
}

export function RenewalDesk({
  certificates,
  renewals,
  activeCount,
  dueCount,
}: {
  certificates: RenewalCertificate[];
  renewals: RenewalRow[];
  activeCount: number;
  dueCount: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<RenewalCertificate | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const openRenewal = selected
    ? renewals.find((item) => item.certificateId === selected.id && (item.status === "due" || item.status === "submitted" || item.status === "under_review"))
    : null;
  const eligible = selected ? selected.status === "issued" && renewalDueAt(selected.validUntil) !== null : false;

  async function confirm() {
    if (!selected || !eligible) return;
    setPending(true);
    setError(null);
    let renewalId = openRenewal && openRenewal.status === "due" ? openRenewal.id : null;
    if (!renewalId) {
      const created = await fetch(`/api/certificates/${selected.id}/renewals`, { method: "POST" });
      const payload = await created.json().catch(() => null) as { renewalId?: string } | null;
      if (!created.ok || !payload?.renewalId) {
        setError("This certificate is not eligible for renewal.");
        setPending(false);
        return;
      }
      renewalId = payload.renewalId;
    }
    const submitted = await fetch(`/api/renewals/${renewalId}/submit`, { method: "POST" });
    if (!submitted.ok) {
      setError("The renewal could not be submitted.");
      setPending(false);
      return;
    }
    setReference(renewalId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licence & Consent Renewals"
        description="Recorded certificates and renewal filings. A renewal date is stored only when a certificate has a validity timestamp."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Renewals" }]}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Active Licences</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Issued certificates on your applications</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Renewals Due &lt; 100 Days</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{dueCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Counted only when a validity date is stored</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <span className="text-xs text-slate-500 font-medium">Estimated Renewal Fees</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">Not recorded</div>
          <p className="text-[11px] text-slate-500 mt-0.5">No fee schedule is configured</p>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Mandatory Industrial Clearances</h3>
          <p className="text-xs text-slate-500">A certificate is issued only after an approval decision. No decision is recorded yet, and no certificate file is generated.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <th className="p-3.5 font-semibold">Clearance / Licence</th>
                <th className="p-3.5 font-semibold">Licence No & Department</th>
                <th className="p-3.5 font-semibold">Valid Until</th>
                <th className="p-3.5 font-semibold">Days Remaining</th>
                <th className="p-3.5 font-semibold">Status</th>
                <th className="p-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-slate-500">No certificate has been issued.</td>
                </tr>
              ) : certificates.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-3.5 font-semibold text-slate-900">{item.name}</td>
                  <td className="p-3.5">
                    <span className="font-mono text-slate-700 block">{item.number}</span>
                    <span className="text-[11px] text-slate-500">{item.authority ?? "Not recorded"}</span>
                  </td>
                  <td className="p-3.5 text-slate-700">{formatTimestamp(item.validUntil)}</td>
                  <td className="p-3.5 text-slate-800">{daysRemaining(item.validUntil)}</td>
                  <td className="p-3.5">
                    <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 text-slate-700">{item.status}</Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <Button size="sm" onClick={() => { setSelected(item); setReference(null); setError(null); }} className="text-xs h-7 px-3 bg-[#09192e] hover:bg-[#0f243e] text-white">
                      Pre-Fill Renewal
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selected ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            {reference ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Renewal Submitted</h3>
                <p className="text-xs text-slate-600">Reference: <strong className="font-mono text-slate-800">{reference}</strong>. The renewal is submitted and is not completed.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Initiate Renewal Filing</h3>
                    <p className="text-xs text-slate-500">{selected.name}</p>
                  </div>
                  <button type="button" onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3 text-xs mb-5">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">Current Certificate:</span>
                      <span className="font-mono text-slate-800">{selected.number}</span>
                    </div>
                    <div className="flex justify-between"><span className="text-slate-500">Statutory Fee:</span><span className="text-slate-800">Not recorded</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Validity:</span><span className="text-slate-800">{formatTimestamp(selected.validUntil)}</span></div>
                  </div>
                  <p className="text-slate-600">Documents are not attached to this renewal. A validity date must already be stored on the certificate.</p>
                  {error ? <p className="text-amber-700">{error}</p> : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelected(null)} className="text-xs">Cancel</Button>
                  <Button size="sm" disabled={!eligible || pending || openRenewal?.status === "submitted"} onClick={() => void confirm()} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                    Submit Renewal Application
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
