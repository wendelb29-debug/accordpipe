
ALTER TABLE public.whatsapp_chats
  ADD COLUMN IF NOT EXISTS group_is_announce boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_join_approval_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS group_member_add_mode text NOT NULL DEFAULT 'all_member_add' CHECK (group_member_add_mode IN ('admin_add','all_member_add')),
  ADD COLUMN IF NOT EXISTS group_invite_link text,
  ADD COLUMN IF NOT EXISTS instance_is_admin boolean NOT NULL DEFAULT false;
