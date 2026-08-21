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
  leadPhone?: string
  leadEmail?: string
  createdAt?: string
  responsibleName?: string
}

const Email = ({
  companyName,
  contactName,
  workspaceName,
  leadOrigin,
  leadLink,
  userName,
  leadPhone,
  leadEmail,
  createdAt,
  responsibleName,
}: Props) => {
  const greet = userName ? `Olá, ${userName}!` : 'Olá!'
  
  const leadInfo = [
    `Lead: ${contactName || 'Sem nome'}`,
    companyName ? `Empresa: ${companyName}` : null,
    leadOrigin ? `Origem: ${leadOrigin}` : null,
    createdAt ? `Recebido em: ${createdAt}` : null,
    responsibleName ? `Responsável: ${responsibleName}` : null,
    leadPhone ? `Telefone: ${leadPhone}` : null,
    leadEmail ? `E-mail: ${leadEmail}` : null,
  ].filter(Boolean)

  const body = `${greet} Um novo lead entrou no workspace ${workspaceName || 'comercial'}.\n\n` + 
               leadInfo.join('\n') + 
               '\n\nAcesse o Accord para visualizar e iniciar o atendimento.'

  return (
    <AccordEmailLayout
      preview={`Novo lead em ${workspaceName || 'Accord'}: ${contactName || companyName}`}
      emoji="✨"
      title="Novo Lead recebido"
      body={body}
      buttonText="Abrir lead"
      confirmationUrl={leadLink}
    />
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `Novo lead em ${d.workspaceName || 'Accord'} — ${d.contactName || d.companyName}`,
  displayName: 'Novo Lead',
  previewData: {
    companyName: 'Nova Aura',
    contactName: 'João Silva',
    workspaceName: 'Vendas Comercial',
    leadOrigin: 'Formulário',
    leadLink: 'https://accordpipe.com.br/atendimento',
    userName: 'Maria',
    leadPhone: '(11) 99999-9999',
    leadEmail: 'joao@exemplo.com',
    createdAt: '21/08/2026 10:00',
    responsibleName: 'Pedro Closer',
  },
} satisfies TemplateEntry

