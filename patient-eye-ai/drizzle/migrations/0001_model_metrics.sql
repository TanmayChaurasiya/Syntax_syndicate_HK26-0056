CREATE TABLE public.model_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  run_by uuid,
  episodes integer NOT NULL,
  engine jsonb NOT NULL,
  baseline jsonb NOT NULL
);
GRANT SELECT, INSERT ON public.model_metrics TO authenticated;
GRANT ALL ON public.model_metrics TO service_role;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics readable" ON public.model_metrics FOR SELECT TO authenticated USING (true);
CREATE POLICY "metrics insert own" ON public.model_metrics FOR INSERT TO authenticated WITH CHECK (run_by = auth.uid());