
-- Create catalog items table for proposal products
CREATE TABLE public.proposal_catalog_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  servidor_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_catalog_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users in the same company can view items
CREATE POLICY "Users can view catalog items of their company"
  ON public.proposal_catalog_items
  FOR SELECT
  TO authenticated
  USING (servidor_id = public.get_user_company_id(auth.uid()));

-- Only admin/master/ceo can manage items
CREATE POLICY "Admins can manage catalog items"
  ON public.proposal_catalog_items
  FOR ALL
  TO authenticated
  USING (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (
      public.is_master(auth.uid())
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'ceo')
    )
  )
  WITH CHECK (
    servidor_id = public.get_user_company_id(auth.uid())
    AND (
      public.is_master(auth.uid())
      OR public.is_admin(auth.uid())
      OR public.has_role(auth.uid(), 'ceo')
    )
  );
