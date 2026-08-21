DROP POLICY IF EXISTS closer_sessions_owner ON public.closer_sessions;
DROP POLICY IF EXISTS closer_events_owner ON public.closer_session_events;

CREATE POLICY "Users can delete their own closer sessions"
ON public.closer_sessions FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'ceo'::app_role)
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_master = true)
);

CREATE POLICY "Users can update events of their sessions"
ON public.closer_session_events FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.closer_sessions s WHERE s.id = closer_session_events.session_id AND s.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.closer_sessions s WHERE s.id = closer_session_events.session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can delete events of their sessions"
ON public.closer_session_events FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.closer_sessions s
    WHERE s.id = closer_session_events.session_id
      AND (s.user_id = auth.uid()
        OR has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'ceo'::app_role)
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_master = true))
  )
);