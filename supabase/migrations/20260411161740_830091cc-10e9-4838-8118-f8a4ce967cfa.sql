-- Create user_tenants table for multi-tenant user linking
CREATE TABLE public.user_tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operador',
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Users can see their own tenant links
CREATE POLICY "Users can view own tenant links"
ON public.user_tenants FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins/masters can view all tenant links for their tenant
CREATE POLICY "Admins can view tenant links"
ON public.user_tenants FOR SELECT TO authenticated
USING (tenant_id = public.get_user_company_id(auth.uid()));

-- Allow inserts via service role (edge function)
CREATE POLICY "Service role can insert tenant links"
ON public.user_tenants FOR INSERT TO authenticated
WITH CHECK (
  public.is_master(auth.uid()) OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'ceo')
);

-- Allow updates via admins
CREATE POLICY "Admins can update tenant links"
ON public.user_tenants FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid()) AND (
    public.is_master(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ceo')
  )
);

-- Allow deletes via admins
CREATE POLICY "Admins can delete tenant links"
ON public.user_tenants FOR DELETE TO authenticated
USING (
  tenant_id = public.get_user_company_id(auth.uid()) AND (
    public.is_master(auth.uid()) OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'ceo')
  )
);

-- Index for fast lookups
CREATE INDEX idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_tenants_updated_at
BEFORE UPDATE ON public.user_tenants
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Backfill: create user_tenants entries for all existing profiles with company_id
INSERT INTO public.user_tenants (user_id, tenant_id, role, status)
SELECT p.user_id, p.company_id,
  COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id LIMIT 1), 'operador'),
  p.status
FROM public.profiles p
WHERE p.company_id IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;