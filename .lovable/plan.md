# Plan: Unified Tenant Identity & Secure Resolution

Standardize multi-tenant branding and identity across the system by centralizing tenant resolution in `AuthContext` and applying brand colors/logos globally through CSS variables.

## User Review Required

> [!IMPORTANT]
> The current implementation uses a `servidor_id` column in `companies` to distinguish child tenants from the master tenant. Master users will see the default Accord theme when in their own tenant, but will inherit the child tenant's theme when switching to one.

- Does the current `is_master` check in `profiles` sufficiently cover all admin roles, or should we strictly separate "Global Master" from "Tenant CEO"? (The plan adopts the request's split: `isMaster`, `isGlobalMaster`, `isCeo`).
- Are there any specific pages where brand colors should NOT apply (e.g., error pages, public landing pages)?

## Proposed Changes

### Core Logic & Resolution
#### [AuthContext.tsx]
- Centralize `effectiveCompanyId` logic.
- Regular users: `profile.company_id`.
- Master users: `activeCompanyId` (from localStorage `accord_active_company`), validated against `companies` list.
- Block private rendering (`AppLayout`) until `effectiveCompanyId` is resolved.
- Enhance logout to clear all tenant-specific state, colors, and local storage.

#### [useActiveCompanyId.ts]
- Refactor to return `effectiveCompanyId` from `AuthContext` as the single source of truth.

### Identity & Branding
#### [ThemeSync.tsx]
- Load brand colors and metadata (`brand_logo_url`, `nome_fantasia`) for `effectiveCompanyId`.
- Map colors to global CSS variables (`--primary`, `--sidebar-background`, etc.).
- Ensure Master users on the global console get the default Accord theme.
- Add an event listener for `brand-colors-updated` to trigger re-sync.

#### [useTenantLogo.ts]
- Standardize logo resolution (signed URLs for private buckets, public fallback).
- Clear logo state immediately on `tenant-switched`.

#### [Sidebar.tsx] & [MobileSidebar.tsx]
- Remove hardcoded emerald/indigo colors.
- Use `--sidebar-background`, `--sidebar-primary`, and `--sidebar-foreground`.
- Display tenant logo and name (`nome_fantasia`) dynamically.

### Security & Migrations
#### [Database/RLS]
- Create a migration to audit `profiles` without `company_id`.
- Ensure `crm_leads`, `workspaces`, and `closer_sessions` strictly filter by the `effectiveCompanyId` (validated on backend).

## Technical Details
- **CSS Tokens:** Centralize all brand mappings in `ThemeSync.tsx` applying to `:root`.
- **Contrast Logic:** Use existing HSL calculation functions to ensure text legibility over brand backgrounds.
- **Event Bus:** Use `window.dispatchEvent(new CustomEvent('tenant-switched'))` for cross-component reloads.
- **Type Safety:** Ensure all company safe columns are included in `AuthContext` fetches.

## Alternative Considerations
- **Context vs Hook:** We considered keeping resolution in a hook, but `AuthContext` is better to prevent "flashes" of wrong tenants during the initial load since it wraps the entire app.
