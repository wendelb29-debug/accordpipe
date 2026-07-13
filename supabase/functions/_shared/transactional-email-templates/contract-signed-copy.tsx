/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { AccordEmailLayout } from '../email-templates/_layout.tsx'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nome?: string
  documento?: string
  downloadUrl: string
  validationCode?: string
}

const ContractSignedCopy = ({ nome, documento, downloadUrl, validationCode }: Props) => {
  const greeting = nome ? `Olá ${nome}, ` : 'Olá, '
  const docLabel = documento ? `"${documento}"` : 'seu contrato'
  const codeLine = validationCode ? ` Código de validação: ${validationCode}.` : ''
  return (
    <AccordEmailLayout
      preview={`Seu contrato ${docLabel} foi assinado`}
      emoji="✅"
      title="Contrato assinado"
      body={`${greeting}seu contrato ${docLabel} foi assinado com sucesso. Baixe sua via pelo botão abaixo.${codeLine}`}
      buttonText="Baixar contrato assinado"
      confirmationUrl={downloadUrl}
    />
  )
}

export const template = {
  component: ContractSignedCopy,
  subject: (data: Props) =>
    data?.documento
      ? `Contrato assinado: ${data.documento}`
      : 'Seu contrato foi assinado',
  displayName: 'Cópia do Contrato Assinado',
  previewData: {
    nome: 'João Silva',
    documento: 'Contrato de Prestação de Serviços',
    downloadUrl: 'https://accordpipe.com.br/validar-documento/ACD-EXEMPLO',
    validationCode: 'ACD-EXEMPLO',
  },
} satisfies TemplateEntry

export default ContractSignedCopy
