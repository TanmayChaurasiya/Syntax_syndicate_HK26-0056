import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { simulator, type Baseline } from "@/lib/simulator";

const SimCtx = createContext(simulator);

export function SimulatorProvider({ patients, children }: { patients: Baseline[]; children: ReactNode }) {
  useEffect(() => {
    if (patients.length) simulator.setPatients(patients);
  }, [patients]);
  return <SimCtx.Provider value={simulator}>{children}</SimCtx.Provider>;
}

export function useSimulator() {
  const sim = useContext(SimCtx);
  useSyncExternalStore(sim.subscribe, () => sim.version, () => 0);
  return sim;
}

export function useLiveVitals(patientId: string) {
  const sim = useSimulator();
  const history = sim.getHistory(patientId);
  return { history, latest: history[history.length - 1], scenario: sim.getScenario(patientId) };
}
