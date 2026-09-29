"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type MessageQuery = {
  id: string;
  applicationId: string;
  departmentName: string;
  approvalName: string;
  body: string;
  status: string;
  createdAt: string;
  responseBody: string | null;
  responseCreatedAt: string | null;
};

function when(value: string | null): string {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString("en-IN");
}

export function MessagesDesk({ queries }: { queries: MessageQuery[] }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(queries[0]?.id ?? "");
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const active = queries.find((query) => query.id === activeId) ?? queries[0] ?? null;

  async function send() {
    if (!active || !inputText.trim() || active.status !== "open") return;
    setPending(true);
    setError(null);
    const response = await fetch(`/api/queries/${active.id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: inputText }),
    });
    setPending(false);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(typeof payload?.error === "string" ? payload.error : "Response could not be stored.");
      return;
    }
    setInputText("");
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-3 h-[600px]">
      <div className="border-r border-slate-200 flex flex-col h-full bg-slate-50/50">
        <div className="p-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Official Channels
            </span>
            <Badge variant="outline" className="text-[10px]">
              {queries.length} Active
            </Badge>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search departments..."
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-300 text-xs bg-slate-50 focus:outline-none focus:bg-white text-slate-800"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {queries.length === 0 ? (
            <p className="p-3.5 text-xs text-slate-500">No department queries are recorded.</p>
          ) : queries.map((query) => (
            <button
              key={query.id}
              onClick={() => setActiveId(query.id)}
              className={`w-full text-left p-3.5 transition-colors relative ${
                query.id === active?.id ? "bg-white border-l-4 border-l-[#09192e] shadow-xs" : "hover:bg-slate-100/70"
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-slate-900 truncate pr-4">{query.departmentName}</span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">{query.status}</span>
              </div>
              <div className="text-[11px] text-slate-600 font-medium mb-1">Officer name not recorded</div>
              <p className="text-[11px] text-slate-500 line-clamp-1">{query.body}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 flex flex-col h-full bg-white">
        {active ? (
          <>
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">{active.departmentName}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">Officer name not recorded · {active.approvalName}</p>
                <span className="text-[11px] font-mono text-teal-700">Ref: {active.applicationId}</span>
              </div>
              <Badge variant="outline" className="text-[10px]">{active.status}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
              <div className="flex justify-start">
                <div className="max-w-md rounded-xl rounded-bl-none border border-slate-200 bg-white p-3.5 text-xs text-slate-800 shadow-xs space-y-1">
                  <div className="text-[10px] font-semibold text-slate-500 flex items-center justify-between gap-3">
                    <span>Department</span>
                    <span className="font-mono">{when(active.createdAt)}</span>
                  </div>
                  <p className="leading-relaxed">{active.body}</p>
                </div>
              </div>
              {active.responseBody ? (
                <div className="flex justify-end">
                  <div className="max-w-md rounded-xl rounded-br-none bg-[#09192e] p-3.5 text-xs text-white shadow-xs space-y-1">
                    <div className="text-[10px] font-semibold text-slate-300 flex items-center justify-between gap-3">
                      <span>Applicant</span>
                      <span className="font-mono">{when(active.responseCreatedAt)}</span>
                    </div>
                    <p className="leading-relaxed">{active.responseBody}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="p-3 border-t border-slate-200 bg-white space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void send();
                  }}
                  disabled={active.status !== "open" || pending}
                  placeholder={active.status === "open" ? "Type official reply or compliance clarification..." : "This query is not open."}
                  className="flex-1 px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#09192e] disabled:bg-slate-50"
                />
                <Button
                  size="sm"
                  onClick={() => void send()}
                  disabled={active.status !== "open" || pending || !inputText.trim()}
                  className="bg-[#09192e] hover:bg-[#0f243e] text-white text-xs h-9 px-4 gap-1.5 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </div>
              {error ? <p className="text-[11px] text-rose-700">{error}</p> : null}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
            No department queries are recorded.
          </div>
        )}
      </div>
    </div>
  );
}
