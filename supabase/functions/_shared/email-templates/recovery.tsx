/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AccordEmailLayout
    preview="Redefina sua senha na Accord"
    title="Redefinição de senha 🔐"
    body="Recebemos uma solicitação para redefinir a senha da sua conta. Clique abaixo para criar uma nova senha. Este link expira em 1 hora."
    buttonText="Redefinir minha senha"
    confirmationUrl={confirmationUrl}
  />
)

export default RecoveryEmail
