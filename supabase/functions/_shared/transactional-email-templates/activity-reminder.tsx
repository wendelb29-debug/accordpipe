import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from '../email-templates/_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  activityTitle: string
  activityType?: string
  companyName: string
  activityTime: string
  duration?: string
  description?: string
  activityLink: string
  userName?: string
}

const Email = ({
  activityTitle,
  activityType,
  companyName,
  activityTime,
  duration,
  description,
  activityLink,
  userName,
}: Props) => {
  const greet = userName ? `Olá, ${userName}!` : 'Olá!'
  const details = [
    `Atividade: ${activityTitle}`,
    activityType ? `Tipo: ${activityType}` : null,
    `Empresa: ${companyName}`,
    `Horário: ${activityTime}`,
    duration ? `Duração: ${duration}` : null,
    description ? `Descrição: ${description}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const body = `${greet} Sua próxima atividade está se aproximando. ${details}. Abra a atividade para revisar os detalhes e se preparar.`

  return (
    <AccordEmailLayout
      preview={`Lembrete: ${activityTitle} — ${activityTime}`}
      emoji="🔔"
      title="Lembrete de Atividade"
      body={body}
      buttonText="Abrir atividade"
      confirmationUrl={activityLink}
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `🔔 Lembrete: ${d.activityTitle}`,
  displayName: 'Lembrete de Atividade',
  previewData: {
    activityTitle: 'Reunião de apresentação',
    activityType: 'Reunião',
    companyName: 'Nova Aura',
    activityTime: '23/06/2026 14:00',
    duration: '00:30',
    description: 'Discutir proposta inicial.',
    activityLink: 'https://accordpipe.com.br',
    userName: 'Maria',
  },
} satisfies TemplateEntry

export default Email
