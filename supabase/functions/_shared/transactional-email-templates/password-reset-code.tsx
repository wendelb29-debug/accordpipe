/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  code: string
  name?: string
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const heading = { color: '#0D1117', fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }
const paragraph = { color: '#374151', fontSize: '14px', lineHeight: '22px', margin: '0 0 16px' }
const codeBox = {
  background: '#F2F0FF',
  border: '1px solid #D9D2FF',
  borderRadius: '12px',
  padding: '18px 24px',
  textAlign: 'center' as const,
  margin: '20px 0',
}
const codeText = {
  color: '#2563EB',
  fontSize: '32px',
  fontWeight: 800,
  letterSpacing: '8px',
  margin: 0,
  fontFamily: 'Menlo, Consolas, monospace',
}
const small = { color: '#6B7280', fontSize: '12px', lineHeight: '18px', margin: '8px 0 0' }

const Email = ({ code, name }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Seu código de verificação Accord</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Código de verificação</Heading>
        <Text style={paragraph}>
          {name ? `Olá, ${name}.` : 'Olá.'} Recebemos um pedido para redefinir sua senha. Use o código abaixo para concluir:
        </Text>
        <Section style={codeBox}>
          <Text style={codeText}>{code}</Text>
        </Section>
        <Text style={paragraph}>
          Este código expira em <strong>10 minutos</strong> e pode ser usado uma única vez.
        </Text>
        <Text style={small}>
          Se você não solicitou esta alteração, ignore este e-mail — sua senha permanece a mesma.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Seu código Accord: ${d.code}`,
  displayName: 'Código de verificação (senha)',
  previewData: { code: '123456', name: 'Maria' },
} satisfies TemplateEntry
