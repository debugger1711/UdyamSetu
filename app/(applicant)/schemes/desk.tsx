"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  Filter,
  Info,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { evaluateSchemeEligibility, type EligibilityOutcome } from "@/lib/schemes/eligibility";

export type SchemeCard = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  authority: string | null;
  rules: unknown;
};

export type ProjectCard = {
  id: string;
  name: string;
  entityName: string | null;
  location: string | null;
  pollutionCategory: string;
  landClassification: string | null;
  sector: string;
  stage: string;
};

export type ClaimCard = {
  id: string;
  schemeId: string;
  projectId: string;
  status: string;
};

const OUTCOME_LABEL: Record<EligibilityOutcome, string> = {
  eligible: "Eligible",
  not_eligible: "Not eligible",
  insufficient_data: "Insufficient data",
};

const OUTCOME_CLASS: Record<EligibilityOutcome, string> = {
  eligible: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_eligible: "bg-slate-50 text-slate-700 border-slate-200",
  insufficient_data: "bg-amber-50 text-amber-700 border-amber-200",
};

export function SchemeDesk({
  schemes,
  projects,
  claims,
}: {
  schemes: SchemeCard[];
  projects: ProjectCard[];
  claims: ClaimCard[];
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [authorityFilter, setAuthorityFilter] = useState("all");
  const [selected, setSelected] = useState<SchemeCard | null>(null);
  const [eligibilityScheme, setEligibilityScheme] = useState<SchemeCard | null>(null);
  const [compare, setCompare] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [applyScheme, setApplyScheme] = useState<SchemeCard | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const project = projects.find((item) => item.id === projectId) ?? null;
  const authorities = Array.from(new Set(schemes.map((scheme) => scheme.authority).filter((value): value is string => Boolean(value))));
  const visible = authorityFilter === "all"
    ? schemes
    : schemes.filter((scheme) => (scheme.authority ?? "").toLowerCase().includes(authorityFilter.toLowerCase()));

  function outcomeFor(scheme: SchemeCard) {
    if (!project) {
      return { outcome: "insufficient_data" as const, reasons: ["No project is recorded."] };
    }
    return evaluateSchemeEligibility(true, scheme.rules, {
      pollutionCategory: project.pollutionCategory,
      landClassification: project.landClassification,
      sector: project.sector,
      stage: project.stage,
    });
  }

  const evaluated = visible.map((scheme) => ({ scheme, result: outcomeFor(scheme) }));
  const eligibleCount = evaluated.filter((item) => item.result.outcome === "eligible").length;
  const blockedCount = evaluated.filter((item) => item.result.outcome !== "eligible").length;
  const recommended = evaluated.find((item) => item.result.outcome === "eligible") ?? null;

  function claimFor(schemeId: string) {
    return claims.find((claim) => claim.schemeId === schemeId && claim.projectId === projectId) ?? null;
  }

  async function confirm() {
    if (!applyScheme || !project) return;
    const result = outcomeFor(applyScheme);
    if (result.outcome !== "eligible") {
      setError(result.reasons[0] ?? "This scheme cannot be claimed.");
      return;
    }
    setPending(true);
    setError(null);
    const response = await fetch(`/api/schemes/${applyScheme.id}/applications`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    const payload = await response.json().catch(() => null) as { claimId?: string } | null;
    if (!response.ok || !payload?.claimId) {
      setError("This scheme claim cannot be submitted.");
      setPending(false);
      return;
    }
    setReference(payload.claimId);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support & Incentives Available to You"
        description={schemes.length === 0 ? "No incentive scheme is configured." : `${schemes.length} configured scheme${schemes.length === 1 ? "" : "s"}. Eligibility uses stored project fields only.`}
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Schemes & Incentives" }]}
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setFilterOpen(true)} className="text-xs h-8 gap-1.5 border-slate-300">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            Refine eligibility
          </Button>
          <Button size="sm" onClick={() => setCompare(true)} className="text-xs h-8 gap-1.5 bg-[#09192e] hover:bg-[#0f243e] text-white">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Compare schemes
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Estimated opportunity</span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><TrendingUp className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">Not recorded</div>
          <p className="text-[11px] text-slate-500 mt-0.5">No subsidy amount is configured</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Configured schemes</span>
            <div className="h-7 w-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Sparkles className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{schemes.length}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Reference rows only</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Eligible to claim</span>
            <div className="h-7 w-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{eligibleCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">For the selected project</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Not ready</span>
            <div className="h-7 w-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center"><Clock className="h-4 w-4" /></div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{blockedCount}</div>
          <p className="text-[11px] text-slate-500 mt-0.5">Missing data or not eligible</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Configured schemes ({visible.length})</h2>
            <span className="text-xs text-slate-500">{project ? project.name : "No project recorded"}</span>
          </div>
          {evaluated.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-500">No scheme is configured.</div>
          ) : evaluated.map(({ scheme, result }) => {
            const claim = claimFor(scheme.id);
            return (
              <div key={scheme.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900">{scheme.name}</h3>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${OUTCOME_CLASS[result.outcome]}`}>{claim ? "Submitted" : OUTCOME_LABEL[result.outcome]}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{scheme.authority ?? "Not recorded"}</p>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-slate-600">Not scored</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">{scheme.description ?? "No description is configured."}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 rounded-lg p-3 mb-4 text-xs">
                  <div><span className="text-slate-500 block text-[11px]">Potential Benefit</span><span className="font-bold text-slate-900">Not recorded</span></div>
                  <div><span className="text-slate-500 block text-[11px]">Incentive Type</span><span className="font-semibold text-slate-800">Not recorded</span></div>
                  <div><span className="text-slate-500 block text-[11px]">Submission Window</span><span className="font-semibold text-slate-800">Not recorded</span></div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEligibilityScheme(scheme)} className="text-xs font-medium text-teal-700 hover:text-teal-800 underline underline-offset-2 flex items-center gap-1">
                      <Info className="h-3.5 w-3.5" />
                      Why am I eligible?
                    </button>
                    <span className="text-slate-300">•</span>
                    <button type="button" onClick={() => setSelected(scheme)} className="text-xs font-medium text-slate-600 hover:text-slate-900">View scheme details</button>
                  </div>
                  <Button size="sm" onClick={() => { setApplyScheme(scheme); setReference(null); setError(null); }} className="text-xs h-8 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1">
                    Start application
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className="rounded-lg bg-slate-100 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
            <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
            <div>Subsidy amounts, match scores, and statutory entitlements are not configured. A claim is not an approval.</div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-[#09192e] to-[#0f2d52] rounded-xl p-5 text-white shadow-sm">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
              <Award className="h-4 w-4" />
              Recommended Next Step
            </div>
            {recommended ? (
              <>
                <h3 className="text-base font-bold leading-snug mb-2">{recommended.scheme.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">The selected project matches the configured rule. No benefit amount is stored.</p>
                <Button size="sm" onClick={() => { setApplyScheme(recommended.scheme); setReference(null); setError(null); }} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold text-xs h-8">Start claim</Button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold leading-snug mb-2">No scheme is ready to claim</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Eligibility stays insufficient until a scheme rule and the required project fields are both recorded.</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Why you match</h3>
            <p className="text-xs text-slate-500 mb-3">{project ? project.name : "No project is recorded"}</p>
            <ul className="space-y-2.5 text-xs">
              {(recommended ? recommended.result.reasons : ["No eligibility rule is configured."]).map((reason) => (
                <li key={reason} className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {eligibilityScheme ? (
        <Modal title={eligibilityScheme.name} subtitle={eligibilityScheme.authority ?? "Not recorded"} onClose={() => setEligibilityScheme(null)}>
          <div className="space-y-2">
            {outcomeFor(eligibilityScheme).reasons.map((reason) => (
              <div key={reason} className="flex items-center gap-2 p-2 rounded-md bg-slate-50 border border-slate-200 text-slate-800">
                <Check className="h-4 w-4 shrink-0" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}
      {selected ? (
        <Modal title={selected.name} subtitle={selected.authority ?? "Not recorded"} onClose={() => setSelected(null)}>
          <p className="text-slate-600">{selected.description ?? "No description is configured."}</p>
          <p className="text-slate-500">Benefit amount, deadline, and disbursement are not recorded.</p>
        </Modal>
      ) : null}
      {compare ? (
        <Modal title="Compare schemes" subtitle={project ? project.name : "No project recorded"} onClose={() => setCompare(false)} wide>
          {visible.length === 0 ? <p className="text-slate-500">No scheme is configured.</p> : (
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <th className="p-3 font-semibold">Scheme</th>
                  <th className="p-3 font-semibold">Authority</th>
                  <th className="p-3 font-semibold">Eligibility</th>
                </tr>
              </thead>
              <tbody>
                {evaluated.slice(0, 3).map(({ scheme, result }) => (
                  <tr key={scheme.id} className="border-b border-slate-100">
                    <td className="p-3">{scheme.name}</td>
                    <td className="p-3">{scheme.authority ?? "Not recorded"}</td>
                    <td className="p-3">{OUTCOME_LABEL[result.outcome]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      ) : null}
      {filterOpen ? (
        <Modal title="Refine Scheme Eligibility" subtitle="Choose a project and an authority" onClose={() => setFilterOpen(false)}>
          <label className="block text-slate-700 font-medium mb-1">Project</label>
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)} className="w-full p-2 rounded-md border border-slate-300 text-xs mb-3">
            {projects.length === 0 ? <option value="">No project recorded</option> : projects.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
          <label className="block text-slate-700 font-medium mb-1">Authority</label>
          <select value={authorityFilter} onChange={(event) => setAuthorityFilter(event.target.value)} className="w-full p-2 rounded-md border border-slate-300 text-xs">
            <option value="all">All configured schemes</option>
            {authorities.map((authority) => <option key={authority} value={authority}>{authority}</option>)}
          </select>
        </Modal>
      ) : null}
      {applyScheme ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            {reference ? (
              <div className="text-center py-6 space-y-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto"><CheckCircle2 className="h-7 w-7" /></div>
                <h3 className="text-base font-bold text-slate-900">Scheme claim submitted</h3>
                <p className="text-xs text-slate-600">Reference: <strong className="font-mono">{reference}</strong>. The claim is not approved.</p>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Apply for {applyScheme.name}</h3>
                    <p className="text-xs text-slate-500">{OUTCOME_LABEL[outcomeFor(applyScheme).outcome]}</p>
                  </div>
                  <button type="button" onClick={() => setApplyScheme(null)} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3 text-xs mb-5">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Applicant:</span><span>{project?.entityName || project?.name || "Not recorded"}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Project Location:</span><span>{project?.location || "Not recorded"}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-slate-500">Claim Value:</span><span>Not recorded</span></div>
                  </div>
                  <div className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 flex items-center gap-2">
                    <FileCheck className="h-4 w-4 shrink-0" />
                    <span>{outcomeFor(applyScheme).reasons[0]}</span>
                  </div>
                  {error ? <p className="text-amber-700">{error}</p> : null}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setApplyScheme(null)} className="text-xs">Cancel</Button>
                  <Button size="sm" disabled={pending || outcomeFor(applyScheme).outcome !== "eligible" || Boolean(claimFor(applyScheme.id))} onClick={() => void confirm()} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
                    Submit Scheme Claim
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

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`bg-white rounded-xl shadow-xl border border-slate-200 w-full p-6 ${wide ? "max-w-4xl" : "max-w-lg"}`}>
        <div className="flex items-start justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 text-xs">{children}</div>
        <div className="mt-6 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Close</Button>
        </div>
      </div>
    </div>
  );
}
