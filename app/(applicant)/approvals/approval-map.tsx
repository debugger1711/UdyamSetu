"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Download,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  FileCheck,
  Building2,
  FileText,
  Filter,
  Info,
  ShieldCheck,
  Zap,
  Flame,
  ChevronRight,
  X,
} from "lucide-react";
import type { StructuredApproval } from "@/lib/approvals/checklist";

type ApprovalMapProps = {
  approvals: StructuredApproval[];
  projectName: string;
  applicationId: string;
};

export default function ApprovalMap({ approvals, projectName, applicationId }: ApprovalMapProps) {
  // State
  const [selectedApprovalId, setSelectedApprovalId] = useState<string>(approvals[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<"map" | "list">("map");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [recommendationModal, setRecommendationModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Find currently selected approval
  const selectedApproval = useMemo(() => {
    return approvals.find((a) => a.id === selectedApprovalId) || approvals[0];
  }, [approvals, selectedApprovalId]);

  // Compute filtered approvals
  const filteredApprovals = useMemo(() => {
    return approvals.filter((appr) => {
      // Category filter matching
      let matchesCategory = true;
      if (selectedCategory === "Foundation") {
        matchesCategory = appr.category === "Land & Building";
      } else if (selectedCategory === "Land & Building") {
        matchesCategory = appr.category === "Land & Building";
      } else if (selectedCategory === "Environment") {
        matchesCategory = appr.category === "Environment & Pollution";
      } else if (selectedCategory === "Operations") {
        matchesCategory = appr.category === "Operational";
      } else if (selectedCategory === "Labour") {
        matchesCategory = appr.category === "Labour & Welfare";
      } else if (selectedCategory === "Utilities") {
        matchesCategory = appr.category === "Utilities & Power";
      } else if (selectedCategory === "Safety") {
        matchesCategory = appr.category === "Safety & Fire";
      } else if (selectedCategory !== "All") {
        matchesCategory = appr.category === selectedCategory;
      }

      // Status filter matching
      let matchesStatus = true;
      if (selectedStatus === "Completed") {
        matchesStatus = appr.status === "Completed";
      } else if (selectedStatus === "In Progress") {
        matchesStatus = appr.status === "In Progress";
      } else if (selectedStatus === "Ready to Apply") {
        matchesStatus = appr.status === "Ready to Apply";
      } else if (selectedStatus === "Action Required") {
        matchesStatus = appr.riskLevel === "High";
      } else if (selectedStatus === "Department Review") {
        matchesStatus = appr.status === "In Progress";
      } else if (selectedStatus !== "All") {
        matchesStatus = appr.status === selectedStatus;
      }

      return matchesCategory && matchesStatus;
    });
  }, [approvals, selectedCategory, selectedStatus]);

  // Check if an individual approval matches the active filters (for highlighting in graph)
  const isMatchInGraph = (approvalId: string) => {
    return filteredApprovals.some((a) => a.id === approvalId);
  };

  // KPI Calculations
  const totalCount = approvals.length;
  const readyCount = approvals.filter((a) => a.status === "Ready to Apply").length;
  const inProgressCount = approvals.filter((a) => a.status === "In Progress").length;
  const actionRequiredCount = approvals.filter((a) => a.riskLevel === "High").length;
  const deptReviewCount = inProgressCount;

  // Resolve dependencies names
  const dependencyNames = useMemo(() => {
    if (!selectedApproval || !selectedApproval.dependencies || selectedApproval.dependencies.length === 0) {
      return [];
    }
    return selectedApproval.dependencies.map((depId) => {
      const depAppr = approvals.find((a) => a.id === depId);
      return {
        id: depId,
        name: depAppr ? depAppr.name : depId,
        status: depAppr ? depAppr.status : "Pending",
      };
    });
  }, [selectedApproval, approvals]);

  // Target application URL
  const continueUrl = `/applications/${applicationId}`;

  if (!selectedApproval) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 flex items-center gap-2 rounded-xl border border-teal-500/40 bg-[#091a2e] text-white px-4 py-2.5 shadow-2xl animate-in slide-in-from-top-4 duration-200 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
            Personalised Approval Intelligence
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-0.5">
            Your Approval Map
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Based on {projectName}. {totalCount} required approvals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => showToast("Approval blueprint exported as compliance package PDF.")}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export map</span>
          </button>
          <Link
            href={continueUrl}
            className="flex items-center gap-1.5 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] px-3.5 py-1.5 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-teal-400" />
            <span>Continue application</span>
          </Link>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-cyan-700" />
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{totalCount}</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Total approvals</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">For this application</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-600" />
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{readyCount}</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Ready to apply</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Dossiers prepared</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{inProgressCount}</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">In progress</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Within statutory SLA</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 relative overflow-hidden shadow-2xs">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{actionRequiredCount}</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Applicant action</span>
          <span className="text-[10px] text-amber-600 font-medium block mt-0.5">Not started</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3.5 relative overflow-hidden shadow-2xs col-span-2 sm:col-span-1">
          <div className="absolute top-0 left-0 right-0 h-1 bg-blue-600" />
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{deptReviewCount}</span>
          <span className="text-xs font-semibold text-slate-700 block mt-0.5">Department review</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Not recorded</span>
        </div>
      </div>

      {/* UdyamSetu Insight Banner (Dark Navy/Teal Banner) */}
      <div className="rounded-xl border border-teal-500/30 bg-[#0e2a47] p-4 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-400/20 text-teal-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 block">
              UdyamSetu Parallel Processing Engine
            </span>
            <h3 className="text-sm font-bold text-white mt-0.5">
              Parallel approvals
            </h3>
            <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
              Time saved is not recorded. A stored SLA duration is required before a day count can be shown.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
          <div className="text-right">
            <span className="text-2xl font-extrabold text-[#f59e0b] block leading-none">
              —
            </span>
            <span className="text-[10px] text-slate-300 block">Not recorded</span>
          </div>
          <button
            onClick={() => setRecommendationModal(true)}
            className="rounded-lg bg-white hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-2 text-xs transition-colors shadow-sm cursor-pointer"
          >
            View recommendation
          </button>
        </div>
      </div>

      {/* Controls Bar: Tabs & Functional Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Toggle between Dependency map and Detailed list */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 text-xs shadow-2xs">
          <button
            onClick={() => {
              setActiveTab("map");
              showToast("Switched to Dependency Map view");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "map"
                ? "bg-[#0b1d35] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Dependency map</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("list");
              showToast("Switched to Detailed List view");
            }}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "list"
                ? "bg-[#0b1d35] text-white shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Detailed list</span>
          </button>
        </div>

        {/* Dynamic Interactive Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                showToast(`Filter applied: ${e.target.value} categories`);
              }}
              className="appearance-none rounded-lg border border-slate-200 bg-white pl-7 pr-8 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">All categories</option>
              <option value="Foundation">Foundation</option>
              <option value="Land & Building">Land & Building</option>
              <option value="Environment">Environment & Pollution</option>
              <option value="Safety">Safety & Fire</option>
              <option value="Utilities">Utilities & Power</option>
              <option value="Labour">Labour & Welfare</option>
              <option value="Operations">Operational</option>
            </select>
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                showToast(`Filter applied: ${e.target.value} status`);
              }}
              className="appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-8 py-1.5 text-xs text-slate-700 font-medium hover:bg-slate-50 shadow-2xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="All">Status: All</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Ready to Apply">Ready to Apply</option>
              <option value="Action Required">Action Required</option>
              <option value="Department Review">Department Review</option>
            </select>
          </div>

          {/* Reset Filters button if any active */}
          {(selectedCategory !== "All" || selectedStatus !== "All") && (
            <button
              onClick={() => {
                setSelectedCategory("All");
                setSelectedStatus("All");
                showToast("Filters reset to view all approvals.");
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 px-2 py-1.5 rounded-lg border border-teal-200 cursor-pointer"
            >
              <X className="h-3 w-3" />
              <span>Clear filters ({filteredApprovals.length}/{approvals.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Map & Details Area */}
      <div className="grid lg:grid-cols-12 gap-4">
        {/* Left Side: Dependency Map OR Detailed List */}
        <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs min-h-[540px]">
          {activeTab === "map" ? (
            <div>
              {/* Legend & Parallel indicator */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-6 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" /> Completed
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-teal-500" /> In progress
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-600" /> Ready
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Action required
                  </span>
                </div>
                <div className="flex items-center gap-1 text-teal-700 font-semibold text-[11px]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  <span>Can run simultaneously</span>
                </div>
              </div>

              {/* 4 Interactive Columns */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start relative">
                {/* Column 1: Foundation */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Foundation
                  </span>

                  {/* Company Registration (corp-reg) */}
                  {(() => {
                    const appr = approvals.find((a) => a.id === "corp-reg");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === "corp-reg";
                    const isMatched = isMatchInGraph("corp-reg");
                    return (
                      <div
                        onClick={() => setSelectedApprovalId("corp-reg")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <FileText className="h-4 w-4 text-emerald-600" />
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{appr.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                          <span>{appr.status}</span>
                          <span>{appr.documentsRequired > 0 ? `${appr.documentsReady}/${appr.documentsRequired} uploaded` : "Not recorded"}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* MIDC Land Allotment (midc-land) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "MIDC_LAND_ALLOTMENT");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Building2 className="h-4 w-4 text-emerald-600" />
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Land Use Approval</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                          <span>{appr.status}</span>
                          <span>{appr.documentsRequired > 0 ? `${appr.documentsReady}/${appr.documentsRequired} uploaded` : "Not recorded"}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {approvals.filter((item) => ![
                    "MIDC_LAND_ALLOTMENT",
                    "FACTORY_PLAN_DISH",
                    "PCB_CTE",
                    "FIRE_NOC",
                    "POWER_FEASIBILITY",
                    "PCB_CTO",
                  ].includes(item.code)).map((appr) => {
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        key={appr.id}
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Building2 className="h-4 w-4 text-slate-500" />
                          <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{appr.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authority}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Column 2: Land & Building */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Land & Building
                  </span>

                  {/* Site Plan (site-plan) */}
                  {(() => {
                    const appr = approvals.find((a) => a.id === "site-plan");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === "site-plan";
                    const isMatched = isMatchInGraph("site-plan");
                    return (
                      <div
                        onClick={() => setSelectedApprovalId("site-plan")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <FileCheck className="h-4 w-4 text-emerald-600" />
                          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{appr.name}</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                          <span>{appr.status}</span>
                          <span>{appr.documentsRequired > 0 ? `${appr.documentsReady}/${appr.documentsRequired} uploaded` : "Not recorded"}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Building Plan Approval (factory-plan) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "FACTORY_PLAN_DISH");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-teal-50/20 shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Building2 className="h-4 w-4 text-teal-600" />
                          <span className="rounded-full bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Building Plan Approval</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authorityFullName}</span>
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-400">
                          <span>{appr.slaDays > 0 ? `${appr.slaDays} days SLA` : "Not recorded"}</span>
                          <span>{appr.documentsReady}/{appr.documentsRequired} ready</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Column 3: Parallel Track (Figma Highlight Boundary) */}
                <div className="space-y-3 rounded-xl border-2 border-dashed border-teal-400/60 bg-teal-50/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-teal-800 font-bold text-[9px] uppercase tracking-wider mb-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span>Parallel Path · Start Together</span>
                  </div>

                  {/* Consent to Establish (env-cte) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "PCB_CTE");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all shadow-xs ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-white"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <ShieldCheck className="h-4 w-4 text-teal-600" />
                          <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Consent to Establish</h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                          <span>{appr.slaDays > 0 ? `${appr.slaDays} days SLA` : "Not recorded"}</span>
                          <span className="font-semibold text-slate-800">
                            {appr.documentsRequired > 0 ? `${appr.documentsReady}/${appr.documentsRequired} ready` : "Not recorded"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fire NOC (fire-noc) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "FIRE_NOC");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-white"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Flame className="h-4 w-4 text-slate-600" />
                          <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{appr.name}</h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                          <span>{appr.slaDays > 0 ? `${appr.slaDays} days SLA` : "Not recorded"}</span>
                          <span className="font-semibold text-slate-800">{appr.documentsReady}/{appr.documentsRequired} ready</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Electricity Connection (power-sanction) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "POWER_FEASIBILITY");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-white"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Zap className="h-4 w-4 text-amber-500" />
                          <span className="rounded-full bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">{appr.name}</h4>
                        <span className="text-[10px] text-slate-500 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                          <span>{appr.slaDays > 0 ? `${appr.slaDays} days SLA` : "Not recorded"}</span>
                          <span className="font-semibold text-slate-800">{appr.documentsReady}/{appr.documentsRequired} ready</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Column 4: Operations & Labour */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Operations
                  </span>

                  {/* Contract Labour (labour-reg) */}
                  {(() => {
                    const appr = approvals.find((a) => a.id === "labour-reg");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === "labour-reg";
                    const isMatched = isMatchInGraph("labour-reg");
                    return (
                      <div
                        onClick={() => setSelectedApprovalId("labour-reg")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-white shadow-xs"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <FileText className="h-4 w-4 text-slate-600" />
                          <span className="rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-tight">Labour Registration (CLRA)</h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">{appr.authority}</span>
                        <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between text-[10px] text-slate-500">
                          <span>{appr.slaDays > 0 ? `${appr.slaDays} days SLA` : "Not recorded"}</span>
                          <span className="font-semibold text-slate-800">{appr.documentsReady}/{appr.documentsRequired} ready</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Final Operational Approval (env-cto) */}
                  {(() => {
                    const appr = approvals.find((a) => a.code === "PCB_CTO");
                    if (!appr) return null;
                    const isSelected = selectedApprovalId === appr.id;
                    const isMatched = isMatchInGraph(appr.id);
                    return (
                      <div
                        onClick={() => setSelectedApprovalId(appr.id)}
                        className={`p-3 rounded-xl border bg-slate-50/60 cursor-pointer transition-all ${
                          !isMatched ? "opacity-35" : ""
                        } ${
                          isSelected
                            ? "border-teal-600 ring-2 ring-teal-500/30 bg-white shadow-xs"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <CheckCircle2 className="h-4 w-4 text-slate-400" />
                          <span className="rounded-full bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 text-[9px] font-bold">
                            {appr.status}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 leading-tight">
                          Final Operational Approval (CTO)
                        </h4>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Unlocks after core clearances
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : (
            /* DETAILED LIST VIEW (Full Table / Structured Cards) */
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  Showing {filteredApprovals.length} statutory approvals
                </span>
                <span className="text-[11px] text-slate-400">Click any row to inspect in right drawer</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto pr-1">
                {filteredApprovals.map((appr) => {
                  const isSelected = appr.id === selectedApprovalId;
                  return (
                    <div
                      key={appr.id}
                      onClick={() => setSelectedApprovalId(appr.id)}
                      className={`py-3 px-3 rounded-xl transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-teal-50/50 border border-teal-400/80 shadow-2xs"
                          : "hover:bg-slate-50 border border-transparent"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${
                          appr.status === "Completed"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : appr.status === "In Progress"
                            ? "bg-teal-50 text-teal-600 border border-teal-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/approvals/${appr.id}`} className="text-xs font-bold text-slate-900 truncate">{appr.name}</Link>
                            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[9px] font-semibold">
                              {appr.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{appr.authorityFullName}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
                            <span>SLA: <strong className="text-slate-700">{appr.slaDays > 0 ? `${appr.slaDays} days` : "Not recorded"}</strong></span>
                            <span>•</span>
                            <span>Docs: <strong className="text-slate-700">{appr.documentsRequired > 0 ? `${appr.documentsReady}/${appr.documentsRequired} ready` : "Not recorded"}</strong></span>
                            <span>•</span>
                            <span>Risk: <strong className="text-slate-700">Not recorded</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          appr.status === "Completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : appr.status === "In Progress"
                            ? "bg-teal-50 text-teal-700 border border-teal-200"
                            : appr.status === "Ready to Apply"
                            ? "bg-cyan-50 text-cyan-800 border border-cyan-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {appr.status}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedApprovalId(appr.id);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[#0b1d35] text-white"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected ? "Active" : "Inspect"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Selected Approval Detail Drawer (DRIVEN COMPLETELY BY selectedApproval) */}
        <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Selected Approval Dossier
                </span>
                <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {selectedApproval.code}
                </span>
              </div>
              <div className="flex items-start justify-between mt-1 gap-2">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedApproval.name}
                </h3>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                  selectedApproval.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : selectedApproval.status === "In Progress"
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : selectedApproval.status === "Pending"
                    ? "bg-slate-100 text-slate-600 border-slate-200"
                    : "bg-cyan-50 text-cyan-800 border-cyan-200"
                }`}>
                  {selectedApproval.status}
                </span>
              </div>
              <span className="text-xs text-slate-500 block mt-0.5">
                {selectedApproval.authorityFullName || selectedApproval.authority}
              </span>
            </div>

            {/* 4 Detail Metrics */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Estimated time</span>
                <span className="font-bold text-slate-800">{selectedApproval.estimatedDays > 0 ? `${selectedApproval.estimatedDays} days` : "Not recorded"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">SLA statutory cap</span>
                <span className="font-bold text-slate-800">{selectedApproval.slaDays > 0 ? `${selectedApproval.slaDays} days SLA` : "Not recorded"}</span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-slate-400 block">Documents ready</span>
                <span className="font-bold text-slate-800">
                  {selectedApproval.documentsRequired > 0
                    ? `${selectedApproval.documentsReady}/${selectedApproval.documentsRequired} ready`
                    : "Not recorded"}
                </span>
              </div>
              <div className="mt-1">
                <span className="text-[10px] text-slate-400 block">Compliance risk</span>
                <span className="font-bold text-slate-600">
                  Not recorded
                </span>
              </div>
            </div>

            {/* Why is this required? */}
            <div className="space-y-1 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-400" /> Why is this required?
              </span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {selectedApproval.whyItApplies || selectedApproval.description}
              </p>
              <Link
                href="/regulatory-knowledge"
                className="text-[11px] text-cyan-800 font-semibold hover:underline inline-flex items-center gap-1 pt-0.5"
              >
                <span>Ask Regulatory AI assistant</span>
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            {/* Dynamic Dependency Chain */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Statutory Dependency Chain
              </span>
              <div className="space-y-1.5 text-xs">
                {dependencyNames.length > 0 ? (
                  dependencyNames.map((dep, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-bold">
                        ✓
                      </div>
                      <div>
                        <span className="font-semibold text-slate-800">{dep.name}</span>
                        <span className="text-[10px] text-slate-400 block">{dep.status}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-[11px]">No prior dependencies · Independent entry point</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pl-1 pt-1 border-t border-slate-50">
                  <span className="text-slate-400 text-xs">↳</span>
                  <div>
                    <span className="font-semibold text-slate-800">{selectedApproval.name}</span>
                    <span className="text-[10px] text-teal-700 font-medium block">
                      {selectedApproval.nextAction || "Ready to file via UdyamSetu"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Requirements Checklist */}
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-800">Key requirements</span>
                <span className="text-slate-500 font-medium">Not recorded</span>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1 pl-4 list-disc">
                <li>Documents are not stored for this approval yet.</li>
              </ul>
            </div>
          </div>

          {/* Action button at bottom of drawer */}
          <div className="pt-4 border-t border-slate-100 mt-4">
            <Link
              href={continueUrl}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] text-white py-2 text-xs font-semibold shadow-xs transition-colors"
            >
              <span>Continue application</span>
              <ArrowRight className="h-3.5 w-3.5 text-teal-400" />
            </Link>
          </div>
        </div>
      </div>

      {/* Parallel Processing Recommendation Modal */}
      {recommendationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Parallel Approval Path Recommendation
                </h3>
                <p className="text-xs text-teal-700 font-semibold">
                  Durations are not recorded
                </p>
              </div>
              <button
                onClick={() => setRecommendationModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              A statutory duration is not recorded for these approvals. The cards below do not set a processing deadline.
            </p>

            {/* 3 Parallel Approvals Cards */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-[11px]">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Factory Registration</span>
                    <span className="text-[10px] text-slate-500">Directorate of Industrial Safety & Health (DISH)</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                  Not recorded
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-[11px]">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Fire NOC</span>
                    <span className="text-[10px] text-slate-500">State Fire and Rescue Services</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                  Not recorded
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/50 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-600 text-white font-bold text-[11px]">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Electricity Connection</span>
                    <span className="text-[10px] text-slate-500">MSEDCL Industrial 33kV Power Sanction</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                  Not recorded
                </span>
              </div>
            </div>

            {/* Time Saving Banner */}
            <div className="p-3 rounded-xl bg-[#09192e] text-white text-xs space-y-1.5 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Sequential Processing Timeline:</span>
                <span className="font-mono text-slate-300">Not recorded</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Parallel Track Timeline:</span>
                <span className="font-mono text-teal-300 font-bold">Not recorded</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-700">
                <span className="text-[#f59e0b] font-bold">Estimated Time Saved:</span>
                <span className="text-[#f59e0b] font-extrabold text-sm">Not recorded</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setRecommendationModal(false)}
                className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <Link
                href="/applications"
                onClick={() => setRecommendationModal(false)}
                className="rounded-lg bg-[#0b1d35] hover:bg-[#122e50] text-white px-4 py-1.5 text-xs font-semibold shadow-xs"
              >
                Initiate Parallel Filings →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
