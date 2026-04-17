/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from './_layout.tsx'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <AccordEmailLayout
    preview="Seu link de acesso à Accord"
    title="Seu link de acesso 🔑"
    body="Aqui está seu link de acesso instantâneo à Accord. Este link é válido por 24 horas e só pode ser usado uma vez."
    buttonText="Acessar agora"
    confirmationUrl={confirmationUrl}
  />
)

export default MagicLinkEmail
