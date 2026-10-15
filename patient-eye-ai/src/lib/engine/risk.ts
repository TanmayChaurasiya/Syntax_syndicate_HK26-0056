import type { BaselineStats } from "./anomaly";
import type { TrendSignal } from "./trend";
import { SEV_RANK, UNIT, VITALS, VITAL_LABEL, type Reading, type Severity, type VitalKey } from "./types";

export type RiskLevel = "Stable" | "Watch" | "High" | "Critical";
export type Risk = { score: number; level: RiskLevel; factors: string[] };

export const CONDITION_WEIGHTS: Record<string, Partial<Record<VitalKey, number>>> = {
  copd: { spo2: 2, hr: 1.2 },
  hypertension: { sys: 2, dia: 1.8 },
  "heart failure": { hr: 1.5, spo2: 1.5, sys: 1.3 },
  "type 2 diabetes": { hr: 1.2, temp: 1.4 },
  "healthy baseline": {},
};
export const weightFor = (condition: string, v: VitalKey) => CONDITION_WEIGHTS[condition.toLowerCase()]?.[v] ?? 1;

export function riskLevel(score: number): RiskLevel {
  if (score >= 75) return "Critical";
  if (score >= 50) return "High";
  if (score >= 25) return "Watch";
  return "Stable";
}

export type RiskInput = {
  reading: Reading | null;
  stats: BaselineStats;
  condition: string;
  /** Severities of active CLINICAL alerts only — sensor errors must be excluded by the caller. */
  alerts: Severity[];
  trends: TrendSignal[];
  anomaly: number;
};

export function computeRisk(inp: RiskInput): Risk {
  const parts: { label: string; pts: number }[] = [];

  if (inp.reading) {
    let devTotal = 0;
    const devParts: { label: string; pts: number }[] = [];
    VITALS.forEach((v, i) => {
      const x = inp.reading![v];
      const diff = x - inp.stats.mean[i]!;
      const z = Math.abs(diff) / inp.stats.sd[i]!;
      const pts = Math.min(10, Math.max(0, z - 1) * 3) * weightFor(inp.condition, v);
      if (pts <= 0) return;
      devTotal += pts;
      const d = Math.round(diff * 10) / 10;
      devParts.push({ label: `${VITAL_LABEL[v]} ${x}${UNIT[v]} (${d > 0 ? "+" : ""}${d} vs baseline)`, pts });
    });
    const scale = devTotal > 35 ? 35 / devTotal : 1;
    devParts.forEach((p) => parts.push({ ...p, pts: p.pts * scale }));
  }

  if (inp.alerts.length) {
    const worst = inp.alerts.reduce((a, b) => (SEV_RANK[b] > SEV_RANK[a] ? b : a));
    const pts = Math.min(40, { critical: 35, warning: 20, info: 8 }[worst] + 3 * (inp.alerts.length - 1));
    parts.push({ label: `${inp.alerts.length} active alert${inp.alerts.length > 1 ? "s" : ""} (worst: ${worst})`, pts });
  }

  let trendPts = 0;
  for (const t of inp.trends) {
    const pts = Math.min(15 - trendPts, 8 * weightFor(inp.condition, t.vital));
    if (pts <= 0) break;
    trendPts += pts;
    const perMin = Math.round(t.slope * 30 * 10) / 10;
    parts.push({ label: `${VITAL_LABEL[t.vital]} trending ${perMin > 0 ? "up" : "down"} (${perMin > 0 ? "+" : ""}${perMin}${UNIT[t.vital]}/min)`, pts });
  }

  if (inp.anomaly > 3) {
    parts.push({ label: `Unusual vital combination (anomaly ${inp.anomaly.toFixed(1)})`, pts: Math.min(20, (inp.anomaly - 3) * 5) });
  }

  const score = Math.min(100, Math.round(parts.reduce((s, p) => s + p.pts, 0)));
  const factors = parts
    .filter((p) => p.pts >= 0.5)
    .sort((a, b) => b.pts - a.pts)
    .slice(0, 3)
    .map((p) => p.label);
  return { score, level: riskLevel(score), factors: factors.length ? factors : ["All vitals near personal baseline"] };
}
