# Unified Closer Module Integration Plan

Refactor the Closer module to remove hardcoded workspace/tenant restrictions and integrate the "Save Car Individual" recovery flow with database-driven scripts and tenant-specific branding.

## User Review Required

> [!IMPORTANT]
> The plan removes all "Kamilla" and "Master" specific logic in favor of a permission-based system (`use_closer`). Playbooks will be loaded from the database based on the active tenant and workspace.

- **Permission Change**: All users with `use_closer` permission will see the Closer tab if enabled for the workspace.
- **Data Source**: Hardcoded scripts in `SaveCarIndividual.tsx` will be removed; they must exist in `closer_playbooks`, `closer_scripts`, and `closer_script_branches`.
- **Database Update**: I will provide a migration to ensure the "Save Car — Recuperação de Associados" playbook exists globally (or per tenant if required).

## Technical Details

### 1. Database & Migrations
- Update `closer_playbooks` and related tables to ensure the "Save Car" recovery flow is available.
- Create a migration to populate standard variables if missing.
- Refine RLS on `closer_sessions` and `closer_session_events` to strictly enforce `tenant_id` and `workspace_id`.

### 2. Logic Refactoring
- **`src/hooks/useCloser.ts`**:
    - Update `queryKey` to `["closer-playbooks", tenantId, workspaceId]`.
    - Filter playbooks by `tenant_id` (or global where `tenant_id` is null).
- **`src/pages/Atendimento.tsx`**:
    - Remove `isKamillaWorkspace` and `canAccessKamillaTools`.
    - Add `hasCloserPermission` check using `usePermissions` or profile flags.
    - Render the "Closer" tab based on workspace module configuration.
- **`src/components/closer/SaveCarIndividual.tsx`**:
    - Remove all hardcoded blue-panel scripts.
    - Remove `isKamillaWorkspace`, `isMasterTenantAdmin`, and `showKamillaScripts`.
    - Implement variable replacement for `[Nome]`, `[Placa/Modelo]`, `[Telefone]`, `[Empresa]`, `[NomeVendedor]`, `[ValorIndicação]`.
    - Enhance WhatsApp URL generation with DDI `55` logic.

### 3. UI/UX & Branding
- Apply semantic Tailwind colors (e.g., `text-primary`, `bg-card`) to match the active tenant's theme defined in `ThemeSync.tsx`.
- Standardize the "Recuperação de Associados" card layout.
- Hide incomplete tabs (Cadência, Sorteio, etc.) if they lack actual implementation.

### 4. CRM Integration
- Ensure `syncToKanban` uses the normalized phone number and UUIDs instead of `Date.now()`.
- Record session events for every significant user action (copy, whatsapp, branch selection).
