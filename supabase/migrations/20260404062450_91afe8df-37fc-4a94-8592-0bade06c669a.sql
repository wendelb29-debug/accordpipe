
-- Create proposal_brands table
CREATE TABLE public.proposal_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  logo_path TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.proposal_brands ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can see brands from their servidor
CREATE POLICY "Users can view brands from their servidor"
  ON public.proposal_brands
  FOR SELECT
  TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

-- Only admin/master can manage brands
CREATE POLICY "Admins can manage brands"
  ON public.proposal_brands
  FOR ALL
  TO authenticated
  USING (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.is_admin(auth.uid()) OR public.is_master(auth.uid()))
  )
  WITH CHECK (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (public.is_admin(auth.uid()) OR public.is_master(auth.uid()))
  );

-- Updated_at trigger
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.proposal_brands
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
