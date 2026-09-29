"use client";

import { useState } from "react";
import { Check, CheckCircle2, Clock, FileText, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

type Workflow = {
  id: string;
  departmentName: string;
  approvalName: string;
  approvalStatus: string;
  status: string;
};

type QueryItem = {
  id: string;
  body: string;
  status: string;
  createdAt: string;
  responseBody: string | null;
  responseCreatedAt: string | null;
};

type DocumentItem = {
  id: string;
  name: string;
  fileName: string;
  status: string;
};

export function OfficerReview({
  applicationId,
  applicantName,
  applicantEmail,
  projectName,
  location,
  submittedAt,
  applicationStatus,
  workflows,
  documents,
  queries,
}: {
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  projectName: string;
  location: string;
  submittedAt: string;
  applicationStatus: string;
  workflows: Workflow[];
  documents: DocumentItem[];
  queries: QueryItem[];
}) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"clarify" | "approve" | "reject" | null>(null);
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? "");
  const [clarificationText, setClarificationText] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendQuery() {
    if (!workflowId || !clarificationText.trim()) return;
    setPending(true);
    const response = await fetch(`/api/department-workflows/${workflowId}/queries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: clarificationText }),
    });
    setPending(false);
    setActiveModal(null);
    if (!response.ok) {
      setFeedbackToast("Query was not recorded.");
    } else {
      setClarificationText("");
      setFeedbackToast("Clarification query recorded. The approval was not granted.");
      router.refresh();
    }
    setTimeout(() => setFeedbackToast(null), 4000);
  }

  function declineDecision() {
    setActiveModal(null);
    setFeedbackToast("A decision was not recorded.");
    setTimeout(() => setFeedbackToast(null), 4000);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {feedbackToast ? (
        <div className="fixed top-5 right-5 z-50 bg-[#09192e] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{feedbackToast}</span>
        </div>
      ) : null}

      <PageHeader
        title="Application Scrutiny Review"
        description="Verify submitted project documents and issue a department query. Decisions are not recorded on this page."
        badge={<Badge variant="outline" className="font-mono text-xs bg-white text-slate-800">{applicationId}</Badge>}
        breadcrumbs={[
          { label: "Command Center", href: "/officer-dashboard" },
          { label: "Scrutiny Queue", href: "/officer-applications" },
          { label: applicationId },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setActiveModal("clarify")} variant="outline" className="text-xs h-8 text-amber-700 border-amber-300 hover:bg-amber-50">
            Request Clarification
          </Button>
          <Button size="sm" onClick={() => setActiveModal("reject")} variant="outline" className="text-xs h-8 text-rose-700 border-rose-300 hover:bg-rose-50">
            Reject Application
          </Button>
          <Button size="sm" onClick={() => setActiveModal("approve")} className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Grant Approval
          </Button>
        </div>
      </PageHeader>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Applicant</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{applicantName}</span>
            <span className="text-slate-500">{applicantEmail}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Project Unit</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">{projectName}</span>
            <span className="text-slate-500">{location}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Approval Under Review</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">
              {workflows.map((workflow) => workflow.approvalName).join(", ") || "Not recorded"}
            </span>
            <span className="text-slate-500">{workflows[0]?.departmentName ?? "Not recorded"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px] uppercase tracking-wider">Statutory SLA Status</span>
            <span className="font-bold text-slate-900 text-sm mt-0.5 block">Not recorded</span>
            <span className="text-slate-500">Application status: {applicationStatus}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Risk Signals</h3>
            <p className="text-xs text-slate-500">Not recorded.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">Department workflow</span>
            {workflows.map((workflow) => (
              <p key={workflow.id} className="text-[11px] text-slate-500">
                {workflow.departmentName}: workflow {workflow.status}, approval {workflow.approvalStatus}.
              </p>
            ))}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Document Scrutiny Matrix</h3>
              <span className="text-xs text-slate-500">{documents.length} stored</span>
            </div>
            <div className="space-y-2 text-xs">
              {documents.length === 0 ? (
                <p className="text-slate-500">No documents stored for this application.</p>
              ) : documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 block">{document.name}</span>
                      <span className="text-[11px] text-slate-500">{document.fileName}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px]">Uploaded</Badge>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Application Scrutiny Progression</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="text-slate-800 font-medium">Application submitted</span>
                <span className="text-slate-400 font-mono text-[11px] ml-auto">{submittedAt}</span>
              </div>
              {queries.map((query) => (
                <div key={query.id} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span className="text-slate-800 font-medium">Query: {query.body}</span>
                    <span className="text-slate-400 font-mono text-[11px] ml-auto">{query.status}</span>
                  </div>
                  {query.responseBody ? (
                    <div className="flex items-center gap-3 pl-7">
                      <span className="text-slate-600">Response: {query.responseBody}</span>
                    </div>
                  ) : null}
                </div>
              ))}
              <div className="flex items-center gap-3 opacity-60">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-slate-300 ml-0.5 shrink-0" />
                <span className="text-slate-600">Final statutory decision</span>
                <span className="text-slate-400 font-mono text-[11px] ml-auto">Not recorded</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {activeModal === "clarify" ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Issue Department Clarification Query</h3>
                <p className="text-xs text-slate-500">File: {applicationId}</p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <label className="block font-medium text-slate-700">Department workflow</label>
              <select
                value={workflowId}
                onChange={(event) => setWorkflowId(event.target.value)}
                className="w-full p-2 rounded-lg border border-slate-300 text-xs"
              >
                {workflows.map((workflow) => (
                  <option key={workflow.id} value={workflow.id}>
                    {workflow.departmentName} · {workflow.approvalName}
                  </option>
                ))}
              </select>
              <label className="block font-medium text-slate-700">Official Query Note</label>
              <textarea
                rows={4}
                value={clarificationText}
                onChange={(event) => setClarificationText(event.target.value)}
                className="w-full p-3 rounded-lg border border-slate-300 text-xs text-slate-800 leading-relaxed"
              />
              <p className="text-[11px] text-slate-500">
                This records a question. It does not approve the application or record a receipt.
              </p>
            </div>
            <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={() => void sendQuery()} disabled={pending || !clarificationText.trim()} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                Send Query Notice
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "approve" ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Grant approval</h3>
            <p className="text-xs text-slate-600 mt-2">A decision is not recorded in this phase.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={declineDecision} className="text-xs">Close</Button>
            </div>
          </div>
        </div>
      ) : null}

      {activeModal === "reject" ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900">Record rejection</h3>
            <p className="text-xs text-slate-600 mt-2">A decision is not recorded in this phase.</p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="text-xs">Cancel</Button>
              <Button size="sm" onClick={declineDecision} className="text-xs">Close</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
