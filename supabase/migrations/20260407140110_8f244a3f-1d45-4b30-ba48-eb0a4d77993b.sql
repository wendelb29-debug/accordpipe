CREATE POLICY "Users can delete signers for own pending contracts"
ON public.contract_signatures
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.contracts c
    WHERE c.id = contract_signatures.contract_id
      AND c.signature_status = 'pending'
      AND (
        public.is_master(auth.uid())
        OR (
          (
            public.has_role(auth.uid(), 'admin'::public.app_role)
            OR public.has_role(auth.uid(), 'operador'::public.app_role)
            OR public.has_role(auth.uid(), 'ceo'::public.app_role)
          )
          AND c.company_id = public.get_user_company_id(auth.uid())
        )
      )
  )
);