import { VITALS, VITAL_LABEL, type Reading, type Signal, type VitalKey } from "./types";

export const FLATLINE_READINGS = 8;

/** Returns the first physiologically impossible vital, or null. */
export function impossibleVital(r: Reading): VitalKey | null {
  if (!(r.hr > 0 && r.hr <= 300)) return "hr";
  if (!(r.spo2 > 0 && r.spo2 <= 100)) return "spo2";
  if (!(r.sys > 30 && r.sys <= 300)) return "sys";
  if (!(r.dia > 10 && r.dia < 250)) return "dia";
  if (!(r.temp > 25 && r.temp < 45)) return "temp";
  return null;
}
export const isImpossible = (r: Reading) => impossibleVital(r) !== null;

/** All vitals identical for the last FLATLINE_READINGS readings — real sensors always jitter. */
export function isFlatline(history: Reading[]): boolean {
  if (history.length < FLATLINE_READINGS) return false;
  const w = history.slice(-FLATLINE_READINGS);
  return VITALS.every((v) => w.every((r) => r[v] === w[0]![v]));
}

export function detectArtifact(history: Reading[]): Signal | null {
  const latest = history[history.length - 1];
  if (!latest) return null;
  const bad = impossibleVital(latest);
  if (bad)
    return {
      type: "sensor_error",
      vital: bad,
      severity: "warning",
      value: latest[bad],
      message: `Sensor error: impossible ${VITAL_LABEL[bad]} value ${latest[bad]}`,
    };
  if (isFlatline(history))
    return {
      type: "sensor_error",
      vital: null,
      severity: "warning",
      value: null,
      message: `Sensor error: signal flat-lined for ${FLATLINE_READINGS}+ readings`,
    };
  return null;
}
