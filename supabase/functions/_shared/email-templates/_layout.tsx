/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://nglwgzknqgihlbkdnflu.supabase.co/storage/v1/object/public/email-assets/accord-logo.png'

interface AccordEmailProps {
  preview: string
  emoji: string
  title: string
  body: string
  buttonText: string
  confirmationUrl: string
}

export const AccordEmailLayout = ({
  preview,
  emoji,
  title,
  body,
  buttonText,
  confirmationUrl,
}: AccordEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head>
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta name="x-apple-disable-message-reformatting" />
      <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
      <meta name="color-scheme" content="light only" />
      <meta name="supported-color-schemes" content="light" />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      {/* Preheader oculto — aparece na prévia do Gmail/Outlook */}
      <div style={{ display: 'none', maxHeight: 0, overflow: 'hidden', opacity: 0, color: 'transparent' }}>
        {preview}
        {'\u00A0\u200C'.repeat(60)}
      </div>
      <Container style={outer}>
        <Container style={card}>
          {/* HEADER COM GRADIENTE E LOGO CENTRALIZADA */}
          <Section style={headerSection}>
            <Img
              src={LOGO_URL}
              alt="ACCORD"
              width="200"
              height="auto"
              style={logo}
            />
            <div style={{ textAlign: 'center', marginTop: '14px' }}>
              <span style={badge}>ENTERPRISE</span>
            </div>
          </Section>

          {/* BODY BRANCO */}
          <Section style={bodySection}>
            <div style={iconBox}>{emoji}</div>
            <Heading as="h2" style={h1}>
              {title}
            </Heading>
            <Text style={bodyText}>{body}</Text>

            <Section style={{ textAlign: 'center', marginTop: '8px' }}>
              <Button style={button} href={confirmationUrl}>
                {buttonText}
              </Button>
            </Section>

            <Section style={altLinkBox}>
              <Text style={altLinkLabel}>LINK ALTERNATIVO</Text>
              <Link href={confirmationUrl} style={altLink}>
                {confirmationUrl}
              </Link>
            </Section>

            <Section style={securityBox}>
              <Text style={securityText}>
                🔒 <strong style={securityStrong}>Segurança:</strong> Se você
                não solicitou esta ação, ignore este e-mail. Sua conta
                permanece segura.
              </Text>
            </Section>
          </Section>

          {/* FOOTER */}
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

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: '#f0f2f8',
  fontFamily: "'Segoe UI', Arial, sans-serif",
}
const outer = {
  background: '#f0f2f8',
  padding: '48px 20px',
  width: '100%',
  maxWidth: '100%',
}
const card = {
  width: '520px',
  maxWidth: '100%',
  borderRadius: '20px',
  overflow: 'hidden',
  margin: '0 auto',
  padding: 0,
  boxShadow: '0 8px 40px rgba(37,99,235,0.12)',
}
const headerSection = {
  background: 'linear-gradient(135deg,#1a3a8f 0%,#2563EB 45%,#7A3FF2 100%)',
  padding: '40px 40px 32px',
  borderRadius: '20px 20px 0 0',
  textAlign: 'center' as const,
}
const logo = {
  display: 'block',
  margin: '0 auto',
  maxWidth: '200px',
  height: 'auto',
}
const badge = {
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: '20px',
  padding: '4px 12px',
  fontSize: '10px',
  color: 'rgba(255,255,255,0.85)',
  letterSpacing: '2px',
}
const bodySection = {
  background: '#ffffff',
  padding: '48px 40px 36px',
  textAlign: 'center' as const,
}
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
const h1 = {
  margin: '0 0 12px',
  color: '#0f172a',
  fontSize: '24px',
  fontWeight: 700 as const,
  lineHeight: '1.3',
}
const bodyText = {
  margin: '0 auto 36px',
  color: '#64748b',
  fontSize: '14px',
  lineHeight: '1.8',
  maxWidth: '380px',
}
const button = {
  display: 'inline-block',
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 700 as const,
  padding: '16px 48px',
  borderRadius: '12px',
  letterSpacing: '0.5px',
}
const altLinkBox = {
  marginTop: '28px',
  background: '#f8faff',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  padding: '14px 16px',
  textAlign: 'left' as const,
}
const altLinkLabel = {
  margin: '0 0 5px',
  color: '#94a3b8',
  fontSize: '10px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
}
const altLink = {
  color: '#2563EB',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  textDecoration: 'none',
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
const securityText = {
  margin: 0,
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.6',
}
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
