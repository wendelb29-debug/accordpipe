-- Update Kamilla's permission
UPDATE public.user_custom_permissions 
SET granted = true 
WHERE user_id = '41213ffe-e15b-4bba-89f6-e36c7d27b76a' 
  AND permission_key = 'use_closer';

-- Set default permissions for common roles
INSERT INTO public.role_default_permissions (role, module, permission_key, data_scope) 
VALUES 
  ('comercial', 'closer_sdr', 'use_closer', 'own'),
  ('admin', 'closer_sdr', 'use_closer', 'all'),
  ('ceo', 'closer_sdr', 'use_closer', 'all'),
  ('master', 'closer_sdr', 'use_closer', 'all')
ON CONFLICT (role, permission_key) DO UPDATE SET data_scope = EXCLUDED.data_scope;
