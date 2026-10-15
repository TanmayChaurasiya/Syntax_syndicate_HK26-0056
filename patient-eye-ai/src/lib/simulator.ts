// Client-side singleton that emits SIMULATED vitals every 2s per patient.
export type Reading = { ts: number; hr: number; sys: number; dia: number; spo2: number; temp: number };
export type ScenarioKind = "tachycardia" | "hypertensive" | "desaturation" | "deterioration" | "glitch";
export const SCENARIOS: { kind: ScenarioKind; label: string; durationS: number }[] = [
  { kind: "tachycardia", label: "Tachycardia episode", durationS: 60 },
  { kind: "hypertensive", label: "Hypertensive spike", durationS: 60 },
  { kind: "desaturation", label: "Oxygen desaturation", durationS: 60 },
  { kind: "deterioration", label: "Gradual deterioration", durationS: 180 },
  { kind: "glitch", label: "Sensor glitch", durationS: 40 },
];
export type Baseline = { id: string; hr: number; sys: number; dia: number; spo2: number; temp: number };

type PState = { base: Baseline; drift: number; history: Reading[]; scenario?: { kind: ScenarioKind; start: number } | undefined };

const TICK_MS = 2000;
const BUFFER = 60;
const noise = (amp: number) => (Math.random() - 0.5) * 2 * amp;
const r1 = (n: number) => Math.round(n * 10) / 10;

class Simulator {
  private patients = new Map<string, PState>();
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  version = 0;

  setPatients(list: Baseline[]) {
    for (const b of list) {
      if (this.patients.has(b.id)) continue;
      const st: PState = { base: b, drift: noise(1), history: [] };
      const now = Date.now();
      for (let i = BUFFER; i > 0; i--) st.history.push(this.generate(st, now - i * TICK_MS));
      this.patients.set(b.id, st);
    }
    this.start();
    this.emit();
  }

  private start() {
    if (this.timer || typeof window === "undefined") return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const now = Date.now();
    for (const st of this.patients.values()) {
      st.drift = Math.max(-3, Math.min(3, st.drift + noise(0.15)));
      st.history.push(this.generate(st, now));
      if (st.history.length > BUFFER) st.history.shift();
      if (st.scenario) {
        const def = SCENARIOS.find((s) => s.kind === st.scenario!.kind)!;
        if ((now - st.scenario.start) / 1000 > def.durationS) st.scenario = undefined;
      }
    }
    this.emit();
  }

  private generate(st: PState, ts: number): Reading {
    const b = st.base;
    const hour = new Date(ts).getHours() + new Date(ts).getMinutes() / 60;
    const rhythm = Math.sin((2 * Math.PI * (hour - 14)) / 24);
    let r: Reading = {
      ts,
      hr: b.hr + 5 * rhythm + st.drift + noise(2.5),
      sys: b.sys + 6 * rhythm + st.drift * 1.5 + noise(3),
      dia: b.dia + 3 * rhythm + st.drift + noise(2),
      spo2: Math.min(100, b.spo2 + noise(0.6) - Math.max(0, st.drift) * 0.1),
      temp: b.temp + 0.25 * rhythm + noise(0.08),
    };
    if (st.scenario) r = this.applyScenario(st, r, (ts - st.scenario.start) / 1000);
    return { ts, hr: Math.round(r.hr), sys: Math.round(r.sys), dia: Math.round(r.dia), spo2: r1(r.spo2), temp: r1(r.temp) };
  }

  private applyScenario(st: PState, r: Reading, t: number): Reading {
    if (t < 0) return r;
    const ramp = (s: number) => Math.min(1, t / s);
    switch (st.scenario!.kind) {
      case "tachycardia":
        return { ...r, hr: r.hr + 60 * ramp(10) + noise(4) };
      case "hypertensive":
        return { ...r, sys: r.sys + 55 * ramp(8), dia: r.dia + 25 * ramp(8) };
      case "desaturation":
        return { ...r, spo2: r.spo2 - 13 * ramp(8), hr: r.hr + 15 * ramp(8) };
      case "deterioration": {
        const f = Math.min(1, t / 120);
        return { ...r, hr: r.hr + 32 * f, sys: r.sys - 18 * f, spo2: r.spo2 - 7 * f, temp: r.temp + 1.4 * f };
      }
      case "glitch": {
        const last = st.history[st.history.length - 1];
        if (t < 20 && last) return { ...last };
        return { ...r, hr: Math.random() > 0.5 ? 0 : 320, spo2: 127 };
      }
    }
  }

  inject(patientId: string, kind: ScenarioKind) {
    const st = this.patients.get(patientId);
    if (!st) return;
    st.scenario = { kind, start: Date.now() };
    this.emit();
  }

  clear(patientId: string) {
    const st = this.patients.get(patientId);
    if (st) st.scenario = undefined;
    this.emit();
  }

  getHistory(id: string): Reading[] {
    return this.patients.get(id)?.history ?? [];
  }
  getScenario(id: string): ScenarioKind | undefined {
    return this.patients.get(id)?.scenario?.kind;
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  private emit() {
    this.version++;
    this.listeners.forEach((l) => l());
  }
}

export const simulator = new Simulator();
