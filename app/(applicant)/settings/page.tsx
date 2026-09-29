import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AuthorizationError, getCurrentProfile } from "@/lib/auth/session";
import { settingsFields } from "@/lib/shell/present";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let fields = settingsFields({ fullName: null, email: null });
  try {
    const profile = await getCurrentProfile();
    fields = settingsFields({ fullName: profile.fullName, email: profile.email });
  } catch (error) {
    if (error instanceof AuthorizationError && error.status === 401) redirect("/login");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Enterprise & Account Settings"
        description="Manage company details, authorized signatory delegations, notification channels, and API credentials."
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Settings" },
        ]}
      />

      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Authorized Signatory & Entity Profile</CardTitle>
          <CardDescription className="text-xs">
            Stored account details. Fields without a record stay unrecorded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-muted-foreground">Authorized Representative</label>
              <Input defaultValue={fields.representative} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground">Corporate Email</label>
              <Input defaultValue={fields.email} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground">Mobile</label>
              <Input defaultValue={fields.mobile} readOnly />
            </div>
            <div className="space-y-1">
              <label className="text-muted-foreground">PAN / GSTIN</label>
              <Input defaultValue={fields.taxIdentity} readOnly />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
