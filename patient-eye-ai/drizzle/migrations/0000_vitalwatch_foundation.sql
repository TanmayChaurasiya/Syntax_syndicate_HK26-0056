CREATE TYPE public.app_role AS ENUM ('doctor','nurse','admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age int NOT NULL,
  sex text NOT NULL,
  condition text NOT NULL CHECK (condition IN ('hypertension','type 2 diabetes','COPD','heart failure','healthy baseline')),
  baseline_hr numeric NOT NULL,
  baseline_sys numeric NOT NULL,
  baseline_dia numeric NOT NULL,
  baseline_spo2 numeric NOT NULL,
  baseline_temp numeric NOT NULL,
  assigned_provider_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_see_patient(_patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.assigned_provider_id = auth.uid()
               AND public.has_role(auth.uid(),'nurse'))
$$;

CREATE POLICY "patients visible" ON public.patients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'admin')
         OR (public.has_role(auth.uid(),'nurse') AND assigned_provider_id = auth.uid()));

CREATE TABLE public.patient_thresholds (
  patient_id uuid PRIMARY KEY REFERENCES public.patients(id) ON DELETE CASCADE,
  hr_min numeric NOT NULL DEFAULT 50,
  hr_max numeric NOT NULL DEFAULT 120,
  sys_min numeric NOT NULL DEFAULT 90,
  sys_max numeric NOT NULL DEFAULT 160,
  spo2_min numeric NOT NULL DEFAULT 92,
  temp_max numeric NOT NULL DEFAULT 38,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.patient_thresholds TO authenticated;
GRANT ALL ON public.patient_thresholds TO service_role;
ALTER TABLE public.patient_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "thresholds visible" ON public.patient_thresholds FOR SELECT TO authenticated USING (public.can_see_patient(patient_id));
CREATE POLICY "doctors update thresholds" ON public.patient_thresholds FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'doctor')) WITH CHECK (public.has_role(auth.uid(),'doctor'));

CREATE TABLE public.vitals_history (
  id bigserial PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  ts timestamptz NOT NULL,
  hr numeric, sys numeric, dia numeric, spo2 numeric, temp numeric
);
CREATE INDEX vitals_history_patient_ts ON public.vitals_history(patient_id, ts);
GRANT SELECT ON public.vitals_history TO authenticated;
GRANT ALL ON public.vitals_history TO service_role;
ALTER TABLE public.vitals_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vitals visible" ON public.vitals_history FOR SELECT TO authenticated USING (public.can_see_patient(patient_id));

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('threshold','trend','anomaly','sensor_error')),
  severity text NOT NULL CHECK (severity IN ('info','warning','critical')),
  vital text, value numeric, message text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','acknowledged','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_by uuid, ack_note text, resolved_at timestamptz
);
CREATE INDEX alerts_patient ON public.alerts(patient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts visible" ON public.alerts FOR SELECT TO authenticated USING (public.can_see_patient(patient_id));
CREATE POLICY "alerts insert" ON public.alerts FOR INSERT TO authenticated WITH CHECK (public.can_see_patient(patient_id));
CREATE POLICY "alerts ack" ON public.alerts FOR UPDATE TO authenticated USING (public.can_see_patient(patient_id)) WITH CHECK (public.can_see_patient(patient_id));
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ts timestamptz NOT NULL DEFAULT now(),
  user_id uuid, user_email text, action text NOT NULL, target text, details jsonb
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit insert own" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "audit read doctor admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'admin'));