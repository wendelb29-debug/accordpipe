/// <reference types="npm:@types/react@18.3.1" />
import type { ComponentType } from 'npm:react@18.3.1'
import { template as contractSignatureRequest } from './contract-signature-request.tsx'
import { template as activityReminder } from './activity-reminder.tsx'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, unknown>
  to?: string | ((data: any) => string)
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'contract-signature-request': contractSignatureRequest,
  'activity-reminder': activityReminder,
}
