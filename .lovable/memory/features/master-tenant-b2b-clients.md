---
name: Master Tenant B2B Client Architecture
description: Every tenant is automatically registered as a B2B client of the Master Tenant for centralized SaaS management
type: feature
---
- `master_tenant_clients` table links each tenant as a B2B client of the Master with subscription_status, payment_status, contracted_users, grace_days, grace_until, blocked_at, next_due_date
- `master_billing_history` table stores payment records per tenant (Asaas integration, PIX, boleto, link)
- Trigger `trg_auto_create_master_tenant_client` auto-creates the client record when a new tenant (company) is inserted
- `sync_master_client_user_count(_tenant_id)` RPC syncs active user counts
- `tenant_subscriptions` extended with: next_due_date, grace_days, grace_until, blocked_at, payment_status, last_payment_date, start_date, expires_at
- Page `/gestao-tenants` (GestaoTenants) provides master-only management with filters (status, cycle, type, due range) and KPI cards
- `TenantBillingBanner` in AppLayout shows overdue/suspended alerts to ALL users of affected tenants
- Master tenant admin users are excluded from billing banners
- Sidebar nav item "Gestão de Tenants" visible only to master tenant admins (masterOnly flag)
