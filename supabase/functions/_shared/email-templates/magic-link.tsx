/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AccordEmailLayout
    preview="ACCORD — Seu link de acesso"
    emoji="🔑"
    title="Seu link de acesso"
    body="Link de acesso instantâneo. Válido por 24h, uso único."
    buttonText="Acessar agora"
    confirmationUrl={confirmationUrl}
  />
)

export default MagicLinkEmail
