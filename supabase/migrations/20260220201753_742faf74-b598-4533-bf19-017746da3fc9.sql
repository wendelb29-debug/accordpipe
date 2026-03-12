
-- Add company_id to profiles (nullable for master user who sees all)
ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_company_id ON public.profiles(company_id);

-- Create a security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Create function to check if user is master
-- (already exists, but let's ensure it works)

-- Update companies RLS: non-master users only see their own company
DROP POLICY IF EXISTS "Authenticated users can view companies" ON public.companies;
CREATE POLICY "Users can view their company or master sees all"
ON public.companies FOR SELECT
USING (
  is_master(auth.uid()) 
  OR is_admin(auth.uid())
  OR id = get_user_company_id(auth.uid())
);

-- Update payments RLS: filter by company
DROP POLICY IF EXISTS "Admins can view payments" ON public.payments;
CREATE POLICY "Users can view payments for their company"
ON public.payments FOR SELECT
USING (
  is_master(auth.uid())
  OR is_admin(auth.uid())
  OR company_id = get_user_company_id(auth.uid())
);

-- Update documents RLS: filter by company
DROP POLICY IF EXISTS "Authenticated users can view documents" ON public.documents;
CREATE POLICY "Users can view documents for their company"
ON public.documents FOR SELECT
USING (
  is_master(auth.uid())
  OR is_admin(auth.uid())
  OR company_id = get_user_company_id(auth.uid())
);

-- Update contracts RLS: keep public view for signing but restrict listing
-- The existing SELECT policy is open for signing tokens, keep it as is

-- Update announcements RLS: these are global, keep as is

-- Update support_requests RLS: these are per user, keep as is
