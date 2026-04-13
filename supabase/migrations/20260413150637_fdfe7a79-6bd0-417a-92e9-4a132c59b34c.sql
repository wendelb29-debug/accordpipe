
-- Add new columns to performance_feedbacks
ALTER TABLE public.performance_feedbacks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS visualizado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visualizado_em timestamptz,
  ADD COLUMN IF NOT EXISTS comentario_usuario text,
  ADD COLUMN IF NOT EXISTS supervisor_name text;

-- Allow the user themselves to update their feedback (mark read, add comment, update status)
CREATE POLICY "perf_fb_user_update" ON public.performance_feedbacks
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND tenant_id = public.get_user_company_id(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND tenant_id = public.get_user_company_id(auth.uid()));
