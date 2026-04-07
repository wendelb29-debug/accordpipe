import { useState, useEffect, useRef, useCallback } from "react";
import {
  FileSignature, Plus, Eye, Download, Copy, Camera, MapPin, User, X,
  Clock, CheckCircle2, AlertCircle, Loader2, Search, UserPlus, Link2, Mail,
  MoreVertical, MessageSquare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadContractPdf, generateContractPdf } from "@/lib/generateContractPdf";
import { downloadSignedContractPdf } from "@/lib/generateSignedContractPdf";
...
  const handleDownloadPdf = async (contract: any) => {
    let tempPdfUrl: string | null = null;

    try {
      if (contract.signature_status === "signed" && contract.document_hash) {
        const { data: sigs, error: sigsError } = await supabase
          .from("contract_signatures")
          .select("*")
          .eq("contract_id", contract.id)
          .order("created_at", { ascending: true });

        if (sigsError) throw sigsError;

        const signerSource = (sigs && sigs.length > 0)
          ? sigs
          : [{
              signer_name: contract.signer_name,
              signer_role: "signatário",
              signer_document: contract.signer_document,
              signed_at: contract.signed_at,
              signer_ip: null,
              signature_photo_url: contract.signature_photo_url,
            }];

        const signers = signerSource.map((s: any) => ({
          id: s.id,
          name: s.signer_name || "—",
          role: s.signer_role || "signatário",
          email: null,
          document: s.signer_document,
          signed_at: s.signed_at,
          ip: s.signer_ip,
          signature_photo_url: s.signature_photo_url,
        }));

        let pdfUrl = contract.pdf_url || "";
        if (!pdfUrl) {
          if (!contract.contract_content) {
            toast.error("Conteúdo do contrato não disponível");
            return;
          }

          const basePdfBlob = generateContractPdf({
            content: contract.contract_content,
            code: contract.code,
            companyName: contract.company?.razao_social || lead.company_name,
          });

          tempPdfUrl = URL.createObjectURL(basePdfBlob);
          pdfUrl = tempPdfUrl;
        }

        const validationUrl = `${window.location.origin}/validar-documento/${contract.validation_code || ""}`;

        await downloadSignedContractPdf({
          pdfUrl,
          code: contract.code,
          companyName: contract.company?.razao_social || lead.company_name,
          documentHash: contract.document_hash || "",
          validationCode: contract.validation_code || "",
          signedAt: contract.signed_at || new Date().toISOString(),
          signers,
          validationUrl,
        });
      } else {
        if (!contract.contract_content) {
          toast.error("Conteúdo não disponível");
          return;
        }

        downloadContractPdf({
          content: contract.contract_content,
          code: contract.code,
          companyName: contract.company?.razao_social || lead.company_name,
        });
      }

      addActivity({ type: "pdf_download", title: `PDF ${contract.code} baixado`, description: `Download do PDF do contrato ${contract.code}.` });
    } catch (error: any) {
      toast.error("Erro ao baixar o contrato assinado: " + (error?.message || "tente novamente"));
    } finally {
      if (tempPdfUrl) URL.revokeObjectURL(tempPdfUrl);
    }
  };

  const pendingCount = contracts.filter((c) => c.signature_status === "pending").length;
  const signedCount = contracts.filter((c) => c.signature_status === "signed").length;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!lead.company_id) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Lead sem empresa vinculada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileSignature className="h-4 w-4" /> Contratos
        </h3>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" /> Novo Contrato
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-amber-300/30 bg-amber-50/50 dark:bg-amber-950/20 p-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">Pendentes</p>
            <p className="text-lg font-bold text-foreground">{pendingCount}</p>
          </div>
        </div>
        <div className="rounded-lg border border-green-300/30 bg-green-50/50 dark:bg-green-950/20 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <div>
            <p className="text-[10px] text-muted-foreground">Assinados</p>
            <p className="text-lg font-bold text-foreground">{signedCount}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      {contracts.length > 3 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="h-8 text-xs pl-8" placeholder="Buscar contratos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      )}

      {/* Contracts table */}
      {contracts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileSignature className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum contrato encontrado</p>
          <p className="text-xs mt-1">Clique em "Novo Contrato" para gerar</p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2.5 font-medium text-muted-foreground">Status</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground">Data</th>
                <th className="text-left p-2.5 font-medium text-muted-foreground">Assinaturas</th>
                <th className="text-right p-2.5 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredContracts.map((c) => {
                const status = statusConfig[c.signature_status] || statusConfig.pending;
                const StatusIcon = status.icon;
                const counts = signerCounts[c.id] || { signed: 0, total: 0 };
                const allSigned = counts.total > 0 && counts.signed === counts.total;
                return (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-2.5">
                      {allSigned ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                    </td>
                    <td className="p-2.5">
                      <button
                        className="text-primary hover:underline text-left font-medium"
                        onClick={() => handleViewContract(c)}
                      >
                        {c.code} — {c.company?.razao_social || lead.company_name}
                      </button>
                    </td>
                    <td className="p-2.5 text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("pt-BR")} {new Date(c.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-2.5">
                      <span className={cn(
                        "font-semibold",
                        allSigned ? "text-green-600" : "text-amber-600"
                      )}>
                        {counts.signed}/{counts.total}
                      </span>
                    </td>
                    <td className="p-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                            Ações <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewContract(c)}>
                            <Eye className="h-3.5 w-3.5 mr-2" /> Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDownloadPdf(c)}>
                            <Download className="h-3.5 w-3.5 mr-2" /> Baixar PDF
                          </DropdownMenuItem>
                          {c.signature_link && (
                            <DropdownMenuItem onClick={() => handleCopyLink(c.signature_link, c.code)}>
                              <Copy className="h-3.5 w-3.5 mr-2" /> Copiar link
                            </DropdownMenuItem>
                          )}
                          {c.signature_status === "pending" && (
                            <DropdownMenuItem onClick={() => setSignContract(c)}>
                              <FileSignature className="h-3.5 w-3.5 mr-2" /> Assinar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Contract Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Contrato</DialogTitle>
            <DialogDescription>Contrato para {lead.company_name}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs">Foro (Comarca)</Label>
              <Input placeholder="Cidade/UF" value={foro} onChange={(e) => setForo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Validade do Link (dias)</Label>
              <Input type="number" value={linkValidity} onChange={(e) => setLinkValidity(e.target.value)} min={1} max={30} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Tipo de Assinatura</Label>
              <Select value={signatureType} onValueChange={setSignatureType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="govbr">Gov.br (Digital)</SelectItem>
                  <SelectItem value="manual">Manual Autenticada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Gerar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Contract Dialog */}
      <Dialog open={!!viewContract} onOpenChange={(open) => { if (!open) { setViewContract(null); setContractSigners([]); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Contrato {viewContract?.code}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans p-4">{viewContract?.contract_content || "Conteúdo não disponível"}</pre>

            {/* Signers / Envolvidos Section */}
            <Separator className="my-4" />
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" /> Envolvidos
                </h3>
                {viewContract?.signature_status === "pending" && (
                  <Button size="sm" onClick={() => setAddSignerOpen(true)} className="gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground">
                    <Plus className="h-3.5 w-3.5" /> Adicionar Signatário
                  </Button>
                )}
              </div>

              {loadingSigners ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : contractSigners.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum signatário encontrado</p>
              ) : (
                <div className="space-y-3">
                  {contractSigners.map((signer) => {
                    const isSigned = !!signer.signed_at;
                    const isVendor = signer.signer_role === "vendedor";
                    return (
                      <Card key={signer.id} className={cn(
                        "border-l-4 overflow-hidden",
                        isSigned
                          ? "border-l-green-500 bg-green-50 dark:bg-green-950/30"
                          : "border-l-amber-400 bg-card"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                {isSigned ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                                )}
                                <span className="text-sm font-semibold text-foreground">{signer.signer_name || "—"}</span>
                                {isVendor && (
                                  <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">Vendedor</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground ml-6">
                                {roleLabels[signer.signer_role] || signer.signer_role}
                              </p>
                              {signer.signer_document && (
                                <p className="text-xs font-mono text-muted-foreground ml-6">{signer.signer_document}</p>
                              )}
                              {isSigned && (
                                <p className="text-xs text-muted-foreground ml-6">
                                  Assinado em: {new Date(signer.signed_at!).toLocaleString("pt-BR")}
                                </p>
                              )}
                              {signer.signing_token && !isSigned && (
                                <button
                                  onClick={() => handleCopySignerLink(signer.signing_token, signer.signer_name)}
                                  className="flex items-center gap-1 text-xs text-primary hover:underline ml-6 cursor-pointer"
                                >
                                  <Link2 className="h-3 w-3" /> Link para assinatura
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {signer.signing_token && !isSigned && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleCopySignerLink(signer.signing_token, signer.signer_name)}
                                  title="Copiar link"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {signer.signature_photo_url && (
                                <img src={signer.signature_photo_url} alt="Foto" className="h-8 w-8 rounded object-cover border" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {/* Cancel button */}
              {viewContract?.signature_status === "pending" && (
                <Button variant="destructive" className="w-full gap-2" size="sm" onClick={() => { /* cancel logic if needed */ }}>
                  <X className="h-4 w-4" /> Cancelar assinatura do documento
                </Button>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Add Signer Dialog */}
      <Dialog open={addSignerOpen} onOpenChange={setAddSignerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Signatário</DialogTitle>
            <DialogDescription>Preencha os dados da pessoa que irá assinar o contrato</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-xs">Nome completo *</Label>
              <Input placeholder="Nome do signatário" value={newSignerName} onChange={(e) => setNewSignerName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" placeholder="email@exemplo.com" value={newSignerEmail} onChange={(e) => setNewSignerEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input placeholder="000.000.000-00" value={newSignerDocument} onChange={(e) => setNewSignerDocument(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Papel</Label>
              <Select value={newSignerRole} onValueChange={setNewSignerRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="signatario">Signatário</SelectItem>
                  <SelectItem value="testemunha">Testemunha</SelectItem>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="colaborador">Colaborador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSignerOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddSigner} disabled={addingNewSigner || !newSignerName.trim()} className="gap-2">
              {addingNewSigner ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Contract Dialog */}
      <Dialog open={!!signContract} onOpenChange={(open) => { if (!open) resetSigningState(); }}>
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Assinar {signContract?.code}</DialogTitle>
            <DialogDescription>Tire uma foto e permita a localização</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh]">
            <div className="space-y-4 p-1">
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-primary" /> Responsável</div>
                <p className="text-sm text-muted-foreground">{signContract?.company?.responsavel || "-"}</p>
                <p className="text-sm font-mono text-muted-foreground">{signContract?.company?.cnpj || "-"}</p>
              </Card>
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold"><MapPin className="h-4 w-4 text-primary" /> Localização</div>
                {location ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{location.address}</p>
                    <p className="text-xs font-mono text-muted-foreground">({location.lat.toFixed(6)}, {location.lng.toFixed(6)})</p>
                  </div>
                ) : <p className="text-sm text-muted-foreground">Será capturada ao abrir a câmera</p>}
              </Card>
              <Card className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold"><Camera className="h-4 w-4 text-primary" /> Foto</div>
                {cameraOpen && (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden bg-muted"><video ref={videoRef} autoPlay playsInline muted className="w-full" /></div>
                    <div className="flex gap-2">
                      <Button onClick={capturePhoto} className="flex-1 gap-2"><Camera className="h-4 w-4" /> Tirar Foto</Button>
                      <Button variant="outline" size="icon" onClick={stopCamera}><X className="h-4 w-4" /></Button>
                    </div>
                  </div>
                )}
                {photoPreview && !cameraOpen && (
                  <div className="space-y-3">
                    <img src={photoPreview} alt="Foto" className="w-full max-w-xs mx-auto rounded-lg border" />
                    <Button variant="outline" onClick={() => { setPhotoBlob(null); setPhotoPreview(null); startCamera(); }} className="w-full gap-2">
                      <Camera className="h-4 w-4" /> Tirar Nova Foto
                    </Button>
                  </div>
                )}
                {!cameraOpen && !photoPreview && (
                  <Button variant="outline" onClick={startCamera} className="w-full gap-2">
                    <Camera className="h-4 w-4" /> Abrir Câmera
                  </Button>
                )}
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={resetSigningState}>Cancelar</Button>
            <Button onClick={handleSign} disabled={!photoBlob || !location || signing} className="gap-2">
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
              Assinar Contrato
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
