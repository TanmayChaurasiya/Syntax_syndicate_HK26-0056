import { ANOMALY_THRESHOLD, mahalanobis, type BaselineStats } from "./anomaly";
import { detectArtifact, isFlatline, isImpossible } from "./artifacts";
import { evaluateReading } from "./thresholds";
import { detectTrends, type TrendSignal } from "./trend";
import { VITAL_LABEL, UNIT, type Reading, type Signal, type Thresholds } from "./types";

/** Readings a trend / anomaly must persist before it becomes an alert. */
export const PERSIST = 3;

export type StepResult = {
  signals: Signal[];
  artifact: Signal | null;
  trends: TrendSignal[];
  anomaly: number;
  /** Latest physiologically valid reading (used for risk). */
  clean: Reading | null;
};

/** Stateful per-patient detector combining thresholds, artifacts, trends and anomaly. */
export class PatientEngine {
  private trendCount = new Map<string, number>();
  private anomalyCount = 0;
  private lastClean: Reading | null = null;
  private lastAnomaly = 0;

  constructor(
    public th: Thresholds,
    public stats: BaselineStats,
    public condition: string,
  ) {}

  step(history: Reading[]): StepResult {
    const artifact = detectArtifact(history);
    const clean = history.filter((r) => !isImpossible(r));
    if (artifact || isFlatline(history)) {
      // Sensor problem: no clinical signals, risk frozen at last valid reading.
      return { signals: artifact ? [artifact] : [], artifact, trends: [], anomaly: this.lastAnomaly, clean: this.lastClean };
    }
    const latest = clean[clean.length - 1];
    if (!latest) return { signals: [], artifact: null, trends: [], anomaly: 0, clean: null };
    this.lastClean = latest;

    const signals = evaluateReading(latest, this.th, clean.slice(0, -1));
    const breached = new Set(signals.map((s) => s.vital));

    const rawTrends = detectTrends(clean, this.th).filter((t) => !breached.has(t.vital));
    const trends: TrendSignal[] = [];
    const next = new Map<string, number>();
    for (const t of rawTrends) {
      const k = `${t.vital}:${t.slope > 0 ? "up" : "down"}`;
      const n = (this.trendCount.get(k) ?? 0) + 1;
      next.set(k, n);
      if (n >= PERSIST) {
        trends.push(t);
        const perMin = Math.round(t.slope * 30 * 10) / 10;
        signals.push({
          type: "trend",
          vital: t.vital,
          severity: "warning",
          value: latest[t.vital],
          message: `${VITAL_LABEL[t.vital]} drifting ${perMin > 0 ? "up" : "down"} ${Math.abs(perMin)}${UNIT[t.vital]}/min toward limit ${t.limit} (~${Math.round(t.readingsToCross * 2)}s)`,
        });
      }
    }
    this.trendCount = next;

    const d = mahalanobis(latest, this.stats);
    this.lastAnomaly = d;
    this.anomalyCount = d > ANOMALY_THRESHOLD ? this.anomalyCount + 1 : 0;
    if (this.anomalyCount >= PERSIST && breached.size === 0) {
      signals.push({
        type: "anomaly",
        vital: null,
        severity: d > ANOMALY_THRESHOLD * 1.6 ? "warning" : "info",
        value: Math.round(d * 10) / 10,
        message: `Unusual combination of vitals vs personal baseline (score ${d.toFixed(1)})`,
      });
    }
    return { signals, artifact: null, trends, anomaly: d, clean: latest };
  }
}
