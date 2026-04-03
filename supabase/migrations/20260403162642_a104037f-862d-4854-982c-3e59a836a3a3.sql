
CREATE TABLE public.drive_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  servidor_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.drive_files(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'file' CHECK (type IN ('file', 'folder')),
  file_url text,
  file_path text,
  file_size bigint,
  file_type text,
  status text NOT NULL DEFAULT 'normal' CHECK (status IN ('normal', 'signing', 'signed', 'cancelled')),
  contract_id uuid REFERENCES public.pdf_contracts(id) ON DELETE SET NULL,
  created_by_user_id uuid,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;

-- Function to get servidor from drive_files without recursion
CREATE OR REPLACE FUNCTION public.get_drive_file_servidor(_file_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT servidor_id FROM public.drive_files WHERE id = _file_id LIMIT 1
$$;

-- Admin/CEO/Master can manage
CREATE POLICY "Admin/CEO/Master can manage drive files"
ON public.drive_files
FOR ALL
TO authenticated
USING (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND servidor_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  is_master(auth.uid()) OR (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'ceo'))
    AND servidor_id = get_user_company_id(auth.uid())
  )
);

-- Users can view files in their servidor
CREATE POLICY "Users can view drive files"
ON public.drive_files
FOR SELECT
TO authenticated
USING (
  is_master(auth.uid()) OR servidor_id = get_user_company_id(auth.uid())
);

-- Operador can insert files
CREATE POLICY "Operador can upload drive files"
ON public.drive_files
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operador') AND servidor_id = get_user_company_id(auth.uid())
);
