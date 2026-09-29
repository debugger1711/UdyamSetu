"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Upload, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/sla/state";

type InspectionItem = {
  id: string;
  applicationId: string;
  scheduledAt: string;
  status: string;
  location: string | null;
  departmentName: string;
  approvalName: string;
  officerName: string | null;
  reportBody: string | null;
};

type WorkflowChoice = {
  id: string;
  label: string;
};

export function OfficerInspectionDesk({
  inspections,
  workflows,
}: {
  inspections: InspectionItem[];
  workflows: WorkflowChoice[];
}) {
  const router = useRouter();
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const active = inspections.filter((item) => item.status === "scheduled" || item.status === "assigned");

  async function schedule() {
    if (!workflowId || !scheduledAt) return;
    setPending(true);
    const response = await fetch(`/api/department-workflows/${workflowId}/inspections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledAt: new Date(scheduledAt).toISOString() }),
    });
    setPending(false);
    setScheduleOpen(false);
    setMessage(response.ok ? "Inspection scheduled. The approval was not granted." : "Inspection was not scheduled.");
    if (response.ok) router.refresh();
  }

  async function complete() {
    if (!reportFor || !report.trim()) return;
    setPending(true);
    const response = await fetch(`/api/inspections/${reportFor}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: report }),
    });
    setPending(false);
    setReportFor(null);
    setReport("");
    setMessage(response.ok ? "Inspection report stored. The approval was not granted." : "Inspection was not completed.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Field Inspection Desk & Joint Scheduling"
        description="Inspections for department workflows assigned to this account."
        breadcrumbs={[
          { label: "Command Center", href: "/officer-dashboard" },
          { label: "Inspections Desk" },
        ]}
      >
        <Button size="sm" onClick={() => setScheduleOpen(true)} className="text-xs h-8 bg-[#09192e] text-white">
          Schedule inspection
        </Button>
      </PageHeader>
      {message ? <p className="text-xs text-slate-600">{message}</p> : null}
      {active.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-500">
          No inspection is scheduled for your department.
        </div>
      ) : active.map((inspection) => (
        <div key={inspection.id} className="bg-white rounded-xl border border-teal-200 shadow-sm p-5">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs">{inspection.status}</Badge>
              <h3 className="text-base font-bold text-slate-900 mt-1.5">{inspection.approvalName}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{inspection.departmentName} · {inspection.location ?? "Location not recorded"}</p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-teal-700 block">{formatTimestamp(inspection.scheduledAt)}</span>
              <span className="text-[11px] text-slate-400">Officer: {inspection.officerName ?? "Not recorded"}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mb-3">Reference application: {inspection.applicationId}</div>
          <Button size="sm" onClick={() => setReportFor(inspection.id)} className="text-xs h-8 bg-[#09192e] text-white gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Upload Inspection Findings
          </Button>
        </div>
      ))}

      {scheduleOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6">
            <div className="flex justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Schedule inspection</h3>
              <button onClick={() => setScheduleOpen(false)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-3 text-xs">
              <select value={workflowId} onChange={(event) => setWorkflowId(event.target.value)} className="w-full rounded-md border border-slate-300 p-2">
                {workflows.map((workflow) => <option key={workflow.id} value={workflow.id}>{workflow.label}</option>)}
              </select>
              <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="w-full rounded-md border border-slate-300 p-2" />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setScheduleOpen(false)} className="text-xs">Cancel</Button>
              <Button size="sm" disabled={pending || !scheduledAt || !workflowId} onClick={() => void schedule()} className="text-xs">Save</Button>
            </div>
          </div>
        </div>
      ) : null}

      {reportFor ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Submit inspection report</h3>
            <p className="text-xs text-slate-500 mt-1">The report does not grant or reject the approval.</p>
            <textarea rows={4} value={report} onChange={(event) => setReport(event.target.value)} className="mt-3 w-full rounded-md border border-slate-300 p-2 text-xs" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setReportFor(null)} className="text-xs">Cancel</Button>
              <Button size="sm" disabled={pending || !report.trim()} onClick={() => void complete()} className="text-xs bg-emerald-600 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Endorse & Save Report
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
