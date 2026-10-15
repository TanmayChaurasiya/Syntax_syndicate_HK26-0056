# Patient Eye Ai

PROMPT 1 of 3: FOUNDATION, DATA, AND SIMULATOR

Build "VitalWatch", an AI-assisted Remote Patient Monitoring dashboard for a hackathon. ALL data is SIMULATED. Show a persistent top banner on every page: "SIMULATED DATA - for demonstration only. Alerts support clinical review and do not replace medical judgment."

STACK: React + TypeScript + Vite, Tailwind CSS, shadcn/ui, Recharts, React Router, Supabase (Auth, Postgres, Realtime). Dark clinical-style theme with accessible contrast, responsive layout, loading and empty states.

DATABASE (Supabase, with Row Level Security enabled on every table):
- user_roles (user_id, role enum: doctor | nurse | admin). Store roles in this SEPARATE table, never on the profile. Create a security-definer function has_role(user_id, role) and use it in RLS policies.
- profiles (id, full_name)
- patients (id, name [fictional], age, sex, condition [hypertension | type 2 diabetes | COPD | heart failure | healthy baseline], baseline_hr, baseline_sys, baseline_dia, baseline_spo2, baseline_temp, assigned_provider_id)
- patient_thresholds (patient_id, hr_min, hr_max, sys_min, sys_max, spo2_min, temp_max) with defaults HR <50 or >120, SBP <90 or >160, SpO2 <92, temp >38
- vitals_history (patient_id, ts, hr, sys, dia, spo2, temp): 7 days of hourly data per patient
- alerts (id, patient_id, type [threshold | trend | anomaly | sensor_error], severity [info | warning | critical], vital, value, message, status [new | acknowledged | resolved], created_at, acknowledged_by, ack_note, resolved_at)
- audit_log (id, ts, user_id, user_email, action, target, details)

RLS RULES: nurses can read only patients where assigned_provider_id = their id; doctors can read all patients and update patient_thresholds; nurses cannot update thresholds; admins can read everything and manage roles. All users can acknowledge alerts for patients they can see.

SEED DATA: 12 fictional patients across the 5 conditions, with realistic baselines per condition. Generate 7 days of hourly history per patient with daily rhythm, noise, and slow drift. Create 3 demo accounts and show them on the login page: doctor@vitalwatch.demo, nurse@vitalwatch.demo, admin@vitalwatch.demo (password Demo@1234). Assign 6 patients to the nurse and all 12 to the doctor.

LIVE SIMULATOR: a client-side singleton engine (src/lib/simulator.ts) that emits one reading every 2 seconds per patient (hr, sys, dia, spo2, temp) from the patient's baseline plus noise, daily rhythm, and slow drift. Expose it via a React context/hook. Support injected scenarios on any patient: "tachycardia episode", "hypertensive spike", "oxygen desaturation", "gradual deterioration" (drifts over about 2 minutes for demo speed), and "sensor glitch" (flat-line or impossible values).

PAGES FOR THIS STEP: Login (with demo accounts shown) and the Multi-Patient Overview: a grid of patient cards showing name, condition, live HR/BP/SpO2, mini sparkline, and a placeholder risk badge. Add search and a condition filter.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://patient-eye-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b28800e6-f113-51e3-bd16-079aa86864fc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
