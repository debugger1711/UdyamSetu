"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCheck, CheckCircle2, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTimestamp } from "@/lib/sla/state";

const CATEGORIES = [
  "All",
  "Action Required",
  "Deadline",
  "Department Query",
  "Approval Update",
  "Inspection",
  "Scheme",
  "System",
] as const;

export type NotificationCard = {
  id: string;
  category: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  applicationId: string | null;
};

export function NotificationCenter({ notifications }: { notifications: NotificationCard[] }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const filtered = notifications.filter((item) => selectedCategory === "All" || item.category === selectedCategory);
  const active = notifications.find((item) => item.id === activeId) ?? null;

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    router.refresh();
  }

  async function markAll() {
    await fetch("/api/notifications/read", { method: "POST" });
    setToast("All notifications marked as read");
    setTimeout(() => setToast(null), 3000);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {toast ? (
        <div className="fixed top-5 right-5 z-50 bg-[#09192e] text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      ) : null}
      <PageHeader
        title="Notifications & Alerts"
        description="Events recorded for your account."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Notifications" }]}
      >
        <div className="flex items-center gap-2">
          {unreadCount > 0 ? (
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">{unreadCount} unread alerts</Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={() => void markAll()} disabled={unreadCount === 0} className="text-xs h-8 gap-1.5">
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        </div>
      </PageHeader>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="space-y-2 md:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Filter by Category</div>
            {CATEGORIES.map((category) => {
              const count = category === "All"
                ? notifications.length
                : notifications.filter((item) => item.category === category).length;
              const selected = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium ${selected ? "bg-[#09192e] text-white" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <span>{category}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selected ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600"}`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600">
            <h4 className="font-semibold text-slate-900 mb-1">SLA Alert Protocol</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Deadline notifications are created only when a workflow has a configured SLA duration. The approval catalog does not set one. A 72-hour due-soon window is a display threshold, not a statutory deadline.
            </p>
          </div>
        </div>
        <div className="md:col-span-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
              No notifications found in this category.
            </div>
          ) : filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveId(item.id);
                if (!item.readAt) void markRead(item.id);
              }}
              className={`w-full text-left bg-white rounded-xl border p-4 ${item.readAt ? "border-slate-200" : "border-slate-300 ring-1 ring-amber-400/20"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                <span className="text-[11px] text-slate-400 font-mono">{formatTimestamp(item.createdAt)}</span>
                {!item.readAt ? <span className="text-[10px] font-bold text-amber-600">Unread</span> : null}
              </div>
              <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="text-xs text-slate-600 mt-1">{item.body}</p>
              <span className="mt-2 text-[11px] text-teal-700 font-semibold inline-flex items-center gap-1">
                Inspect details <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          ))}
        </div>
      </div>
      {active ? (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full p-6">
            <div className="flex justify-between mb-3">
              <div>
                <Badge variant="outline" className="text-[10px]">{active.category}</Badge>
                <h3 className="text-base font-bold text-slate-900">{active.title}</h3>
                <span className="text-[11px] text-slate-500">{formatTimestamp(active.createdAt)}</span>
              </div>
              <button onClick={() => setActiveId(null)}><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3">{active.body}</p>
            <p className="text-xs text-slate-500 mt-3">Related application: {active.applicationId ?? "Not recorded"}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
