import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Shield, Clock, FileText, Download, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { QRCodeSVG } from "qrcode.react";

interface ValidationData {
  valid: boolean;
  status: string;
  document_id: string;
  created_at: string;
  signed_at: string | null;
  document_hash: string;
  validation_code: string;
  signers: {
    name: string;
    role: string;
    signed_at: string | null;
    document_masked: string | null;
  }[];
}

export default function ValidarDocumento() {
  const { codigo } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ValidationData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const validate = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    setNotFound(false);
    setData(null);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/validate-document?code=${encodeURIComponent(code)}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.valid) {
        setData(json);
      } else {
        setNotFound(true);
      }
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  };

  useEffect(() => {
    const code = codigo || searchParams.get("doc") || "";
    if (code) validate(code);
  }, [codigo]);

  const handleManualValidate = () => {
    if (manualCode.trim()) validate(manualCode.trim());
  };

  const currentUrl = window.location.href;
  const isSigned = data?.status === "signed";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Shield className="h-12 w-12 mx-auto text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Validação de Documento</h1>
          <p className="text-sm text-gray-500">Verifique a autenticidade de um documento assinado digitalmente</p>
        </div>

        {/* Manual input */}
        {!data && !loading && (
          <Card className="p-6 border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700 mb-3">Digite o código de validação:</p>
            <div className="flex gap-2">
              <Input
                placeholder="Código de validação"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualValidate()}
                className="bg-white border-gray-300 text-gray-900"
              />
              <Button onClick={handleManualValidate} disabled={!manualCode.trim()}>
                Validar
              </Button>
            </div>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Verificando documento...</p>
          </div>
        )}

        {/* Not found */}
        {notFound && !loading && (
          <Card className="p-8 border-red-200 bg-red-50 text-center space-y-3">
            <XCircle className="h-12 w-12 mx-auto text-red-500" />
            <h2 className="text-lg font-bold text-red-700">Documento não encontrado</h2>
            <p className="text-sm text-red-600">O código informado não corresponde a nenhum documento registrado ou o documento é inválido.</p>
            <Button variant="outline" onClick={() => { setNotFound(false); setManualCode(""); }} className="mt-4 border-red-300 text-red-700">
              Tentar novamente
            </Button>
          </Card>
        )}

        {/* Valid document */}
        {data && !loading && (
          <div className="space-y-4">
            {/* Status */}
            <Card className={`p-6 border-2 text-center space-y-2 ${isSigned ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50"}`}>
              {isSigned ? (
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              ) : (
                <Clock className="h-12 w-12 mx-auto text-amber-600" />
              )}
              <h2 className={`text-lg font-bold ${isSigned ? "text-green-700" : "text-amber-700"}`}>
                {isSigned ? "✅ Documento Válido" : "⏳ Aguardando Assinatura"}
              </h2>
              <p className={`text-sm ${isSigned ? "text-green-600" : "text-amber-600"}`}>
                {isSigned
                  ? "Este documento foi assinado digitalmente e pode ser validado através deste código único."
                  : "Este documento está aguardando assinatura."}
              </p>
            </Card>

            {/* Document info */}
            <Card className="p-5 border-gray-200 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <FileText className="h-4 w-4 text-blue-600" /> Dados do Documento
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">ID do Documento</p>
                  <p className="font-mono font-medium text-gray-900">{data.document_id}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs">Data de Criação</p>
                  <p className="text-gray-900">{new Date(data.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                {data.signed_at && (
                  <div>
                    <p className="text-gray-500 text-xs">Data da Assinatura</p>
                    <p className="text-gray-900">{new Date(data.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
                  </div>
                )}
                <div>
                  <p className="text-gray-500 text-xs">Status</p>
                  <Badge className={isSigned ? "bg-green-100 text-green-700 border-green-300" : "bg-amber-100 text-amber-700 border-amber-300"}>
                    {isSigned ? "Assinado" : "Pendente"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Signers */}
            {data.signers.length > 0 && (
              <Card className="p-5 border-gray-200 bg-white space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <User className="h-4 w-4 text-blue-600" /> Assinantes
                </div>
                <div className="space-y-3">
                  {data.signers.map((signer, i) => (
                    <div key={i} className="p-3 rounded-lg border border-gray-100 bg-gray-50 space-y-1">
                      <div className="flex items-center gap-2">
                        {signer.signed_at ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{signer.name}</span>
                        <Badge variant="outline" className="text-[10px] text-gray-600 border-gray-300">
                          {signer.role === "signatario" ? "Signatário" : signer.role === "testemunha" ? "Testemunha" : signer.role}
                        </Badge>
                      </div>
                      {signer.document_masked && (
                        <p className="text-xs text-gray-500 ml-6">Doc: {signer.document_masked}</p>
                      )}
                      {signer.signed_at && (
                        <p className="text-xs text-gray-500 ml-6">
                          Assinado em: {new Date(signer.signed_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Hash & Verification */}
            <Card className="p-5 border-gray-200 bg-white space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                <Shield className="h-4 w-4 text-blue-600" /> Verificação de Autenticidade
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-gray-500 text-xs">Código de Validação</p>
                  <p className="font-mono text-sm font-medium text-gray-900 break-all">{data.validation_code}</p>
                </div>
                {data.document_hash && (
                  <div>
                    <p className="text-gray-500 text-xs">Hash SHA-256 do Documento</p>
                    <p className="font-mono text-xs text-gray-600 break-all">{data.document_hash}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* QR Code */}
            <Card className="p-5 border-gray-200 bg-white flex flex-col items-center space-y-3">
              <p className="text-sm font-semibold text-gray-800">QR Code de Validação</p>
              <QRCodeSVG value={currentUrl} size={160} level="M" />
              <p className="text-xs text-gray-500 text-center">Escaneie para validar este documento</p>
            </Card>

            {/* Legal text */}
            <div className="text-center text-xs text-gray-400 space-y-1 py-4">
              <p>Documento assinado digitalmente com validade jurídica, conforme a Medida Provisória nº 2.200-2/2001.</p>
              <p>Documento com carimbo de tempo para comprovação de data e hora das assinaturas.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
