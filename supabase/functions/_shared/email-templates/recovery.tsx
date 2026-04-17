/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <AccordEmailLayout
    preview="ACCORD — Redefinição de senha"
    emoji="🔐"
    title="Redefina sua senha"
    body="Solicitação de nova senha recebida. Link válido por 1 hora."
    buttonText="Redefinir senha"
    confirmationUrl={confirmationUrl}
  />
)

export default RecoveryEmail
