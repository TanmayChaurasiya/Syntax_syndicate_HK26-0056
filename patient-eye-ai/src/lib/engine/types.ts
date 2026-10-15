import type { Reading } from "@/lib/simulator";
export type { Reading };

export type VitalKey = "hr" | "sys" | "dia" | "spo2" | "temp";
export const VITALS: VitalKey[] = ["hr", "sys", "dia", "spo2", "temp"];
export type Severity = "info" | "warning" | "critical";
export const SEV_RANK: Record<Severity, number> = { info: 1, warning: 2, critical: 3 };
export type AlertType = "threshold" | "trend" | "anomaly" | "sensor_error";

export type Thresholds = {
  hr_min: number;
  hr_max: number;
  sys_min: number;
  sys_max: number;
  spo2_min: number;
  temp_max: number;
};
export const DEFAULT_THRESHOLDS: Thresholds = { hr_min: 50, hr_max: 120, sys_min: 90, sys_max: 160, spo2_min: 92, temp_max: 38 };

export type Signal = { type: AlertType; vital: VitalKey | null; severity: Severity; value: number | null; message: string };
export const signalKey = (s: Pick<Signal, "type" | "vital">) => `${s.type}:${s.vital ?? "-"}`;

export const VITAL_LABEL: Record<VitalKey, string> = {
  hr: "Heart rate",
  sys: "Systolic BP",
  dia: "Diastolic BP",
  spo2: "SpO₂",
  temp: "Temperature",
};
export const UNIT: Record<VitalKey, string> = { hr: " bpm", sys: " mmHg", dia: " mmHg", spo2: "%", temp: "°C" };

export function limitsFor(th: Thresholds, v: VitalKey): { min?: number; max?: number } {
  switch (v) {
    case "hr":
      return { min: th.hr_min, max: th.hr_max };
    case "sys":
      return { min: th.sys_min, max: th.sys_max };
    case "spo2":
      return { min: th.spo2_min };
    case "temp":
      return { max: th.temp_max };
    default:
      return {};
  }
}
