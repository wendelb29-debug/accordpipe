---
name: Tenant creation restricted to master context or enabled resellers
description: Only the master user operating in the master tenant context, or explicitly enabled resellers, can see/create tenants
type: constraint
---
Creating tenants by Master does NOT make the child tenant a reseller. A tenant gains reseller capabilities ONLY when explicitly promoted (is_reseller=true, reseller_panel_enabled=true).

**Tenants tab visibility**: Only visible when (isMasterTenantAdmin AND active company is master tenant [servidor_id IS NULL]) or (active company is reseller with reseller_panel_enabled=true).

**Sidebar masterOnly items**: Must check both is_master AND isActiveMasterTenant (servidor_id === null on active company).

**Why:** Prevents privilege escalation where regular tenants could create child tenants without authorization.
