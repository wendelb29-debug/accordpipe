
-- Add servidor_id to companies (parent-child: servidor -> empresas)
ALTER TABLE public.companies ADD COLUMN servidor_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_companies_servidor_id ON public.companies(servidor_id);

-- Drop old SELECT policy
DROP POLICY IF EXISTS "Users can view their company or master sees all" ON public.companies;

-- New SELECT: master sees all, others see own servidor + empresas under it
CREATE POLICY "Users can view their company or master sees all"
ON public.companies
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid()) 
  OR id = get_user_company_id(auth.uid())
  OR servidor_id = get_user_company_id(auth.uid())
);

-- Update INSERT policy to scope to servidor
DROP POLICY IF EXISTS "Admin/operador can insert companies" ON public.companies;
CREATE POLICY "Admin/operador can insert companies"
ON public.companies
FOR INSERT
TO authenticated
WITH CHECK (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND servidor_id = get_user_company_id(auth.uid())
  )
);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Admin/operador can update companies" ON public.companies;
CREATE POLICY "Admin/operador can update companies"
ON public.companies
FOR UPDATE
TO authenticated
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
    AND (id = get_user_company_id(auth.uid()) OR servidor_id = get_user_company_id(auth.uid()))
  )
);
