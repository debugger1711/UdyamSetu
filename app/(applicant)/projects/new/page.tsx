"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Building2,
  ArrowRight,
  RotateCcw,
  Layers,
  FileCheck2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";

export default function NewProjectPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    entityName: "",
    sector: "",
    subSector: "",
    pollutionCategory: "" as "" | "white" | "green" | "orange" | "red",
    state: "",
    district: "",
    location: "",
    plotNumber: "",
    totalInvestmentCr: 0,
    plantMachineryCr: 0,
    proposedCapacity: "",
    employment: 0,
    waterRequirementKld: 0,
    wastewaterKld: 0,
    airEmissionSources: "",
    hazardousWaste: "",
    stage: "",
    landClassification: "" as "" | "industrial_estate" | "private_agricultural" | "private_non_agricultural" | "sez",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = "Enterprise name is required.";
    if (!formData.sector.trim()) errs.sector = "Industry sector is required.";
    if (!formData.pollutionCategory) errs.pollutionCategory = "Select a pollution category.";
    if (!formData.stage) errs.stage = "Select a project stage.";
    if (!formData.state.trim()) errs.state = "State is required.";
    if (!formData.district.trim()) errs.district = "District / city is required.";
    if (!formData.location.trim()) errs.location = "Site address is required.";
    if (formData.totalInvestmentCr <= 0) errs.totalInvestmentCr = "Enter valid investment amount.";
    if (formData.employment <= 0) errs.employment = "Planned workforce must be at least 1.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const clearForm = () => {
    setFormData({
      name: "",
      entityName: "",
      sector: "",
      subSector: "",
      pollutionCategory: "",
      state: "",
      district: "",
      location: "",
      plotNumber: "",
      totalInvestmentCr: 0,
      plantMachineryCr: 0,
      proposedCapacity: "",
      employment: 0,
      waterRequirementKld: 0,
      wastewaterKld: 0,
      airEmissionSources: "",
      hazardousWaste: "",
      stage: "",
      landClassification: "",
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError("");
    setLoadingStep(1);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          ...(formData.entityName.trim() ? { entityName: formData.entityName.trim() } : {}),
          sector: formData.sector,
          pollutionCategory: formData.pollutionCategory,
          totalInvestmentCr: Number(formData.totalInvestmentCr),
          stage: formData.stage,
          location: formData.location,
          ...(formData.landClassification ? { landClassification: formData.landClassification } : {}),
        }),
      });
      const body = (await response.json()) as { error?: string; project?: { id?: string } };

      if (!response.ok || !body.project?.id) {
        setSubmitError(body.error ?? "Project could not be created.");
        setIsSubmitting(false);
        setLoadingStep(0);
        return;
      }

      setLoadingStep(3);
      router.push(`/projects/${body.project.id}`);
      router.refresh();
    } catch {
      setSubmitError("Project could not be created.");
      setIsSubmitting(false);
      setLoadingStep(0);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Register New Industrial Project"
        description="Provide enterprise specifications to dynamically compute the statutory clearances, environmental category, and applicable state incentive schemes."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Projects", href: "/projects" },
          { label: "New Project" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearForm}
            className="text-xs h-8 border-slate-200 text-slate-600"
          >
            Clear Fields
          </Button>
        </div>
      </PageHeader>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Section 1: Enterprise Identity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">1. Enterprise Identity & Sector</h3>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Project / Brand Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter the project name"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              {errors.name && <p className="text-[11px] text-rose-600 font-medium">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Legal Entity Name</label>
              <input
                type="text"
                value={formData.entityName}
                onChange={(e) => setFormData({ ...formData, entityName: e.target.value })}
                placeholder="Enter the legal entity name"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Industry / Sector *</label>
              <select
                value={formData.sector}
                onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
              >
                <option value="">Select a sector</option>
                <option>Electric components unit</option>
                <option>Automobile & Precision Engineering</option>
                <option>Pharmaceuticals & Active Ingredients</option>
                <option>Textiles & Synthetic Weaving</option>
                <option>Food Processing & Agro Logistics</option>
                <option>Chemicals & Specialty Formulations</option>
              </select>
                {errors.sector && <p className="text-[11px] text-rose-600 font-medium">{errors.sector}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">CPCB Pollution Category *</label>
                <select
                  value={formData.pollutionCategory}
                  onChange={(e) => setFormData({
                    ...formData,
                    pollutionCategory: e.target.value as typeof formData.pollutionCategory,
                  })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                >
                  <option value="">Select a category</option>
                  <option value="white">White (Exempt / Low Impact)</option>
                  <option value="green">Green (Score 21–40)</option>
                  <option value="orange">Orange (Score 41–59)</option>
                  <option value="red">Red (Score 60+ Heavy Impact)</option>
                </select>
                {errors.pollutionCategory && <p className="text-[11px] text-rose-600 font-medium">{errors.pollutionCategory}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Project Stage *</label>
                <select
                  value={formData.stage}
                  onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
                >
                  <option value="">Select a stage</option>
                  <option value="pre_establishment">Pre-Establishment (New Unit)</option>
                  <option value="expansion">Brownfield Capacity Expansion</option>
                  <option value="operational">Operational Unit Regularization</option>
                </select>
                {errors.stage && <p className="text-[11px] text-rose-600 font-medium">{errors.stage}</p>}
              </div>
          </div>
        </div>

        {/* Section 2: Location & Land */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Layers className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">2. Project Location & Site Details</h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter the state"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">District / City *</label>
              <input
                type="text"
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Enter the district or city"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Plot / Survey No.</label>
              <input
                type="text"
                value={formData.plotNumber}
                onChange={(e) => setFormData({ ...formData, plotNumber: e.target.value })}
                placeholder="Enter the plot or survey number"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="text-xs space-y-1.5">
            <label className="font-semibold text-slate-700">Site / Industrial Estate Address *</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter the site address"
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
            />
            {errors.location && <p className="text-[11px] text-rose-600 font-medium">{errors.location}</p>}
          </div>

          <div className="text-xs space-y-1.5">
            <label className="font-semibold text-slate-700">Land classification</label>
            <select
              value={formData.landClassification}
              onChange={(e) => setFormData({
                ...formData,
                landClassification: e.target.value as typeof formData.landClassification,
              })}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 bg-white"
            >
              <option value="">Not recorded</option>
              <option value="industrial_estate">Industrial estate</option>
              <option value="private_agricultural">Private agricultural</option>
              <option value="private_non_agricultural">Private non-agricultural</option>
              <option value="sez">SEZ</option>
            </select>
          </div>
        </div>

        {/* Section 3: Financials & Utilities */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <FileCheck2 className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">3. Investment, Scale & Environmental Parameters</h3>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Total Investment (₹ Cr) *</label>
              <input
                type="number"
                step="0.1"
                value={formData.totalInvestmentCr}
                onChange={(e) => setFormData({ ...formData, totalInvestmentCr: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-semibold"
              />
              {errors.totalInvestmentCr && <p className="text-[11px] text-rose-600 font-medium">{errors.totalInvestmentCr}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Plant & Machinery (₹ Cr)</label>
              <input
                type="number"
                step="0.1"
                value={formData.plantMachineryCr}
                onChange={(e) => setFormData({ ...formData, plantMachineryCr: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Planned Employment *</label>
              <input
                type="number"
                value={formData.employment}
                onChange={(e) => setFormData({ ...formData, employment: parseInt(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Proposed Capacity</label>
              <input
                type="text"
                value={formData.proposedCapacity}
                onChange={(e) => setFormData({ ...formData, proposedCapacity: e.target.value })}
                placeholder="250,000 units / yr"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Fresh Water Consumption (KLD)</label>
              <input
                type="number"
                value={formData.waterRequirementKld}
                onChange={(e) => setFormData({ ...formData, waterRequirementKld: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Wastewater Generation (KLD)</label>
              <input
                type="number"
                value={formData.wastewaterKld}
                onChange={(e) => setFormData({ ...formData, wastewaterKld: parseFloat(e.target.value) || 0 })}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Air Emission Sources</label>
              <input
                type="text"
                value={formData.airEmissionSources}
                onChange={(e) => setFormData({ ...formData, airEmissionSources: e.target.value })}
                placeholder="e.g. 500 kVA DG Stack, soldering exhaust"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700">Hazardous Waste Generation</label>
              <input
                type="text"
                value={formData.hazardousWaste}
                onChange={(e) => setFormData({ ...formData, hazardousWaste: e.target.value })}
                placeholder="e.g. Spent solvent, chemical sludge"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/dashboard">
            <Button type="button" variant="outline" size="sm" className="text-xs">
              Cancel
            </Button>
          </Link>

          <div className="flex flex-col items-end gap-2">
            {submitError ? <p className="text-[11px] text-rose-600 font-medium">{submitError}</p> : null}
            <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#09192e] hover:bg-[#0f243e] text-white font-semibold text-xs h-10 px-5 gap-2"
          >
            {isSubmitting ? (
              <>
                <RotateCcw className="h-4 w-4 animate-spin text-amber-400" />
                <span>Saving project...</span>
              </>
            ) : (
              <>
                <span>Save Project</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
          </div>
        </div>
      </form>

      {/* Multi-stage Analysis Modal Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="h-14 w-14 rounded-full bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto">
              <Sparkles className="h-7 w-7 text-amber-500 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                {loadingStep === 1 && "Saving the project profile..."}
                {loadingStep === 3 && "Opening the project..."}
              </h3>
              <p className="text-xs text-slate-500">
                {loadingStep === 1 && "Storing the project for the signed-in owner."}
                {loadingStep === 3 && "Opening the saved project."}
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="bg-teal-600 h-full transition-all duration-500"
                style={{
                  width: loadingStep === 1 ? "35%" : loadingStep === 2 ? "75%" : "100%",
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
