"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck2,
  Clock,
  FileSearch,
  Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";

export type OfficerQueueCard = {
  id: string;
  project: string;
  applicant: string;
  location: string;
  approvalType: string;
  statusLabel: string;
  submittedOn: string;
};

export function OfficerQueue({
  items,
  departments,
  inspectionCount,
  overdueCount,
}: {
  items: OfficerQueueCard[];
  departments: string[];
  inspectionCount: number;
  overdueCount: number;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const filtered = items.filter((item) => {
    const haystack = `${item.project} ${item.applicant} ${item.id}`.toLowerCase();
    return haystack.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Industrial Approvals Command Center"
        description="Department queue for applications submitted to your assigned department."
        badge={
          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
            {departments.length > 0 ? departments.join(", ") : "No department assigned"}
          </Badge>
        }
        breadcrumbs={[
          { label: "Government Console" },
          { label: "Command Center" },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Applications</span>
            <FileSearch className="h-4 w-4 text-[#09192e]" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{items.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Submitted to your department</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-3xl font-extrabold text-teal-700">{items.length}</div>
          <p className="text-[11px] text-teal-600 mt-1">Approval decisions are not recorded</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm border-amber-200 bg-amber-50/20">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">SLA At Risk</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600">{overdueCount}</div>
          <p className="text-[11px] text-amber-700 mt-1">Configured deadlines only. None are configured until a duration is stored.</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Inspections Today</span>
            <CalendarCheck2 className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-3xl font-extrabold text-purple-700">{inspectionCount}</div>
          <p className="text-[11px] text-purple-600 mt-1">Scheduled or assigned in your department</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Department Queue</h3>
            <p className="text-xs text-slate-500 mt-0.5">Applications with a workflow for your department.</p>
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search unit, applicant, file..."
              className="pl-7 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2.5" />
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="p-4 text-xs text-slate-500">No applications have been submitted to your department.</p>
          ) : filtered.map((item) => (
            <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{item.project}</h4>
                  <Badge variant="outline" className="text-[10px]">{item.statusLabel}</Badge>
                  <span className="font-mono text-xs text-slate-500">{item.id}</span>
                </div>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-y-1 gap-x-3">
                  <span>Applicant: <strong>{item.applicant}</strong></span>
                  <span>•</span>
                  <span>{item.location}</span>
                  <span>•</span>
                  <span className="font-medium text-teal-800">{item.approvalType}</span>
                </div>
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-1 max-w-2xl">
                  Risk signal: Not recorded. Submitted {item.submittedOn}.
                </div>
              </div>
              <div className="flex md:flex-col items-center md:items-end justify-between gap-2 shrink-0">
                <div className="text-right">
                  <span className="text-xs font-bold block text-slate-700">Not recorded</span>
                  <span className="text-[10px] text-slate-400">Statutory SLA</span>
                </div>
                <Link href={`/officer-applications/${item.id}`}>
                  <Button size="sm" className="text-xs h-8 px-3 bg-[#09192e] hover:bg-[#0f243e] text-white gap-1">
                    Open Dossier
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
