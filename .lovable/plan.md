# Plan - Refine Closer Module Access and Interface

Refine the Closer module to ensure universal access for authorized active members (regardless of Master status) and simplify the interface to focus exclusively on the "Individual — Recuperação de Associados" flow.

## User Review Required

> [!IMPORTANT]
> The Closer module will now be accessible to any user with the `use_closer` permission who is an active member of the tenant. The interface will be further simplified by removing the header toggles in `CloserPanel`.

## Proposed Changes

### 1. Frontend: Permissions & Route Protection
- **File:** `src/pages/Atendimento.tsx`
  - Update `canAccessCloser` to strictly follow the logic: `(isMaster || hasPermission("use_closer")) && isActiveTenantMember`.
  - Ensure `isActiveTenantMember` validates both account status and tenant alignment.

### 2. Frontend: Closer Module UI
- **File:** `src/components/closer/CloserPanel.tsx`
  - Remove the "Ligação" and "WhatsApp" toggle from the header.
  - Simplify the header to just show the title "Closer — Recuperação de Associados".
  - Ensure only `SaveCarIndividual` is rendered.
- **File:** `src/components/closer/SaveCarIndividual.tsx`
  - Verify container height and overflow settings to guarantee vertical scrolling to the end of the script.
  - Maintain all internal functional buttons (Copy, WhatsApp, etc.).

### 3. Frontend: Hook Logic
- **File:** `src/hooks/usePermissions.ts`
  - Ensure the `use_closer` permission key is correctly mapped and accessible to non-master roles if assigned.

## Technical Details
- The `isActiveTenantMember` check uses `profile.company_id === activeCompanyId` to prevent cross-tenant access even if a user has a global `use_closer` permission.
- The `SaveCarIndividual` component will be the primary entry point, eliminating the need for `CloserPanel` to manage multiple playbooks or channels.
