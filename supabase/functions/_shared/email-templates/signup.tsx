/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <AccordEmailLayout
    preview="Confirme seu cadastro na Accord"
    title="Confirme seu cadastro 🎉"
    body="Bem-vindo à Accord! Clique abaixo para ativar sua conta e começar a usar a plataforma."
    buttonText="Ativar minha conta"
    confirmationUrl={confirmationUrl}
  />
)

export default SignupEmail
