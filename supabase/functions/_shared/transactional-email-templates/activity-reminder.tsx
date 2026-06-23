import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
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
}: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{`Lembrete: ${activityTitle} - ${activityTime}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🔔 Lembrete de Atividade</Heading>
        <Text style={greet}>{userName ? `Olá, ${userName}.` : 'Olá.'}</Text>
        <Text style={lead}>
          Sua próxima atividade está se aproximando.
        </Text>

        <Section style={card}>
          <Text style={cardLabel}>Atividade</Text>
          <Text style={cardValue}>{activityTitle}</Text>

          {activityType ? (
            <>
              <Text style={cardLabel}>Tipo</Text>
              <Text style={cardValue}>{activityType}</Text>
            </>
          ) : null}

          <Text style={cardLabel}>Empresa</Text>
          <Text style={cardValue}>{companyName}</Text>

          <Text style={cardLabel}>Horário</Text>
          <Text style={cardValue}>{activityTime}</Text>

          {duration ? (
            <>
              <Text style={cardLabel}>Duração</Text>
              <Text style={cardValue}>{duration}</Text>
            </>
          ) : null}

          {description ? (
            <>
              <Text style={cardLabel}>Descrição</Text>
              <Text style={cardValue}>{description}</Text>
            </>
          ) : null}
        </Section>

        <Section style={{ textAlign: 'center', marginTop: 24 }}>
          <Button href={activityLink} style={btn}>
            Abrir atividade
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>
          Este é um lembrete automático do Accord. Você pode ajustar os canais
          de notificação ao agendar a atividade.
        </Text>
      </Container>
    </Body>
  </Html>
)

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
