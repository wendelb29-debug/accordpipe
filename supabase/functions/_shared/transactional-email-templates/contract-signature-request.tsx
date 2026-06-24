/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from '../email-templates/_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  signerName?: string
  contractName?: string
  signingUrl: string
  senderName?: string
}

const ContractSignatureRequest = ({ signerName, contractName, signingUrl, senderName }: Props) => {
  const greeting = signerName ? `Olá ${signerName}, ` : 'Olá, '
  const docLabel = contractName ? `"${contractName}"` : 'um contrato'
  const fromLabel = senderName ? ` enviado por ${senderName}` : ''
  return (
    <AccordEmailLayout
      preview={`Assine ${docLabel}${fromLabel}`}
      emoji="✍️"
      title="Você tem um contrato para assinar"
      body={`${greeting}você recebeu ${docLabel}${fromLabel} para assinatura eletrônica. Clique no botão abaixo para revisar e assinar com validade jurídica (ICP-Brasil + Carimbo do Tempo).`}
      buttonText="Revisar e assinar contrato"
      confirmationUrl={signingUrl}
    />
  )
}

export const template = {
  component: ContractSignatureRequest,
  subject: (data: Props) =>
    data?.contractName
      ? `Assinatura solicitada: ${data.contractName}`
      : 'Você tem um contrato para assinar',
  displayName: 'Solicitação de Assinatura de Contrato',
  previewData: {
    signerName: 'João Silva',
    contractName: 'Contrato de Prestação de Serviços',
    signingUrl: 'https://accordpipe.com.br/assinar-documento/exemplo-token',
    senderName: 'Accord',
  },
} satisfies TemplateEntry

export default ContractSignatureRequest
