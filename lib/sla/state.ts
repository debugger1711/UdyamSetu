/**
 * SLA display state. Durations come only from approval_types.sla_duration_hours.
 * The 72-hour due-soon window is a technical display threshold, not a statutory SLA.
 */
export const TECHNICAL_DUE_SOON_MS = 72 * 60 * 60 * 1000;

export const DISPLAY_TIME_ZONE = "Asia/Kolkata";

export type SlaState = "not_started" | "on_track" | "due_soon" | "overdue" | "completed";

export function slaDeadline(startedAt: Date, durationHours: number | null): Date | null {
  if (durationHours == null || !Number.isFinite(durationHours) || durationHours <= 0) return null;
  if (Number.isNaN(startedAt.getTime())) return null;
  return new Date(startedAt.getTime() + durationHours * 60 * 60 * 1000);
}

export function slaState(input: {
  now: Date;
  startedAt: string | null;
  deadline: string | null;
  completedAt: string | null;
}): SlaState {
  if (input.completedAt) return "completed";
  if (!input.startedAt || !input.deadline) return "not_started";
  const deadline = new Date(input.deadline).getTime();
  const now = input.now.getTime();
  if (Number.isNaN(deadline) || Number.isNaN(now)) return "not_started";
  if (now > deadline) return "overdue";
  if (deadline - now <= TECHNICAL_DUE_SOON_MS) return "due_soon";
  return "on_track";
}

export function slaStateLabel(state: SlaState): string {
  if (state === "not_started") return "Not recorded";
  if (state === "on_track") return "On track";
  if (state === "due_soon") return "Due soon";
  if (state === "overdue") return "Overdue";
  return "Completed";
}

export function formatTimestamp(iso: string | null): string {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: DISPLAY_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function parseScheduledAt(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
