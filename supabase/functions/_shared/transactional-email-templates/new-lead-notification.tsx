import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
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
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Novo lead: ${contactName ? contactName + ' · ' : ''}${companyName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>✨ Novo Lead recebido</Heading>
        <Text style={greet}>{userName ? `Olá, ${userName}.` : 'Olá.'}</Text>
        <Text style={lead}>
          Um novo lead acaba de entrar no seu pipeline.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Empresa</Text>
          <Text style={cardValue}>{companyName}</Text>

          {contactName ? (
            <>
              <Text style={cardLabel}>Contato</Text>
              <Text style={cardValue}>{contactName}</Text>
            </>
          ) : null}

          {workspaceName ? (
            <>
              <Text style={cardLabel}>Workspace</Text>
              <Text style={cardValue}>{workspaceName}</Text>
            </>
          ) : null}

          {leadOrigin ? (
            <>
              <Text style={cardLabel}>Origem</Text>
              <Text style={cardValue}>{leadOrigin}</Text>
            </>
          ) : null}
        </Section>

        <Section style={{ textAlign: 'center', marginTop: 24 }}>
          <Button href={leadLink} style={btn}>Abrir no pipeline</Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Notificação automática do Accord. Ajuste seus canais em Configurações.
        </Text>
      </Container>
    </Body>
  </Html>
)

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

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', color: '#0F172A' }
const container = { padding: '24px 28px', maxWidth: 560, margin: '0 auto' }
const h1 = { fontSize: 22, fontWeight: 700, margin: '0 0 12px', color: '#0F172A' }
const greet = { fontSize: 14, margin: '0 0 4px', color: '#0F172A' }
const lead = { fontSize: 14, margin: '0 0 16px', color: '#475569' }
const card = {
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  padding: '16px 18px',
  border: '1px solid #E2E8F0',
}
const cardLabel = { fontSize: 11, textTransform: 'uppercase' as const, color: '#64748B', margin: '8px 0 2px', letterSpacing: 0.4 }
const cardValue = { fontSize: 14, color: '#0F172A', margin: '0 0 6px', fontWeight: 600 }
const btn = {
  backgroundColor: '#10B981',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}
const hr = { borderColor: '#E2E8F0', margin: '24px 0 12px' }
const footer = { fontSize: 11, color: '#94A3B8', textAlign: 'center' as const }
