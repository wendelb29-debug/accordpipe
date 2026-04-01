
DROP POLICY "Admin/operador can insert companies" ON public.companies;
CREATE POLICY "Admin/operador can insert companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (
    is_master(auth.uid()) OR (
      (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operador'::app_role))
      AND (
        servidor_id = get_user_company_id(auth.uid())
        OR servidor_id IS NULL
      )
    )
  );
