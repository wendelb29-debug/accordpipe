import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from '../email-templates/_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  companyName: string
  contactName?: string
  workspaceName?: string
  leadOrigin?: string
  leadLink: string
  userName?: string
}

const Email = ({
  companyName,
  contactName,
  workspaceName,
  leadOrigin,
  leadLink,
  userName,
}: Props) => {
  const greet = userName ? `Olá, ${userName}!` : 'Olá!'
  const details = [
    `Empresa: ${companyName}`,
    contactName ? `Contato: ${contactName}` : null,
    workspaceName ? `Workspace: ${workspaceName}` : null,
    leadOrigin ? `Origem: ${leadOrigin}` : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const body = `${greet} Um novo lead acaba de entrar no seu pipeline. ${details}. Abra o card para qualificar e dar o próximo passo.`

  return (
    <AccordEmailLayout
      preview={`Novo lead: ${contactName ? contactName + ' · ' : ''}${companyName}`}
      emoji="✨"
      title="Novo Lead recebido"
      body={body}
      buttonText="Abrir lead no pipeline"
      confirmationUrl={leadLink}
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `✨ Novo Lead: ${d.companyName}`,
  displayName: 'Novo Lead',
  previewData: {
    companyName: 'Nova Aura',
    contactName: 'João Silva',
    workspaceName: 'Vendas Comercial',
    leadOrigin: 'Formulário',
    leadLink: 'https://accordpipe.com.br/atendimento',
    userName: 'Maria',
  },
} satisfies TemplateEntry
