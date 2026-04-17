/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ confirmationUrl }: EmailChangeEmailProps) => (
  <AccordEmailLayout
    preview="Confirme seu novo e-mail na Accord"
    title="Confirmação de novo e-mail ✉️"
    body="Você solicitou a alteração do e-mail da sua conta. Clique abaixo para confirmar e ativar o novo endereço."
    buttonText="Confirmar novo e-mail"
    confirmationUrl={confirmationUrl}
  />
)

export default EmailChangeEmail
