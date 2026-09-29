import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { listOwnNotifications } from "@/lib/notifications/records";
import { readPublicSupabaseConfig } from "@/lib/supabase/env";
import { NotificationCenter } from "./center";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!readPublicSupabaseConfig()) {
    return <p className="text-xs text-slate-500">Notifications are unavailable. The database is not configured.</p>;
  }
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const notifications = await listOwnNotifications();
  if (!notifications.ok) {
    return <p className="text-xs text-slate-500">Notifications could not be loaded.</p>;
  }
  return (
    <NotificationCenter
      notifications={notifications.data.map((item) => ({
        id: item.id,
        category: item.category,
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
        readAt: item.readAt,
        applicationId: item.applicationId,
      }))}
    />
  );
}
