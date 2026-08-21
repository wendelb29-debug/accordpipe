# Plan: CRM Card Isolation by Responsible

Implement secure multi-tenant isolation of CRM cards based on a new "responsible" field, ensuring standard users only see their own cards while supervisors (Admin, CEO, Master) maintain full visibility with filtering capabilities.

## User Review Required

> [!IMPORTANT]
> The new security model will hide all leads from users if they aren't explicitly assigned. I will initialize `assigned_to_user_id` with `created_by_user_id` for all existing leads to ensure no data is lost during the transition.

- **Standard User**: Will only see cards where `assigned_to_user_id` matches their ID.
- **Supervisor (Admin/CEO/Master)**: Sees a new user selector in the Kanban/Search views to filter by any team member or "All users".

## Proposed Changes

### Database & Security (Supabase)

- Add `assigned_to_user_id` column to `crm_leads` (references `auth.users`).
- Update existing leads: `UPDATE crm_leads SET assigned_to_user_id = created_by_user_id WHERE assigned_to_user_id IS NULL`.
- Harden RLS policies on `crm_leads`:
    - Standard users: `(assigned_to_user_id = auth.uid())` AND `(servidor_id = current_tenant_id)`.
    - Supervisors: `(servidor_id = current_tenant_id)` (access to all within tenant).
- Create RPC `get_workspace_team_members` to fetch only users belonging to the active tenant/workspace for the selector.

### Frontend Integration

#### 1. Hooks & Contexts
- **`useCrmLeads.ts`**:
    - Update `CrmLead` interface.
    - Accept `filterUserId` parameter.
    - Update query logic to use `assigned_to_user_id` for both security (query filter) and UI filtering.
- **`WorkspaceContext.tsx`**: Ensure active workspace state is consistently available for member lookups.

#### 2. Components
- **`CrmKanbanBoard.tsx`**:
    - Move user filtering from client-side to the hook (server-side).
    - Refactor `teamMembers` to only show users from the current workspace/tenant.
    - Add user selector for supervisors.
- **`FilterPanel.tsx`**: Ensure the "Responsável" filter uses the new `assigned_to_user_id` field.
- **`CrmLeadDialog.tsx` & `CrmLeadDetailView.tsx`**:
    - Add a "Responsável" field to the UI to allow changing the owner of a lead.
- **`ImportarPlanilha.tsx`**: Ensure imported leads are correctly assigned (defaulting to the importer or the distributed user).

## Technical Details

- **RLS Migration**:
  ```sql
  ALTER TABLE public.crm_leads ADD COLUMN assigned_to_user_id uuid REFERENCES auth.users(id);
  UPDATE public.crm_leads SET assigned_to_user_id = created_by_user_id;
  -- Update policies to use assigned_to_user_id for visibility
  ```
- **Type Safety**: Update `types.ts` (via Supabase sync if possible, or manual interface updates) to include the new field.
- **RPC for Team Members**: Use a security definer function to avoid recursive RLS issues when fetching profiles for the selector.
