"use client";

import { useState } from "react";
import { Calendar, CheckCircle2, Clock, MapPin, User, X } from "lucide-react";
import { formatTimestamp } from "@/lib/sla/state";

export type InspectionCard = {
  id: string;
  scheduledAt: string;
  status: string;
  location: string | null;
  departmentName: string;
  approvalName: string;
  officerName: string | null;
};

function monthGrid(anchor: Date, marks: Set<number>) {
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; marked: boolean }> = [];
  for (let index = 0; index < startOffset; index += 1) cells.push({ day: null, marked: false });
  for (let day = 1; day <= days; day += 1) cells.push({ day, marked: marks.has(day) });
  while (cells.length % 7 !== 0) cells.push({ day: null, marked: false });
  return cells;
}

export function InspectionDesk({ inspections }: { inspections: InspectionCard[] }) {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const upcoming = [...inspections]
    .filter((item) => item.status === "scheduled" || item.status === "assigned")
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt))[0] ?? null;
  const anchor = upcoming ? new Date(upcoming.scheduledAt) : new Date();
  const marks = new Set<number>();
  for (const inspection of inspections) {
    const date = new Date(inspection.scheduledAt);
    if (date.getMonth() === anchor.getMonth() && date.getFullYear() === anchor.getFullYear()) {
      marks.add(date.getDate());
    }
  }
  const cells = monthGrid(anchor, marks);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(anchor);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-5">
      {toast ? (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-xl border border-teal-500/40 bg-[#091a2e] text-white px-4 py-2.5 shadow-2xl text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-teal-400" />
          <span>{toast}</span>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Shared Site Visit Planning</span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">Inspection Coordination</h1>
          <p className="text-xs text-slate-500 mt-0.5">Inspections recorded for your applications.</p>
        </div>
        <button
          onClick={() => setScheduleOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs"
        >
          <Calendar className="h-3.5 w-3.5 text-teal-400" />
          <span>Schedule inspection</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="text-center text-xs font-bold text-slate-900 mb-4">{monthLabel}</div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((label) => (
              <span key={label} className="text-[10px] font-bold text-slate-400 py-1">{label}</span>
            ))}
            {cells.map((cell, index) => (
              <span
                key={`${cell.day ?? "empty"}-${index}`}
                className={`py-2.5 ${cell.marked ? "rounded-lg border-2 border-teal-500 bg-teal-50/50 font-bold text-teal-800" : "text-slate-700"}`}
              >
                {cell.day ?? ""}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-[#0e2a47] text-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Next Inspection</span>
              <span className="rounded-full bg-teal-400/20 border border-teal-400/40 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                {upcoming ? upcoming.status : "Not recorded"}
              </span>
            </div>
            {upcoming ? (
              <>
                <h3 className="text-sm font-bold text-white">{upcoming.approvalName}</h3>
                <span className="text-[11px] text-slate-300 block mt-0.5">{upcoming.departmentName}</span>
                <div className="rounded-lg border border-[#1b3b5e] bg-[#0c223a] p-3 text-xs my-4 flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <span className="text-[11px] text-white">{upcoming.location ?? "Not recorded"}</span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-300 border-t border-[#1b3b5e] pt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-teal-400" />
                    <span>{formatTimestamp(upcoming.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-teal-400" />
                    <span>Officer: {upcoming.officerName ?? "Not recorded"}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-300">No inspection is scheduled.</p>
            )}
          </div>
          <div className="flex items-center gap-2.5 pt-4">
            <button
              onClick={() => showToast("Reschedule is not recorded from this page.")}
              className="flex-1 rounded-lg border border-slate-400/40 bg-white/10 py-2 text-xs font-semibold text-white"
            >
              Reschedule
            </button>
            <button
              onClick={() => showToast("Inspection requirements are not recorded.")}
              className="flex-1 rounded-lg bg-[#0b1d35] border border-teal-500/30 py-2 text-xs font-semibold text-white"
            >
              View requirements
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-[#0c223c] text-white p-5 shadow-2xs">
        <h2 className="text-lg font-bold">
          {inspections.length > 1
            ? `${inspections.length} inspections are recorded. A combined visit is not created here.`
            : "No combined inspection is recorded."}
        </h2>
        <div className="grid grid-cols-3 gap-3 pt-4">
          <div>
            <span className="text-2xl font-extrabold block">{inspections.length}</span>
            <span className="text-[10px] text-slate-300">recorded inspections</span>
          </div>
          <div>
            <span className="text-2xl font-extrabold block">—</span>
            <span className="text-[10px] text-slate-300">time saved not recorded</span>
          </div>
          <div>
            <span className="text-2xl font-extrabold block">—</span>
            <span className="text-[10px] text-slate-300">disruption not recorded</span>
          </div>
        </div>
      </div>

      {scheduleOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Coordinate Joint Inspection Window</h3>
              <button onClick={() => setScheduleOpen(false)} className="text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-xs text-slate-600">
              Only a department officer can schedule an inspection. This form does not create one.
            </p>
            <button
              onClick={() => {
                setScheduleOpen(false);
                showToast("Only a department officer can schedule an inspection.");
              }}
              className="mt-4 w-full rounded-lg bg-[#f59e0b] py-2.5 text-xs font-bold text-slate-950"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
