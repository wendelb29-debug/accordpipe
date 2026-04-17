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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail no {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Img src={LOGO_URL} alt="Accord" width="160" style={logo} />
        </Section>
        <Heading style={h1}>Bem-vindo ao {siteName}</Heading>
        <Text style={text}>
          Obrigado por se cadastrar em{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          ! Confirme seu endereço de e-mail (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar e-mail
        </Button>
        <Text style={footer}>
          Se você não criou uma conta, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoSection = { margin: '0 0 28px' }
const logo = { display: 'block', height: 'auto' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: 'hsl(224, 71%, 7%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: 'hsl(220, 9%, 46%)',
  lineHeight: '1.6',
  margin: '0 0 24px',
}
const link = { color: 'hsl(224, 76%, 53%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(224, 76%, 53%)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
