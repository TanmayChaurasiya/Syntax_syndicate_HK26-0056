import { VITALS } from "./types";

type VitalRow = { hr: number; sys: number; dia: number; spo2: number; temp: number };
export type BaselineStats = { mean: number[]; sd: number[]; inv: number[][] };

/** Minimum SD per vital so tiny history variance doesn't make everything look anomalous. */
export const FLOOR_SD = [4, 6, 4, 0.8, 0.2];
export const ANOMALY_THRESHOLD = 4.5;

export const toVec = (r: VitalRow) => VITALS.map((v) => Number(r[v]));

export function invert(m: number[][]): number[][] {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(a[r]![c]!) > Math.abs(a[p]![c]!)) p = r;
    [a[c], a[p]] = [a[p]!, a[c]!];
    const pv = a[c]![c]!;
    if (Math.abs(pv) < 1e-12) throw new Error("singular matrix");
    for (let j = 0; j < 2 * n; j++) a[c]![j]! /= pv;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = a[r]![c]!;
      for (let j = 0; j < 2 * n; j++) a[r]![j]! -= f * a[c]![j]!;
    }
  }
  return a.map((row) => row.slice(n));
}

/** Mean + covariance from a patient's own history; falls back to `fallbackMean` with floor variances. */
export function computeStats(rows: VitalRow[], fallbackMean: number[]): BaselineStats {
  const k = VITALS.length;
  const valid = rows.filter((r) => VITALS.every((v) => r[v] !== null && Number.isFinite(Number(r[v]))));
  let mean = fallbackMean;
  const cov = Array.from({ length: k }, () => Array<number>(k).fill(0));
  if (valid.length >= 10) {
    const X = valid.map(toVec);
    mean = Array.from({ length: k }, (_, i) => X.reduce((s, x) => s + x[i]!, 0) / X.length);
    for (const x of X) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) cov[i]![j]! += ((x[i]! - mean[i]!) * (x[j]! - mean[j]!)) / (X.length - 1);
  }
  for (let i = 0; i < k; i++) {
    const floor = FLOOR_SD[i]! ** 2;
    if (cov[i]![i]! < floor) {
      // scale row/col so correlations are preserved while variance hits the floor
      const s = cov[i]![i]! > 0 ? Math.sqrt(floor / cov[i]![i]!) : 0;
      for (let j = 0; j < k; j++) if (j !== i) {
        cov[i]![j]! *= s;
        cov[j]![i]! *= s;
      }
      cov[i]![i] = floor;
    }
  }
  for (let i = 0; i < k; i++) cov[i]![i]! += 1e-6;
  let inv: number[][];
  try {
    inv = invert(cov);
  } catch {
    inv = cov.map((row, i) => row.map((_, j) => (i === j ? 1 / cov[i]![i]! : 0)));
  }
  return { mean, sd: cov.map((r, i) => Math.sqrt(r[i]!)), inv };
}

export function mahalanobis(r: VitalRow, s: BaselineStats): number {
  const d = toVec(r).map((x, i) => x - s.mean[i]!);
  let sum = 0;
  for (let i = 0; i < d.length; i++) for (let j = 0; j < d.length; j++) sum += d[i]! * s.inv[i]![j]! * d[j]!;
  return Math.sqrt(Math.max(0, sum));
}
