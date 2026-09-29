"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

const FAQS = [
  {
    q: "Does parallel processing record a time saving?",
    a: "A time-saved figure is not recorded. The approval map lists the approvals stored for the application. Pending means the approval has not been decided.",
  },
  {
    q: "What happens if a department deadline passes?",
    a: "A statutory processing duration is not recorded for these approvals. The system shows a technical SLA only when a start time and deadline have been stored on the workflow.",
  },
  {
    q: "How are inspections recorded?",
    a: "An inspection is stored against a department workflow when an officer creates one. A visit is not combined or scheduled automatically.",
  },
  {
    q: "Are uploaded documents treated as verified?",
    a: "No. A document stored for your application has the status uploaded. Upload does not mean the document has been verified.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Facilitation Center"
        description="Guidance for the applicant workspace. Contact details are shown only when a source is recorded."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Help" },
        ]}
      />

      {/* District Facilitation Desks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Investor contact</h4>
              <span className="text-[11px] text-slate-500">Not recorded</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Not recorded
          </p>
          <div className="pt-1 text-xs text-teal-700 font-semibold flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Not recorded
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Helpline</h4>
              <span className="text-[11px] text-slate-500">Not recorded</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Not recorded
          </p>
          <div className="pt-1 text-xs text-teal-700 font-semibold flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5" />
            Not recorded
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Technical support</h4>
              <span className="text-[11px] text-slate-500">Not recorded</span>
            </div>
          </div>
          <p className="text-xs text-slate-600">
            Not recorded
          </p>
          <div className="pt-1 text-xs text-teal-700 font-semibold flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5" />
            Not recorded
          </div>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">Frequently Asked Questions</h3>
            <p className="text-xs text-slate-500">
              Guidance on statutory single window clearance processes in Maharashtra
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800"
            />
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between text-left gap-3 text-xs font-semibold text-slate-900 hover:text-teal-700"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${
                      isOpen ? "rotate-180 text-teal-700" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200/80 animate-in fade-in-50">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
