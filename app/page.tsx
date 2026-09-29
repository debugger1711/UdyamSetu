"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  FileCheck,
  Calendar,
  Gift,
  Shield,
  X,
  FileText,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  async function handleLandingLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Email and password are required.");
      return;
    }

    setLoginPending(true);
    setLoginError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const body = (await response.json()) as { error?: string; role?: string };
      if (!response.ok) {
        setLoginError(body.error ?? "Sign in failed.");
        return;
      }

      const destination = body.role === "officer" || body.role === "admin"
        ? "/officer-dashboard"
        : "/dashboard";
      router.push(destination);
      router.refresh();
    } catch {
      setLoginError("Sign in failed.");
    } finally {
      setLoginPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#061426] text-white flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Top Navigation */}
      <header className="w-full border-b border-[#122842] px-6 sm:px-12 py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="20" x2="18" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
              <line x1="12" y1="20" x2="12" y2="8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-white text-base leading-tight">
              UdyamSetu
            </span>
            <span className="text-[9px] uppercase tracking-wider text-teal-400 font-semibold leading-tight">
              Unified Industrial Gateway
            </span>
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="hidden lg:flex items-center gap-8 text-xs text-slate-300 font-medium">
          <button
            onClick={() => setHowItWorksOpen(true)}
            className="hover:text-white transition-colors cursor-pointer"
          >
            How it works
          </button>
          <Link href="/officer-dashboard" className="hover:text-white transition-colors">
            For Departments
          </Link>
          <Link href="/approvals" className="hover:text-white transition-colors">
            Approval Library
          </Link>
          <Link href="/help" className="hover:text-white transition-colors">
            Support
          </Link>
        </nav>

        {/* Right CTA Links */}
        <div className="flex items-center gap-4">
          <Link
            href="/officer-dashboard"
            className="text-xs font-semibold text-slate-200 hover:text-white transition-colors"
          >
            Government Officer
          </Link>
          <button
            onClick={() => setLoginModalOpen(true)}
            className="rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 font-bold px-4 py-2 text-xs transition-all shadow-md active:scale-95 cursor-pointer"
          >
            Entrepreneur Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 sm:px-12 py-10 lg:py-14 flex flex-col justify-center">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline & Action */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1 text-xs text-teal-300">
              <Sparkles className="h-3.5 w-3.5 text-teal-400" />
              <span>Intelligent single-window platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
              Industrial
              <br />
              approvals,
              <br />
              <span className="text-[#f59e0b]">simplified.</span>
            </h1>

            <p className="text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed font-normal">
              From project planning to final approval, UdyamSetu connects every department,
              document and deadline in one trusted place.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] px-5 py-3 text-sm font-bold text-slate-950 transition-all shadow-lg active:scale-95"
              >
                <span>→ Start your approval journey</span>
              </Link>
              <button
                onClick={() => setHowItWorksOpen(true)}
                className="rounded-lg border border-[#1d3c63] bg-[#0c223c]/80 hover:bg-[#122e50] px-5 py-3 text-sm font-semibold text-slate-200 transition-colors"
              >
                Explore how it works
              </button>
            </div>

            {/* State Badges & Trust text */}
            <div className="flex items-center gap-3 pt-4 border-t border-[#122842]/80">
              <div className="flex -space-x-1.5">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#17385c] text-[10px] font-bold text-slate-200 ring-2 ring-[#061426]">
                  GJ
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1b436e] text-[10px] font-bold text-slate-200 ring-2 ring-[#061426]">
                  MH
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#205185] text-[10px] font-bold text-slate-200 ring-2 ring-[#061426]">
                  KA
                </span>
              </div>
              <div className="text-xs">
                <span className="font-semibold text-white block">
                  Built for enterprise. Trusted by departments.
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Prototype demonstration platform
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Industrial Journey Visual Card */}
          <div className="lg:col-span-6 relative">
            {/* Visual background simulation */}
            <div className="rounded-2xl border border-[#1b3b5e] bg-gradient-to-br from-[#0c213a] to-[#071629] p-6 shadow-2xl relative overflow-hidden">
              {/* Background industrial motif styling */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#0ea5e9_1px,transparent_1px)] [background-size:16px_16px]"
                aria-hidden="true"
              />

              {/* Floating Top-Right Pill */}
              <div className="absolute top-4 right-4 rounded-xl border border-emerald-500/40 bg-white/95 text-slate-900 px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Not recorded</span>
                  <span className="text-[10px] text-slate-500 font-medium block leading-tight">Submission ready</span>
                </div>
              </div>

              {/* Journey Inner Card */}
              <div className="mt-8 rounded-xl border border-[#1e4670] bg-[#0c233e]/90 p-5 backdrop-blur-xs">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
                    Your Unified Journey
                  </span>
                  <span className="rounded-full bg-teal-400/20 border border-teal-400/40 px-2.5 py-0.5 text-[10px] font-bold text-teal-300">
                    Live intelligence
                  </span>
                </div>

                {/* 6 Circular Journey Steps */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mb-5">
                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500 text-slate-950 font-bold mb-1.5 shadow-sm">
                      <Layers className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Project</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/80 text-slate-950 font-bold mb-1.5 shadow-sm">
                      <FileCheck className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Approvals</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold mb-1.5 border border-slate-700">
                      <FileText className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Review</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold mb-1.5 border border-slate-700">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Inspection</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold mb-1.5 border border-slate-700">
                      <Shield className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Approval</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 font-bold mb-1.5 border border-slate-700">
                      <Gift className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold text-white">Incentives</span>
                    <span className="text-[9px] text-slate-400">Not recorded</span>
                  </div>
                </div>

                {/* Insight Callout inside card */}
                <Link
                  href="/approvals"
                  className="flex items-center justify-between rounded-lg border border-teal-500/30 bg-[#103454] p-3 text-xs text-white hover:border-teal-400 transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-teal-400/20 text-teal-300">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-teal-300 block">
                        UdyamSetu Insight
                      </span>
                      <span className="font-medium text-slate-200 text-xs">
                        Time saved is not recorded.
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-teal-400 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Floating Bottom Card */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-slate-900 shadow-xl">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-100 text-teal-800">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Not recorded</span>
                  <span className="text-[10px] text-slate-500 block leading-tight">Run in parallel</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="mt-14 rounded-2xl border border-[#16365c] bg-[#091f38]/90 p-6 backdrop-blur-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-[#16365c]">
            <div className="space-y-1 pt-3 md:pt-0">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f59e0b] block">Not recorded</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Departments Connected
              </span>
            </div>

            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f59e0b] block">Not recorded</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Approval Rules Mapped
              </span>
            </div>

            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f59e0b] block">Not recorded</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                SLA Tracking
              </span>
            </div>

            <div className="space-y-1 pt-3 md:pt-0 md:pl-6">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#f59e0b] block">Not recorded</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Data reuse
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Entrepreneur Login Modal (Exact Figma Screenshot 184517) */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white text-slate-900 p-7 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setLoginModalOpen(false)}
              className="absolute top-5 right-5 text-xs text-slate-400 hover:text-slate-700 font-semibold cursor-pointer"
            >
              Close
            </button>

            {/* Modal Brand */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-500/20 text-teal-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="20" x2="18" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="12" y1="20" x2="12" y2="8" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 text-sm leading-tight">UdyamSetu</span>
                <span className="text-[8px] uppercase tracking-wider text-teal-600 font-bold leading-tight">
                  Unified Industrial Gateway
                </span>
              </div>
            </div>

            <div className="inline-block rounded-full bg-cyan-50 px-2.5 py-0.5 text-[10px] font-bold text-cyan-800 mb-2">
              Secure entrepreneur access
            </div>

            <h2 className="text-xl font-bold text-slate-900">Welcome back</h2>
            <p className="text-xs text-slate-500 mb-5">
              Access your approvals workspace with the account you created.
            </p>

            <form
              onSubmit={handleLandingLogin}
              className="space-y-3.5"
            >
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Email or mobile number
                </label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-900 focus:outline-none focus:border-cyan-600"
                  autoComplete="current-password"
                />
              </div>

              {loginError ? (
                <p className="text-[11px] font-medium text-red-600">{loginError}</p>
              ) : null}

              <button
                type="submit"
                disabled={loginPending}
                className="w-full h-10 rounded-lg bg-[#0b1d35] hover:bg-[#122e50] text-white font-semibold text-xs transition-colors mt-2 cursor-pointer shadow-md"
              >
                {loginPending ? "Signing in..." : "Continue to My Dashboard"}
              </button>

              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-2 text-[10px] text-slate-400">
                  or continue securely with
                </span>
              </div>

              <button
                type="button"
                onClick={() => setLoginError("DigiLocker sign-in is not available.")}
                className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="h-3.5 w-3.5 text-cyan-700" />
                <span>DigiLocker / MeriPehchaan</span>
              </button>

              <div className="text-center text-xs text-slate-500 pt-2">
                New applicant?{" "}
                <Link href="/signup" className="text-cyan-700 font-semibold hover:underline">
                  Create a project profile
                </Link>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Explore How it Works Modal */}
      {howItWorksOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white text-slate-900 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setHowItWorksOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">How UdyamSetu Works</h3>
            <p className="text-xs text-slate-500 mb-4">
              What the applicant workspace can do with the data it stores:
            </p>

            <div className="space-y-2 text-xs max-h-80 overflow-y-auto pr-1">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">1. Create Project Profile</strong>
                <span className="text-slate-600">Enter the project fields the form stores, including sector, investment, location, pollution category, stage, and land classification.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">2. Get Personalized Approvals</strong>
                <span className="text-slate-600">The checklist is generated from the stored land classification and pollution category. A count is not shown until that checklist exists.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">3. Prepare Documents</strong>
                <span className="text-slate-600">Upload a file to the application. The stored status is uploaded. Upload does not verify the document.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">4. Submit Applications</strong>
                <span className="text-slate-600">Submission creates a department workflow where a department is recorded. A statutory processing clock is not recorded.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">5. Coordinate Inspections</strong>
                <span className="text-slate-600">An inspection is stored when an officer creates one. Visits are not combined automatically.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">6. Track Approvals & SLA</strong>
                <span className="text-slate-600">An SLA state appears only when a start time and deadline are stored. There is no statutory countdown and no automatic escalation.</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block font-semibold">7. Discover Incentives</strong>
                <span className="text-slate-600">Scheme amounts are shown only when scheme rules are stored. None are recorded yet.</span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
              <button
                onClick={() => setHowItWorksOpen(false)}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-slate-950 px-4 py-2 text-xs font-bold transition-all shadow-sm"
              >
                Start Approval Journey →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
