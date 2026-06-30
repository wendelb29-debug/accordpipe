GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_leads TO authenticated;
GRANT ALL ON public.sdr_leads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sdr_sequence_events TO authenticated;
GRANT ALL ON public.sdr_sequence_events TO service_role;