
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS won_destination text NULL,
  ADD COLUMN IF NOT EXISTS won_target_workspace_id uuid NULL;

-- Validation trigger (avoid CHECK for FK-style rules)
CREATE OR REPLACE FUNCTION public.validate_workspace_won_destination()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.won_destination IS NOT NULL
     AND NEW.won_destination NOT IN ('cadastro', 'workspace', 'base_clientes') THEN
    RAISE EXCEPTION 'won_destination must be one of: cadastro, workspace, base_clientes';
  END IF;

  IF NEW.won_destination = 'workspace' THEN
    IF NEW.won_target_workspace_id IS NULL THEN
      RAISE EXCEPTION 'won_target_workspace_id is required when won_destination = workspace';
    END IF;
    IF NEW.won_target_workspace_id = NEW.id THEN
      RAISE EXCEPTION 'won_target_workspace_id cannot reference the same workspace';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_workspace_won_destination ON public.workspaces;
CREATE TRIGGER trg_validate_workspace_won_destination
BEFORE INSERT OR UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_won_destination();
