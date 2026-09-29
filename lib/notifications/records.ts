import "server-only";

import { requireAnyRole, requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type NotificationView = {
  id: string;
  type: string;
  category: string;
  title: string;
  body: string;
  applicationId: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listOwnNotifications(): Promise<
  { ok: true; data: NotificationView[]; unread: number } | { ok: false }
> {
  await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, category, title, body, application_id, read_at, created_at")
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  const rows = (data ?? []) as Array<{
    id: string;
    type: string;
    category: string;
    title: string;
    body: string;
    application_id: string | null;
    read_at: string | null;
    created_at: string;
  }>;
  const mapped = rows.map((row) => ({
    id: row.id,
    type: row.type,
    category: row.category,
    title: row.title,
    body: row.body,
    applicationId: row.application_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
  return { ok: true, data: mapped, unread: mapped.filter((row) => !row.readAt).length };
}

export async function markOwnNotificationRead(notificationId: string): Promise<
  { status: 200 } | { status: 404 | 503 }
> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("mark_notification_read", {
    target_notification: notificationId,
  });
  if (result.error) {
    if ((result.error.message ?? "").includes("notification was not updated")) return { status: 404 };
    return { status: 503 };
  }
  return { status: 200 };
}

export async function markAllOwnNotificationsRead(): Promise<{ status: 200 } | { status: 503 }> {
  await requireUser();
  const supabase = await createClient();
  const result = await supabase.rpc("mark_all_notifications_read");
  if (result.error) return { status: 503 };
  return { status: 200 };
}

export async function evaluateDeadlineNotifications(): Promise<{ status: 200 } | { status: 503 }> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("evaluate_deadline_notifications");
  if (result.error) return { status: 503 };
  return { status: 200 };
}

export async function evaluateRenewalNotifications(): Promise<{ status: 200 } | { status: 503 }> {
  await requireAnyRole(["officer", "admin"]);
  const supabase = await createClient();
  const result = await supabase.rpc("evaluate_renewal_notifications");
  if (result.error) return { status: 503 };
  return { status: 200 };
}
