import { limitsFor, type Reading, type Thresholds, type VitalKey } from "./types";

export const TREND_WINDOW = 12;
/** Fire when the projected crossing is within this many readings (2s each). */
export const TREND_HORIZON = 30;
export const MIN_SLOPE: Record<VitalKey, number> = { hr: 0.3, sys: 0.4, dia: 0.3, spo2: 0.05, temp: 0.012 };
const MIN_R2 = 0.4;

export function linearSlope(values: number[]): { slope: number; r2: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, r2: 0 };
  const mx = (n - 1) / 2;
  const my = values.reduce((a, b) => a + b, 0) / n;
  let sxy = 0,
    sxx = 0,
    syy = 0;
  values.forEach((y, x) => {
    sxy += (x - mx) * (y - my);
    sxx += (x - mx) ** 2;
    syy += (y - my) ** 2;
  });
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, r2 };
}

export function ewma(values: number[], alpha = 0.3): number {
  let e = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) e = alpha * values[i]! + (1 - alpha) * e;
  return e;
}

export type TrendSignal = { vital: VitalKey; slope: number; ewma: number; limit: number; readingsToCross: number };

/** Vitals drifting toward a threshold that has NOT yet been crossed. */
export function detectTrends(history: Reading[], th: Thresholds): TrendSignal[] {
  if (history.length < TREND_WINDOW) return [];
  const w = history.slice(-TREND_WINDOW);
  const out: TrendSignal[] = [];
  for (const v of ["hr", "sys", "spo2", "temp"] as VitalKey[]) {
    const vals = w.map((r) => r[v]);
    const { slope, r2 } = linearSlope(vals);
    if (r2 < MIN_R2) continue;
    const e = ewma(vals);
    const { min, max } = limitsFor(th, v);
    const latest = vals[vals.length - 1]!;
    if (max !== undefined && slope > MIN_SLOPE[v] && e < max && latest <= max) {
      const t = (max - e) / slope;
      if (t <= TREND_HORIZON) out.push({ vital: v, slope, ewma: e, limit: max, readingsToCross: t });
    }
    if (min !== undefined && slope < -MIN_SLOPE[v] && e > min && latest >= min) {
      const t = (e - min) / -slope;
      if (t <= TREND_HORIZON) out.push({ vital: v, slope, ewma: e, limit: min, readingsToCross: t });
    }
  }
  return out;
}
