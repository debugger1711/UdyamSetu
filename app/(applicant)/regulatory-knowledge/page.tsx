"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  Coins,
  CheckCircle2,
  AlertCircle,
  FileText,
  Building2,
  Layers,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EMPTY_REGULATORY_ANSWER, type RegulatoryAnswer } from "@/lib/knowledge/answer";

const SUGGESTED_QUERIES = [
  "Do I need an environmental clearance for my manufacturing unit?",
  "Which approvals can run in parallel?",
  "What documents are missing?",
  "When does my licence expire?",
];

export default function RegulatoryKnowledgePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeAnswer, setActiveAnswer] = useState<RegulatoryAnswer>(EMPTY_REGULATORY_ANSWER);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (queryText: string) => {
    const query = queryText.trim();
    if (!query) return;
    setSearchQuery(query);
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json().catch(() => null) as { answer?: RegulatoryAnswer } | null;
      if (res.ok && data?.answer) {
        setActiveAnswer(data.answer);
      } else {
        setActiveAnswer({
          ...EMPTY_REGULATORY_ANSWER,
          headline: "The knowledge base is not available.",
          subheadline: "No answer was invented.",
        });
      }
    } catch {
      setActiveAnswer({
        ...EMPTY_REGULATORY_ANSWER,
        headline: "The knowledge base is not available.",
        subheadline: "No answer was invented.",
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Ask about an approval"
        description="Get clear, contextual guidance based on your project profile and official sources."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Regulatory Knowledge" },
        ]}
      />

      {/* Search / AI Input Card Matching Figma Screenshot 184702 */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="relative flex items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk(searchQuery)}
            placeholder="Ask anything about approvals, requirements, or statutory processes..."
            className="w-full pl-4 pr-36 py-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#09192e] focus:border-transparent text-slate-900 placeholder:text-slate-400 font-medium"
          />
          <div className="absolute right-2 flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => handleAsk(searchQuery)}
              disabled={isLoading}
              className="text-xs h-9 px-4 bg-[#09192e] hover:bg-[#0f243e] text-white font-semibold gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              {isLoading ? "Consulting..." : "Ask UdyamSetu"}
            </Button>
          </div>
        </div>

        {/* Suggested Question Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider">
            Suggested:
          </span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-xs flex items-center gap-1 border border-slate-200/80"
            >
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Layout: Structured Answer (Left 2 cols) + At a Glance (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: 01 to 05 Structured Answer Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Answer Header */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-teal-50 text-teal-700 border-teal-200 text-xs font-semibold">
                Contextual Analysis · {activeAnswer.subheadline}
              </Badge>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-snug">
              {activeAnswer.headline}
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {activeAnswer.subheadline}
            </p>

            {/* 5 Ordered Structured Sections Matching Figma */}
            <div className="mt-6 space-y-6 border-t border-slate-100 pt-6">
              {/* Section 01: Why It Applies */}
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                  01
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Why it applies</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeAnswer.whyItApplies}
                  </p>
                </div>
              </div>

              {/* Section 02: Relevant Authority */}
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                  02
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Relevant authority</h3>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs space-y-1">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="h-4 w-4 text-slate-600" />
                      {activeAnswer.authority.name}
                    </div>
                    <p className="text-slate-600">{activeAnswer.authority.office}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Statutory Basis: {activeAnswer.authority.act}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 03: Required Documents */}
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                  03
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Required documents</h3>
                  <p className="text-xs text-slate-500 mb-2.5">
                    Pre-validated against your project document vault
                  </p>
                  <div className="space-y-2">
                    {activeAnswer.requiredDocs.length === 0 ? (
                      <p className="text-xs text-slate-500">Not recorded</p>
                    ) : null}
                    {activeAnswer.requiredDocs.map((doc, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-white text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-500" />
                          <div>
                            <span className="font-medium text-slate-800">{doc.name}</span>
                            <span className="text-[11px] text-slate-400 block">{doc.note}</span>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            doc.status === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : doc.status === "Needs attention"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 04: Time & Dependencies */}
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                  04
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Time & dependencies</h3>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="leading-relaxed">
                      <strong className="text-slate-900">Statutory SLA: </strong>
                      {activeAnswer.timeAndDependencies.sla}
                    </p>
                    <p className="leading-relaxed">
                      <strong className="text-slate-900">Critical Path: </strong>
                      {activeAnswer.timeAndDependencies.criticalPath}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-500">Can run in parallel with:</span>
                      {activeAnswer.timeAndDependencies.parallelWith.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[11px] border border-teal-100 font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 05: Official Reference */}
              <div className="flex items-start gap-4">
                <span className="text-xs font-mono font-bold text-teal-600 bg-teal-50 px-2 py-1 rounded-md shrink-0">
                  05
                </span>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">Official reference</h3>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-mono text-[11px] text-slate-700">
                      {activeAnswer.officialReference.gazette}
                    </p>
                    <p className="text-slate-500">{activeAnswer.officialReference.rule}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Primary CTA */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Ready to take action on this approval?
              </span>
              <Link href={activeAnswer.actionUrl}>
                <Button
                  size="sm"
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-9 px-4 gap-1.5"
                >
                  {activeAnswer.actionLabel}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Right 1 Col: At A Glance & Statutory Disclaimer */}
        <div className="space-y-4">
          {/* At A Glance Card Matching Figma */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              At a glance
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Estimated time:</span>
                </div>
                <span className="font-bold text-slate-900">
                  {activeAnswer.atAGlance.estimatedTime}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Coins className="h-4 w-4 text-slate-400" />
                  <span>Application fee:</span>
                </div>
                <span className="font-bold text-slate-900">
                  {activeAnswer.atAGlance.applicationFee}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <CheckCircle2 className="h-4 w-4 text-slate-400" />
                  <span>Your readiness:</span>
                </div>
                <span className="font-bold text-teal-700">
                  {activeAnswer.atAGlance.readiness}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="h-4 w-4 text-slate-400" />
                  <span>Risk level:</span>
                </div>
                <Badge
                  className={`text-[10px] font-semibold ${
                    activeAnswer.atAGlance.riskLevel === "Low"
                      ? "bg-emerald-100 text-emerald-800"
                      : activeAnswer.atAGlance.riskLevel === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : activeAnswer.atAGlance.riskLevel === "High"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {activeAnswer.atAGlance.riskLevel}
                </Badge>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100">
              <Link href="/approvals" className="w-full block">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 border-slate-300 gap-1"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-500" />
                  View Dependency Graph
                </Button>
              </Link>
            </div>
          </div>

          {/* CRITICAL STATUTORY DISCLAIMER (Required in Figma & Prompt Section 18) */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0" />
              Guidance, not a statutory decision
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Regulatory information is provided as guidance. Final applicability and decisions
              remain with the competent statutory authority under applicable acts and rules.
            </p>
          </div>

          {/* AI Grounding Context */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Scale className="h-3.5 w-3.5 text-teal-600" />
              Grounding Sources
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
              {activeAnswer.citations.length === 0 ? (
                <p>No regulatory source is recorded.</p>
              ) : activeAnswer.citations.map((citation) => (
                <p key={citation.chunkId}>{citation.sourceLabel}: {citation.title}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
