---
name: Tenant Permission Hierarchy
description: Multi-tenant permission model separating global master, reseller tenant, and standard tenant access levels
type: feature
---
- `isGlobalMaster`: user has is_master=true AND active company has servidor_id=null (platform root). Full access to all tenants, tenant creation, reseller promotion, test tenants.
- `isResellerTenant`: active company has is_reseller=true AND reseller_panel_enabled=true. Can only see/create/manage own child tenants (parent_tenant_id match).
- `isMasterTenantAdmin` (legacy): just checks is_master flag on profile — NOT sufficient for global operations. Kept for backward compat but tenant-admin pages now use isGlobalMaster.
- Standard tenants: no tenant management access at all — sidebar items hidden, routes blocked.
- Gestão Tenants page (/gestao-tenants): restricted to isGlobalMaster only.
- Meus Tenants page (/meus-tenants): restricted to isResellerTenant only.
- Servidores page (/servidores): restricted to isGlobalMaster only.
- CompanyOption in AuthContext includes servidor_id and reseller_panel_enabled for runtime checks.
