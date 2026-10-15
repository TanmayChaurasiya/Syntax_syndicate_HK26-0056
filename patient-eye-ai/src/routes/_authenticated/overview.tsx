import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { FlaskConical, Search, Users } from "lucide-react";
import { patientsQuery } from "./route";
import { useLiveVitals, useSimulator } from "@/hooks/use-simulator";
import { SCENARIOS } from "@/lib/simulator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/overview")({
  head: () => ({
    meta: [
      { title: "Patient Overview — VitalWatch" },
      { name: "description", content: "Live multi-patient vitals overview with simulated data." },
      { property: "og:title", content: "Patient Overview — VitalWatch" },
      { property: "og:description", content: "Live multi-patient vitals overview with simulated data." },
    ],
  }),
  component: Overview,
});

const CONDITIONS = ["hypertension", "type 2 diabetes", "COPD", "heart failure", "healthy baseline"];

function Overview() {
  const { data, isLoading, error } = useQuery(patientsQuery);
  const [q, setQ] = useState("");
  const [cond, setCond] = useState("all");

  const list = (data ?? []).filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) && (cond === "all" || p.condition === cond),
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">Patient overview</h1>
          <p className="text-sm text-muted-foreground">Live readings every 2 seconds · {data?.length ?? 0} patients</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patients" value={q} onChange={(e) => setQ(e.target.value)} className="w-56 pl-8" />
        </div>
        <Select value={cond} onValueChange={setCond}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All conditions</SelectItem>
            {CONDITIONS.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-destructive">Could not load patients.</p>}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed py-16 text-muted-foreground">
          <Users className="mb-2 h-8 w-8" />
          No patients match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PatientCard key={p.id} id={p.id} name={p.name} age={p.age} sex={p.sex} condition={p.condition} />
          ))}
        </div>
      )}
    </main>
  );
}

function PatientCard(props: { id: string; name: string; age: number; sex: string; condition: string }) {
  const { history, latest, scenario } = useLiveVitals(props.id);
  const sim = useSimulator();
  const spark = history.slice(-30);

  return (
    <article className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">{props.name}</h2>
          <p className="text-xs capitalize text-muted-foreground">
            {props.age}
            {props.sex} · {props.condition}
          </p>
        </div>
        <Badge variant="outline" className="text-muted-foreground">
          Risk —
        </Badge>
      </div>

      {latest ? (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Vital label="HR" value={latest.hr} unit="bpm" />
          <Vital label="BP" value={`${latest.sys}/${latest.dia}`} unit="mmHg" />
          <Vital label="SpO₂" value={latest.spo2} unit="%" />
        </div>
      ) : (
        <Skeleton className="mt-4 h-14" />
      )}

      <div className="mt-3 h-12">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={spark}>
            <YAxis hide domain={["dataMin - 5", "dataMax + 5"]} />
            <Line type="monotone" dataKey="hr" stroke="var(--chart-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {scenario ? (
          <Badge className="bg-warning text-warning-foreground">
            {SCENARIOS.find((s) => s.kind === scenario)?.label}
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">HR trend · last minute</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 text-xs">
              <FlaskConical className="h-3.5 w-3.5" /> Scenario
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {SCENARIOS.map((s) => (
              <DropdownMenuItem key={s.kind} onClick={() => sim.inject(props.id, s.kind)}>
                {s.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => sim.clear(props.id)}>Clear scenario</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

function Vital({ label, value, unit }: { label: string; value: number | string; unit: string }) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="vital-num text-lg font-bold">{value}</div>
      <div className="text-[10px] text-muted-foreground">{unit}</div>
    </div>
  );
}
