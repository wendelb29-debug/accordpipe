---
name: Reseller White Label Architecture
description: Multi-level tenant hierarchy with platform_master, reseller, and standard tenant types for white-label SaaS
type: feature
---
- `companies` table has: tenant_type (platform_master/reseller/standard), parent_tenant_id, created_by_tenant_id, can_create_tenants, can_manage_child_tenants, max_child_tenants, is_reseller
- Helper functions: is_reseller_of, get_tenant_type, count_child_tenants, reseller_can_add_child
- Permissions: create/view/edit/delete_child_tenants, manage_child_tenant_subscription/users, view_child_tenant_usage/billing
- Only Master/CEO can toggle reseller mode on a tenant (ResellerTab in tenant edit dialog)
- Resellers access "Meus Tenants" page (/meus-tenants) to manage child tenants
- Child tenants are linked via parent_tenant_id and created_by_tenant_id
- Reseller isolation: can only see tenants where parent_tenant_id or created_by_tenant_id matches
