"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Enterprise name, email, and password are required.");
      return;
    }

    setPending(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });
      const body = (await response.json()) as { error?: string; needsEmailConfirmation?: boolean };

      if (!response.ok) {
        setError(body.error ?? "Account could not be created.");
        return;
      }

      if (body.needsEmailConfirmation) {
        setNotice("Confirm the email address, then sign in. New accounts are applicants.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Account could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Portal
          </Link>
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ShieldCheck className="h-7 w-7 text-accent-foreground" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Register Industrial Entity
          </h1>
          <p className="text-sm text-muted-foreground">
            Create an enterprise profile for single window clearance discovery
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">Entity Onboarding</CardTitle>
            <CardDescription className="text-xs">
              Provide enterprise and promoter contact details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="signup-name">
                  Enterprise Name
                </label>
                <Input
                  id="signup-name"
                  type="text"
                  placeholder="Enter the enterprise name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="organization"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="signup-pan">
                    PAN / GSTIN
                  </label>
                  <Input
                    id="signup-pan"
                    type="text"
                    placeholder="AAACE1234F"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="signup-udyam">
                    Udyam Registration (Optional)
                  </label>
                  <Input
                    id="signup-udyam"
                    type="text"
                    placeholder="UDYAM-XX-00-0000000"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="signup-email">
                  Official Email
                </label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="promoter@enterprise.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="signup-password">
                  Password
                </label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>

              {error ? <p className="text-xs text-destructive">{error}</p> : null}
              {notice ? <p className="text-xs text-muted-foreground">{notice}</p> : null}

              <div className="pt-2">
                <Button className="w-full" type="submit" disabled={pending}>
                  {pending ? "Creating account..." : "Create Account & Open Dashboard"}
                </Button>
              </div>

              <div className="text-center text-xs text-muted-foreground pt-2">
                Already registered?{" "}
                <Link href="/login" className="text-primary font-medium hover:underline">
                  Sign In
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
