import { useState } from "react";
import { Plus, Trash2, Upload, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Signer {
  name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (name: string, description: string, file: File, signers: Signer[]) => Promise<void>;
}

export function PdfContractCreateDialog({ open, onOpenChange, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
  const [loading, setLoading] = useState(false);

  const addSigner = () => setSigners([...signers, { name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
  const removeSigner = (idx: number) => setSigners(signers.filter((_, i) => i !== idx));
  const updateSigner = (idx: number, field: keyof Signer, value: string) => {
    const updated = [...signers];
    updated[idx] = { ...updated[idx], [field]: value };
    setSigners(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !file) return;
    if (signers.every(s => !s.name.trim())) return;
    const validSigners = signers.filter(s => s.name.trim());
    setLoading(true);
    await onSubmit(name, description, file, validSigners);
    setLoading(false);
    // Reset
    setName("");
    setDescription("");
    setFile(null);
    setSigners([{ name: "", email: "", phone: "", cpf_cnpj: "", address: "" }]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Novo Contrato PDF
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Contract Info */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Nome do Contrato *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Contrato de Prestação de Serviços" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição opcional do contrato..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Arquivo PDF *</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                {file && <span className="text-xs text-muted-foreground truncate max-w-[150px]">{file.name}</span>}
              </div>
            </div>
          </div>

          <Separator />

          {/* Signers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Contratantes</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSigner} className="gap-1">
                <UserPlus className="h-3.5 w-3.5" />
                Adicionar
              </Button>
            </div>

            {signers.map((signer, idx) => (
              <Card key={idx} className="relative">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Contratante {idx + 1}</span>
                    {signers.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeSigner(idx)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome / Razão Social *</Label>
                      <Input value={signer.name} onChange={(e) => updateSigner(idx, "name", e.target.value)} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CPF / CNPJ</Label>
                      <Input value={signer.cpf_cnpj} onChange={(e) => updateSigner(idx, "cpf_cnpj", e.target.value)} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input type="email" value={signer.email} onChange={(e) => updateSigner(idx, "email", e.target.value)} placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Telefone</Label>
                      <Input value={signer.phone} onChange={(e) => updateSigner(idx, "phone", e.target.value)} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Endereço</Label>
                    <Input value={signer.address} onChange={(e) => updateSigner(idx, "address", e.target.value)} placeholder="Endereço completo" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim() || !file}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Criando...</> : "Criar Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
