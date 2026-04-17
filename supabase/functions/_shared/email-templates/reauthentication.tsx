/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://nglwgzknqgihlbkdnflu.supabase.co/storage/v1/object/public/email-assets/accord-logo.png'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>ACCORD — Confirme sua identidade</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Container style={card}>
          <Section style={headerSection}>
            <Img src={LOGO_URL} alt="ACCORD" width="200" height="auto" style={logo} />
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <span style={badge}>ENTERPRISE</span>
            </div>
          </Section>

          <Section style={bodySection}>
            <div style={iconBox}>🛡️</div>
            <Heading as="h2" style={h1}>Confirme sua identidade</Heading>
            <Text style={bodyText}>
              Por segurança, confirme sua identidade para continuar.
            </Text>

            <Text style={codeStyle}>{token}</Text>

            <Section style={securityBox}>
              <Text style={securityText}>
                🔒 <strong style={securityStrong}>Segurança:</strong> Se você
                não solicitou esta ação, ignore este e-mail.
              </Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerTitle}>ACCORD PLATAFORMA EMPRESARIAL</Text>
            <Text style={footerCopy}>© 2026 Accord. Todos os direitos reservados.</Text>
          </Section>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { margin: 0, padding: 0, backgroundColor: '#f0f2f8', fontFamily: "'Segoe UI', Arial, sans-serif" }
const outer = { background: '#f0f2f8', padding: '48px 20px', width: '100%', maxWidth: '100%' }
const card = {
  width: '520px',
  maxWidth: '100%',
  borderRadius: '20px',
  overflow: 'hidden',
  margin: '0 auto',
  boxShadow: '0 8px 40px rgba(37,99,235,0.12)',
}
const headerSection = {
  background: 'linear-gradient(135deg,#1a3a8f 0%,#2563EB 45%,#7A3FF2 100%)',
  padding: '40px 40px 32px',
  borderRadius: '20px 20px 0 0',
  textAlign: 'center' as const,
}
const logo = { display: 'block', margin: '0 auto', maxWidth: '200px', height: 'auto' }
const badge = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '10px',
  color: 'rgba(255,255,255,0.85)',
  letterSpacing: '2px',
}
const bodySection = { background: '#ffffff', padding: '48px 40px 36px', textAlign: 'center' as const }
const iconBox = {
  display: 'inline-block',
  background: 'linear-gradient(135deg,#1e3a8a,#4c1d95)',
  borderRadius: '16px',
  width: '56px',
  height: '56px',
  lineHeight: '56px',
  fontSize: '26px',
  marginBottom: '24px',
  color: '#ffffff',
}
const h1 = { margin: '0 0 12px', color: '#0f172a', fontSize: '24px', fontWeight: 700 as const, lineHeight: '1.3' }
const bodyText = { margin: '0 auto 28px', color: '#64748b', fontSize: '14px', lineHeight: '1.8', maxWidth: '380px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 700 as const,
  color: '#ffffff',
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  letterSpacing: '10px',
  padding: '20px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  margin: '0 0 16px',
}
const securityBox = {
  marginTop: '16px',
  background: '#f8faff',
  border: '1px solid #e2e8f0',
  borderLeft: '3px solid #7A3FF2',
  borderRadius: '10px',
  padding: '14px 16px',
  textAlign: 'left' as const,
}
const securityText = { margin: 0, color: '#64748b', fontSize: '12px', lineHeight: '1.6' }
const securityStrong = { color: '#334155' }
const footer = {
  background: '#f8faff',
  borderTop: '1px solid #e2e8f0',
  borderRadius: '0 0 20px 20px',
  padding: '24px 40px',
  textAlign: 'center' as const,
}
const footerTitle = {
  margin: '0 0 4px',
  color: '#94a3b8',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}
const footerCopy = { margin: 0, color: '#cbd5e1', fontSize: '11px' }
