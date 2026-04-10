
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "CEO can manage catalog items" ON public.proposal_catalog_items;

-- Create a new policy that allows CEO for own company OR master users for any company
CREATE POLICY "CEO or Master can manage catalog items"
ON public.proposal_catalog_items
FOR ALL
TO authenticated
USING (
  (servidor_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'ceo'::app_role))
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true))
)
WITH CHECK (
  (servidor_id = get_user_company_id(auth.uid()) AND has_role(auth.uid(), 'ceo'::app_role))
  OR
  (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_master = true))
);
