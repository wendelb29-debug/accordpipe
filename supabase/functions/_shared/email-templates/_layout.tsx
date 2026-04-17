/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface AccordEmailProps {
  preview: string
  title: string
  body: React.ReactNode
  buttonText: string
  confirmationUrl: string
}

export const AccordEmailLayout = ({
  preview,
  title,
  body,
  buttonText,
  confirmationUrl,
}: AccordEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Container style={outerContainer}>
        <Container style={card}>
          <Section style={header}>
            <Heading style={brand}>ACCORD</Heading>
            <Text style={tagline}>PLATAFORMA EMPRESARIAL</Text>
          </Section>

          <Section style={bodySection}>
            <Heading as="h2" style={h2}>
              {title}
            </Heading>
            <Text style={bodyText}>{body}</Text>

            <Section style={{ textAlign: 'center', margin: '0' }}>
              <Button style={button} href={confirmationUrl}>
                {buttonText}
              </Button>
            </Section>

            <Text style={fallback}>
              Se o botão não funcionar, copie e cole este link no navegador:
              <br />
              <Link href={confirmationUrl} style={fallbackLink}>
                {confirmationUrl}
              </Link>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Este email foi enviado pela plataforma{' '}
              <strong style={footerBrand}>Accord</strong>.
              <br />
              Se você não solicitou esta ação, ignore este email com segurança.
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

const main = {
  margin: 0,
  padding: 0,
  backgroundColor: '#ffffff',
  fontFamily: "'Segoe UI', Arial, sans-serif",
}
const outerContainer = {
  background: '#0f1117',
  padding: '40px 20px',
  width: '100%',
  maxWidth: '100%',
}
const card = {
  width: '520px',
  maxWidth: '100%',
  backgroundColor: '#1a1d27',
  borderRadius: '16px',
  border: '1px solid #2a2d3a',
  overflow: 'hidden',
  margin: '0 auto',
  padding: '0',
}
const header = {
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  padding: '32px',
  textAlign: 'center' as const,
}
const brand = {
  margin: 0,
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 700 as const,
  letterSpacing: '1px',
}
const tagline = {
  margin: '6px 0 0',
  color: 'rgba(255,255,255,0.7)',
  fontSize: '12px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}
const bodySection = { padding: '40px 36px' }
const h2 = {
  margin: '0 0 12px',
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: 600 as const,
}
const bodyText = {
  margin: '0 0 28px',
  color: '#8b8fa8',
  fontSize: '14px',
  lineHeight: '1.7',
}
const button = {
  display: 'inline-block',
  background: 'linear-gradient(135deg,#2563EB,#7A3FF2)',
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600 as const,
  padding: '14px 36px',
  borderRadius: '10px',
  letterSpacing: '0.3px',
}
const fallback = {
  margin: '24px 0 0',
  color: '#555870',
  fontSize: '12px',
  textAlign: 'center' as const,
  lineHeight: '1.6',
}
const fallbackLink = { color: '#7A3FF2', wordBreak: 'break-all' as const }
const footer = {
  background: '#13151f',
  borderTop: '1px solid #2a2d3a',
  padding: '20px 36px',
  textAlign: 'center' as const,
}
const footerText = {
  margin: 0,
  color: '#444766',
  fontSize: '11px',
  lineHeight: '1.6',
}
const footerBrand = { color: '#666990' }
const copyright = { color: '#333550' }
