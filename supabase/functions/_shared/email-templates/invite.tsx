/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <AccordEmailLayout
    preview="ACCORD — Você foi convidado"
    emoji="🚀"
    title="Você foi convidado!"
    body="Você recebeu um convite para acessar a Accord."
    buttonText="Aceitar convite"
    confirmationUrl={confirmationUrl}
  />
)

export default InviteEmail
