import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, Loader2, Stethoscope, UserCog, HeartPulse } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ensureDemoAccounts } from "@/lib/demo.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — VitalWatch" },
      { name: "description", content: "Sign in to VitalWatch, an AI-assisted remote patient monitoring demo." },
      { property: "og:title", content: "Sign in — VitalWatch" },
      { property: "og:description", content: "AI-assisted remote patient monitoring demo with simulated data." },
    ],
  }),
  component: Login,
});

const DEMO = [
  { email: "doctor@vitalwatch.demo", role: "Doctor", note: "All 12 patients · edits thresholds", icon: Stethoscope },
  { email: "nurse@vitalwatch.demo", role: "Nurse", note: "6 assigned patients", icon: HeartPulse },
  { email: "admin@vitalwatch.demo", role: "Admin", note: "Full read · manages roles", icon: UserCog },
];

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    ensureDemoAccounts().catch(() => {});
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/overview", replace: true });
    });
  }, [navigate]);

  async function signIn(e: string, p: string) {
    setBusy(true);
    try {
      await ensureDemoAccounts().catch(() => {});
      const { data, error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) throw error;
      await supabase.from("audit_log").insert({ user_id: data.user.id, user_email: data.user.email ?? null, action: "login", target: "session" });
      navigate({ to: "/overview" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bg-glow flex min-h-[calc(100vh-2rem)] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 md:grid-cols-2">
        <section className="flex flex-col justify-center">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <Activity className="h-7 w-7" />
            <span className="text-2xl font-bold tracking-tight text-foreground">VitalWatch</span>
          </div>
          <h1 className="text-3xl font-semibold leading-tight">Remote patient monitoring, with an extra set of eyes.</h1>
          <p className="mt-3 text-muted-foreground">
            Live vitals, early-warning trends and explainable risk — for clinical review.
          </p>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-xl">
          <form
            className="space-y-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              signIn(email, password);
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign in
            </Button>
          </form>

          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Demo accounts · password <span className="vital-num text-foreground">Demo@1234</span>
            </p>
            <div className="space-y-2">
              {DEMO.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  disabled={busy}
                  onClick={() => signIn(d.email, "Demo@1234")}
                  className="flex w-full items-center gap-3 rounded-lg border bg-secondary/50 px-3 py-2 text-left transition-colors hover:border-primary hover:bg-secondary disabled:opacity-50"
                >
                  <d.icon className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{d.role}</div>
                    <div className="vital-num text-xs text-muted-foreground">{d.email}</div>
                  </div>
                  <span className="text-xs text-muted-foreground">{d.note}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
