/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'
import { template as contractSignatureRequest } from './contract-signature-request.tsx'
import { template as contractSignedCopy } from './contract-signed-copy.tsx'
import { template as activityReminder } from './activity-reminder.tsx'
import { template as newLeadNotification } from './new-lead-notification.tsx'
import { template as passwordResetCode } from './password-reset-code.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: any) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contract-signature-request': contractSignatureRequest,
  'contract-signed-copy': contractSignedCopy,
  'activity-reminder': activityReminder,
  'new-lead-notification': newLeadNotification,
  'password-reset-code': passwordResetCode,
}
