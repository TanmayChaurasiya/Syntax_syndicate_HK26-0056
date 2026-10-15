import { SEV_RANK, signalKey, type Signal } from "./types";

/** Consecutive normal readings before an active alert auto-resolves. */
export const RESOLVE_AFTER = 10;

export type AlertEvent =
  | { kind: "open"; key: string; signal: Signal }
  | { kind: "escalate"; key: string; signal: Signal }
  | { kind: "resolve"; key: string; signal: Signal };

type Active = { signal: Signal; normalCount: number };

/** One alert per ongoing event (patient + type + vital). Pure: emits events, caller persists them. */
export class AlertDebouncer {
  private active = new Map<string, Map<string, Active>>();

  private bucket(pid: string) {
    let b = this.active.get(pid);
    if (!b) this.active.set(pid, (b = new Map()));
    return b;
  }

  /** Register an alert that already exists (e.g. loaded from the database). */
  adopt(pid: string, signal: Signal) {
    this.bucket(pid).set(signalKey(signal), { signal, normalCount: 0 });
  }

  step(pid: string, signals: Signal[]): AlertEvent[] {
    const b = this.bucket(pid);
    const events: AlertEvent[] = [];
    const seen = new Set<string>();
    for (const s of signals) {
      const key = signalKey(s);
      if (seen.has(key)) continue;
      seen.add(key);
      const cur = b.get(key);
      if (!cur) {
        b.set(key, { signal: s, normalCount: 0 });
        events.push({ kind: "open", key, signal: s });
      } else {
        cur.normalCount = 0;
        if (SEV_RANK[s.severity] > SEV_RANK[cur.signal.severity]) {
          cur.signal = s;
          events.push({ kind: "escalate", key, signal: s });
        } else cur.signal = { ...s, severity: cur.signal.severity };
      }
    }
    for (const [key, cur] of b) {
      if (seen.has(key)) continue;
      if (++cur.normalCount >= RESOLVE_AFTER) {
        b.delete(key);
        events.push({ kind: "resolve", key, signal: cur.signal });
      }
    }
    return events;
  }

  activeSignals(pid: string): Signal[] {
    return [...(this.active.get(pid)?.values() ?? [])].map((a) => a.signal);
  }
}
