DROP POLICY "Admins can manage catalog items" ON public.proposal_catalog_items;

CREATE POLICY "CEO can manage catalog items"
ON public.proposal_catalog_items
FOR ALL
USING (
  servidor_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ceo'::app_role)
)
WITH CHECK (
  servidor_id = get_user_company_id(auth.uid())
  AND has_role(auth.uid(), 'ceo'::app_role)
);