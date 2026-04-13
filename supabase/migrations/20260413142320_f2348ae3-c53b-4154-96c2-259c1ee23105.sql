
-- Clean up invalid rows before adding constraints
UPDATE public.user_workspace_permissions
SET can_edit = false, can_delete = false
WHERE can_view = false AND (can_edit = true OR can_delete = true);

UPDATE public.user_workspace_permissions
SET can_delete = false
WHERE can_edit = false AND can_delete = true;

-- Remove duplicate rows keeping only the latest
DELETE FROM public.user_workspace_permissions a
USING public.user_workspace_permissions b
WHERE a.id < b.id
  AND a.tenant_id = b.tenant_id
  AND a.user_id = b.user_id
  AND a.workspace_id = b.workspace_id;

-- Add unique constraint
ALTER TABLE public.user_workspace_permissions
  ADD CONSTRAINT uq_user_workspace_perm UNIQUE (tenant_id, user_id, workspace_id);

-- Add check constraints for integrity
ALTER TABLE public.user_workspace_permissions
  ADD CONSTRAINT chk_edit_requires_view CHECK (can_view = true OR can_edit = false),
  ADD CONSTRAINT chk_delete_requires_edit CHECK (can_edit = true OR can_delete = false);
