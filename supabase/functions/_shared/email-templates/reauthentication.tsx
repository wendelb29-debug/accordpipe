/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme sua identidade na Accord</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Container style={card}>
          <Section style={header}>
            <Heading style={brand}>ACCORD</Heading>
            <Text style={tagline}>PLATAFORMA EMPRESARIAL</Text>
          </Section>

          <Section style={bodySection}>
            <Heading as="h2" style={h2}>
              Confirme sua identidade 🛡️
            </Heading>
            <Text style={bodyText}>
              Por segurança, precisamos confirmar sua identidade antes de
              prosseguir. Use o código abaixo:
            </Text>
            <Text style={codeStyle}>{token}</Text>
            <Text style={fallback}>
              Este código expira em breve. Se você não solicitou, ignore este
              email com segurança.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Este email foi enviado pela plataforma{' '}
              <strong style={footerBrand}>Accord</strong>.
              <br />
              <span style={copyright}>
                © 2026 Accord. Todos os direitos reservados.
              </span>
            </Text>
          </Section>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', Arial, sans-serif",
}
const outerContainer = { background: '#0f1117', padding: '40px 20px', width: '100%', maxWidth: '100%' }
const card = {
  width: '520px',
  maxWidth: '100%',
  backgroundColor: '#1a1d27',
  borderRadius: '16px',
  border: '1px solid #2a2d3a',
  overflow: 'hidden',
  margin: '0 auto',
}
const header = {
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  padding: '32px',
  textAlign: 'center' as const,
}
const brand = { margin: 0, color: '#ffffff', fontSize: '22px', fontWeight: 700 as const, letterSpacing: '1px' }
const tagline = {
  margin: '6px 0 0',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}
const bodySection = { padding: '40px 36px' }
const h2 = { margin: '0 0 12px', color: '#ffffff', fontSize: '20px', fontWeight: 600 as const }
const bodyText = { margin: '0 0 28px', color: '#8b8fa8', fontSize: '14px', lineHeight: '1.7' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: '#ffffff',
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  letterSpacing: '8px',
  padding: '20px',
  borderRadius: '10px',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}
const fallback = { margin: '0', color: '#555870', fontSize: '12px', textAlign: 'center' as const, lineHeight: '1.6' }
const footer = {
  background: '#13151f',
  borderTop: '1px solid #2a2d3a',
  padding: '20px 36px',
  textAlign: 'center' as const,
}
const footerText = { margin: 0, color: '#444766', fontSize: '11px', lineHeight: '1.6' }
const footerBrand = { color: '#666990' }
const copyright = { color: '#333550' }
