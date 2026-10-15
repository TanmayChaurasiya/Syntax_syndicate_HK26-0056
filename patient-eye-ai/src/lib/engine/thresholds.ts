import { limitsFor, VITALS, VITAL_LABEL, UNIT, type Reading, type Severity, type Signal, type Thresholds, type VitalKey } from "./types";

/** How many units past the limit equals one severity step. */
export const STEP: Record<VitalKey, number> = { hr: 10, sys: 15, dia: 10, spo2: 2, temp: 0.5 };
/** Consecutive breaching readings after which severity is escalated one level. */
export const SUSTAINED_READINGS = 5;

export type Breach = { vital: VitalKey; value: number; limit: number; direction: "high" | "low"; excess: number };

export function breaches(r: Reading, th: Thresholds): Breach[] {
  const out: Breach[] = [];
  for (const v of VITALS) {
    const { min, max } = limitsFor(th, v);
    const x = r[v];
    if (max !== undefined && x > max) out.push({ vital: v, value: x, limit: max, direction: "high", excess: x - max });
    else if (min !== undefined && x < min) out.push({ vital: v, value: x, limit: min, direction: "low", excess: min - x });
  }
  return out;
}

export function severityFor(excess: number, step: number): Severity {
  if (excess < step) return "info";
  if (excess < 2 * step) return "warning";
  return "critical";
}

const escalate = (s: Severity): Severity => (s === "info" ? "warning" : "critical");

/** Evaluate the latest reading. `prior` = earlier readings (oldest first), used for duration. */
export function evaluateReading(r: Reading, th: Thresholds, prior: Reading[] = []): Signal[] {
  return breaches(r, th).map((b) => {
    let sev = severityFor(b.excess, STEP[b.vital]);
    let n = 1;
    for (let i = prior.length - 1; i >= 0; i--) {
      const x = prior[i]![b.vital];
      if (b.direction === "high" ? x > b.limit : x < b.limit) n++;
      else break;
    }
    if (n >= SUSTAINED_READINGS) sev = escalate(sev);
    return {
      type: "threshold",
      vital: b.vital,
      severity: sev,
      value: b.value,
      message: `${VITAL_LABEL[b.vital]} ${b.value}${UNIT[b.vital]} ${b.direction === "high" ? "above" : "below"} limit ${b.limit}${n > 1 ? ` for ${n} readings` : ""}`,
    };
  });
}
