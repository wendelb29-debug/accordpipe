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
    <Preview>ACCORD — Confirme sua identidade</Preview>
    <Body style={main}>
      <Container style={outer}>
        <Container style={card}>
          <Section style={topBar} />

          <Section style={headerSection}>
            <table width="100%" cellPadding={0} cellSpacing={0}>
              <tr>
                <td>
                  <img
                    src="https://nglwgzknqgihlbkdnflu.supabase.co/storage/v1/object/public/email-assets/accord-logo.png"
                    alt="ACCORD"
                    width={140}
                    style={{ display: 'block', maxWidth: '140px', height: 'auto' }}
                  />
                </td>
                <td align="right">
                  <span style={badge}>ENTERPRISE</span>
                </td>
              </tr>
            </table>
          </Section>

          <Section style={iconSection}>
            <div style={iconBox}>🛡️</div>
            <Heading as="h1" style={h1}>
              Confirme sua identidade
            </Heading>
            <Text style={bodyText}>
              Por segurança, confirme sua identidade para continuar.
            </Text>
          </Section>

          <Section style={{ padding: '36px 40px' }}>
            <Text style={codeStyle}>{token}</Text>
          </Section>

          <Section style={securityWrap}>
            <Section style={securityBox}>
              <Text style={securityText}>
                🔒 <strong style={securityStrong}>Segurança:</strong> Se você
                não solicitou esta ação, ignore este e-mail.
              </Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerTitle}>ACCORD PLATAFORMA EMPRESARIAL</Text>
            <Text style={footerCopy}>
              © 2026 Accord. Todos os direitos reservados.
            </Text>
          </Section>
        </Container>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { margin: 0, padding: 0, backgroundColor: '#ffffff', fontFamily: "'Segoe UI', Arial, sans-serif" }
const outer = { background: '#0a0c14', padding: '48px 20px', width: '100%', maxWidth: '100%' }
const card = {
  width: '540px',
  maxWidth: '100%',
  backgroundColor: '#12141f',
  borderRadius: '20px',
  border: '1px solid #1e2035',
  overflow: 'hidden',
  margin: '0 auto',
}
const topBar = {
  background: 'linear-gradient(135deg,#1a3a8f 0%,#2563EB 40%,#7A3FF2 100%)',
  height: '5px',
  padding: 0,
  lineHeight: '5px',
  fontSize: 0,
}
const headerSection = { padding: '36px 40px 28px', borderBottom: '1px solid #1e2035' }
const brand = { fontSize: '20px', fontWeight: 800 as const, color: '#ffffff', letterSpacing: '2px' }
const brandSub = {
  marginLeft: '8px',
  fontSize: '11px',
  color: '#4a4f72',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  verticalAlign: 'middle' as const,
}
const badge = {
  background: '#1e2240',
  border: '1px solid #2a2f52',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '10px',
  color: '#6b70a0',
  letterSpacing: '1px',
}
const iconSection = { padding: '40px 40px 0', textAlign: 'center' as const }
const iconBox = {
  display: 'inline-block',
  background: 'linear-gradient(135deg,#1e3a8a,#4c1d95)',
  borderRadius: '16px',
  width: '56px',
  height: '56px',
  lineHeight: '56px',
  fontSize: '26px',
  marginBottom: '20px',
}
const h1 = { margin: '0 0 12px', color: '#ffffff', fontSize: '24px', fontWeight: 700 as const, lineHeight: '1.3' }
const bodyText = { margin: '0 auto', color: '#6b6f94', fontSize: '14px', lineHeight: '1.8', maxWidth: '380px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '36px',
  fontWeight: 700 as const,
  color: '#ffffff',
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  letterSpacing: '10px',
  padding: '24px',
  borderRadius: '12px',
  textAlign: 'center' as const,
  margin: 0,
}
const securityWrap = { padding: '0 40px 32px' }
const securityBox = {
  background: '#0f1120',
  border: '1px solid #1e2035',
  borderLeft: '3px solid #7A3FF2',
  borderRadius: '10px',
  padding: '14px 16px',
}
const securityText = { margin: 0, color: '#4a4f72', fontSize: '12px', lineHeight: '1.6' }
const securityStrong = { color: '#6b6f94' }
const footer = {
  background: '#0a0c14',
  borderTop: '1px solid #1e2035',
  padding: '24px 40px',
  textAlign: 'center' as const,
}
const footerTitle = {
  margin: '0 0 8px',
  color: '#2a2f52',
  fontSize: '11px',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
}
const footerCopy = { margin: 0, color: '#1e2240', fontSize: '11px' }
