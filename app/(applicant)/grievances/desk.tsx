"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Scale, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/sla/state";

export type GrievanceCard = {
  id: string;
  subject: string;
  description: string;
  status: string;
  departmentName: string | null;
  createdAt: string;
  resolutionNote: string | null;
};

export type DepartmentOption = { id: string; name: string };

function statusLabel(status: string): string {
  if (status === "in_progress") return "In progress";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
}

function statusClass(status: string): string {
  if (status === "resolved" || status === "closed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "assigned") return "bg-blue-50 text-blue-700 border-blue-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export function GrievanceDesk({
  grievances,
  departments,
}: {
  grievances: GrievanceCard[];
  departments: DepartmentOption[];
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [subject, setSubject] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [details, setDetails] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function lodge(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/grievances", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subject,
        description: details,
        ...(departmentId ? { departmentId } : {}),
      }),
    });
    const payload = await response.json().catch(() => null) as { grievanceId?: string } | null;
    if (!response.ok || !payload?.grievanceId) {
      setError("The grievance could not be recorded.");
      setPending(false);
      return;
    }
    setReference(payload.grievanceId);
    setPending(false);
    router.refresh();
  }

  function close() {
    setShowModal(false);
    setReference(null);
    setError(null);
    setSubject("");
    setDetails("");
    setDepartmentId("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Right to Services (RTS) Grievance Redressal"
        description="Grievances recorded for your account. A department is stored only when you choose one that exists."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Grievances" }]}
      >
        <Button size="sm" onClick={() => setShowModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-8 gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Lodge RTS Grievance
        </Button>
      </PageHeader>
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-teal-50 text-teal-700 shrink-0"><Scale className="h-5 w-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Legally Enforceable Statutory SLAs</h3>
            <p className="text-xs text-slate-600 mt-0.5">No grievance resolution time or appeal window is configured. A grievance stays open until a department officer records a resolution.</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">Appeal window: not configured</Badge>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Registered RTS Complaints</h3>
          <span className="text-xs text-slate-500">Your grievances</span>
        </div>
        <div className="divide-y divide-slate-100">
          {grievances.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">No grievance has been recorded.</p>
          ) : grievances.map((item) => (
            <div key={item.id} className="p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-800">{item.id}</span>
                  <Badge variant="outline" className={`text-[10px] font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</Badge>
                </div>
                <span className="text-xs text-slate-500">Filed on: {formatTimestamp(item.createdAt)}</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-900">{item.subject}</h4>
              <p className="text-xs text-slate-600">{item.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                <div>
                  <span className="text-slate-400 block text-[11px]">Respondent Department:</span>
                  <span className="font-medium text-slate-800">{item.departmentName ?? "Not assigned"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Assigned Officer:</span>
                  <span className="font-medium text-slate-800">Not recorded</span>
                </div>
              </div>
              {item.resolutionNote ? (
                <div className="text-xs p-2 rounded bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>Resolution: </strong>{item.resolutionNote}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      {showModal ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            {reference ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Grievance recorded</h3>
                <p className="text-xs text-slate-600">Reference: <strong className="font-mono text-slate-800">{reference}</strong>. No resolution time is configured.</p>
                <Button size="sm" onClick={close} className="text-xs">Close</Button>
              </div>
            ) : (
              <form onSubmit={(event) => void lodge(event)} className="space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Lodge Right to Services (RTS) Grievance</h3>
                    <p className="text-xs text-slate-500">The grievance stays open until a department records a resolution.</p>
                  </div>
                  <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Target Department</label>
                    <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} className="w-full p-2 rounded-md border border-slate-300 text-xs text-slate-800 bg-white">
                      <option value="">Do not assign a department</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>{department.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Subject / Grounds for Escalation</label>
                    <input required value={subject} onChange={(event) => setSubject(event.target.value)} className="w-full p-2 rounded-md border border-slate-300 text-xs text-slate-800" />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Specific Details</label>
                    <textarea required rows={3} value={details} onChange={(event) => setDetails(event.target.value)} className="w-full p-2 rounded-md border border-slate-300 text-xs text-slate-800" />
                  </div>
                  {error ? <p className="text-amber-700">{error}</p> : null}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={close} className="text-xs">Cancel</Button>
                  <Button type="submit" size="sm" disabled={pending} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">Lodge Formal Grievance</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
