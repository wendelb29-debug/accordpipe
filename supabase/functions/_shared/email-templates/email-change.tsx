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
    preview="ACCORD — Confirme seu novo e-mail"
    emoji="✉️"
    title="Confirme seu novo e-mail"
    body="Confirme o novo endereço para ativar a alteração."
    buttonText="Confirmar e-mail"
    confirmationUrl={confirmationUrl}
  />
)

export default EmailChangeEmail
