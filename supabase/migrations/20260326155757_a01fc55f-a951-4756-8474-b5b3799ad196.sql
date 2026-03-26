
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_assigned_at timestamp with time zone DEFAULT now();

ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS documento text;
