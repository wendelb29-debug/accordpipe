
-- Add servidor_id to announcements for multi-tenant isolation
ALTER TABLE public.announcements ADD COLUMN servidor_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

-- Drop old permissive policies
DROP POLICY IF EXISTS "Admins can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;

-- Admins can manage announcements for their own servidor
CREATE POLICY "Admins can manage own servidor announcements"
ON public.announcements
FOR ALL
USING (
  is_master(auth.uid()) 
  OR (is_admin(auth.uid()) AND servidor_id = get_user_company_id(auth.uid()))
)
WITH CHECK (
  is_master(auth.uid()) 
  OR (is_admin(auth.uid()) AND servidor_id = get_user_company_id(auth.uid()))
);

-- All authenticated users can view active announcements from their servidor (or master sees all)
CREATE POLICY "Users can view own servidor announcements"
ON public.announcements
FOR SELECT
USING (
  is_active = true 
  AND (
    is_master(auth.uid()) 
    OR servidor_id = get_user_company_id(auth.uid())
  )
);
