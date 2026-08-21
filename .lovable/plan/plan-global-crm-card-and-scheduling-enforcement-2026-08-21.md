# Plan - Global CRM Card and Scheduling Enforcement

Ensure that the recent CRM Kanban improvements (dynamic colors, real-time scheduling status, and activity reminders) are applied globally for all users and tenants without any hardcoded restrictions.

## Technical Details

### 1. Unified CRM Kanban Global State
- Review and remove any remaining hardcoded tenant fallbacks in `CrmKanbanBoard.tsx`.
- Ensure `leadSchedule.ts` logic is consistently applied to all cards regardless of tenant.

### 2. Activity Reminders Validation
- Verify that the `process-activity-reminders` edge function remains tenant-agnostic (it already uses `servidor_id` from the activity/reminder).
- Confirm that notification sounds and browser toasts are enabled for all users via `useActivityReminders.ts`.

### 3. Cleanup
- Remove the "Kamilla" workspace fallback name in `CrmKanbanBoard.tsx` to use the dynamic `activeWorkspace.name` exclusively.

## Proposed Changes

### Frontend
- **src/components/atendimento/CrmKanbanBoard.tsx**: Remove the "Kamilla" name fallback.
- **src/utils/leadSchedule.ts**: (Already generic, no changes needed).
- **src/hooks/useActivityReminders.ts**: Ensure the sound notification logic is active for all.

### Backend
- No changes needed to `process-activity-reminders` as it is already multi-tenant compatible.
