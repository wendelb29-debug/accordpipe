-- Drop existing policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete non-master profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Recreate profiles policies with tenant isolation
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view profiles in their company"
ON public.profiles FOR SELECT
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert profiles in their company"
ON public.profiles FOR INSERT
WITH CHECK (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
  )
);

CREATE POLICY "Admins can update profiles in their company"
ON public.profiles FOR UPDATE
USING (
  is_master(auth.uid())
  OR (auth.uid() = user_id)
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete non-master profiles in their company"
ON public.profiles FOR DELETE
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND company_id = get_user_company_id(auth.uid())
    AND is_master = false
  )
);

-- Drop existing policies on user_roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Create a helper function to get user company from user_id (not auth.uid)
CREATE OR REPLACE FUNCTION public.get_profile_company_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Recreate user_roles policies with tenant isolation
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view roles in their company"
ON public.user_roles FOR SELECT
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND get_profile_company_id(user_id) = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can insert roles in their company"
ON public.user_roles FOR INSERT
WITH CHECK (
  is_master(auth.uid())
  OR (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
);

CREATE POLICY "Admins can update roles in their company"
ON public.user_roles FOR UPDATE
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND get_profile_company_id(user_id) = get_user_company_id(auth.uid())
  )
);

CREATE POLICY "Admins can delete roles in their company"
ON public.user_roles FOR DELETE
USING (
  is_master(auth.uid())
  OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND get_profile_company_id(user_id) = get_user_company_id(auth.uid())
    AND NOT is_master(user_id)
  )
);