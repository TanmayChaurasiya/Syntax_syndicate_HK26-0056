import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { Activity, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SimulatorProvider } from "@/hooks/use-simulator";
import { useSessionInfo } from "@/hooks/use-session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: Layout,
});

export const patientsQuery = {
  queryKey: ["patients"],
  queryFn: async () => {
    const { data, error } = await supabase.from("patients").select("*").order("name");
    if (error) throw error;
    return data;
  },
};

function Layout() {
  const { data: patients } = useQuery(patientsQuery);
  const { data: info } = useSessionInfo();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const baselines = useMemo(
    () =>
      (patients ?? []).map((p) => ({
        id: p.id,
        hr: Number(p.baseline_hr),
        sys: Number(p.baseline_sys),
        dia: Number(p.baseline_dia),
        spo2: Number(p.baseline_spo2),
        temp: Number(p.baseline_temp),
      })),
    [patients],
  );

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <SimulatorProvider patients={baselines}>
      <header className="flex items-center gap-3 border-b bg-card/60 px-4 py-3 backdrop-blur">
        <Link to="/overview" className="flex items-center gap-2 font-bold">
          <Activity className="h-5 w-5 text-primary" /> VitalWatch
        </Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {info?.roles.map((r) => (
            <Badge key={r} variant="secondary" className="capitalize">
              {r}
            </Badge>
          ))}
          <span className="hidden text-muted-foreground sm:inline">{info?.user.email}</span>
          <Button size="sm" variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>
      <Outlet />
    </SimulatorProvider>
  );
}
