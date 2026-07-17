import { useCallback, useEffect, useState } from "react";
import { Loader2, Package, MoreVertical, Eye, EyeOff, Trash2, RefreshCw, ImageOff, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  tenantId: string | null | undefined;
  /** Passed in from BusinessProfileSection so we don't repeat the /instance/status call. */
  visible?: boolean;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number | null;
  currency?: string;
  price_formatted?: string;
  image_url?: string | null;
  is_hidden: boolean;
  availability?: string | null;
}

export function CatalogSection({ tenantId, visible = true }: Props) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [nextAfter, setNextAfter] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const fetchPage = useCallback(async (after: string | null) => {
    if (!tenantId) return { products: [], next_after: null };
    const { data, error } = await supabase.functions.invoke("uazapi-catalog-list", {
      body: { tenant_id: tenantId, after: after ?? undefined },
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return {
      products: ((data as any)?.products ?? []) as Product[],
      next_after: ((data as any)?.next_after ?? null) as string | null,
    };
  }, [tenantId]);

  const load = useCallback(async () => {
    if (!tenantId || !visible) return;
    setLoading(true);
    setNotConfigured(false);
    try {
      const r = await fetchPage(null);
      setProducts(r.products);
      setNextAfter(r.next_after);
      if ((r as any).unavailable) setNotConfigured(true);
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (/instance_not_connected|no_instance|cannot_resolve_jid|timeout|504|408|502|503|non-2xx/i.test(msg)) {
        setNotConfigured(true);
      } else {
        toast.error("Falha ao carregar catálogo: " + msg, { duration: 12000 });
      }
      setProducts([]);
      setNextAfter(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, visible, fetchPage]);

  useEffect(() => { load(); }, [load]);

  const loadMore = async () => {
    if (!nextAfter) return;
    setLoadingMore(true);
    try {
      const r = await fetchPage(nextAfter);
      setProducts((prev) => [...prev, ...r.products]);
      setNextAfter(r.next_after);
    } catch (e: any) {
      toast.error("Falha ao carregar mais: " + (e.message || String(e)), { duration: 10000 });
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetails = async (p: Product) => {
    setDetail(null);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-catalog-info", {
        body: { tenant_id: tenantId, id: p.id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setDetail((data as any)?.product);
    } catch (e: any) {
      toast.error("Falha ao carregar detalhes: " + (e.message || String(e)), { duration: 10000 });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const toggleVisibility = async (p: Product) => {
    setBusyId(p.id);
    try {
      const nextHide = !p.is_hidden;
      const { data, error } = await supabase.functions.invoke("uazapi-catalog-toggle-visibility", {
        body: { tenant_id: tenantId, id: p.id, hide: nextHide },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_hidden: nextHide } : x)));
      toast.success(nextHide ? "Produto ocultado" : "Produto visível");
    } catch (e: any) {
      toast.error("Falha: " + (e.message || String(e)), { duration: 10000 });
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const p = deleteTarget;
    setBusyId(p.id);
    try {
      const { data, error } = await supabase.functions.invoke("uazapi-catalog-delete", {
        body: { tenant_id: tenantId, id: p.id },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setProducts((prev) => prev.filter((x) => x.id !== p.id));
      toast.success("Produto excluído do catálogo do WhatsApp");
    } catch (e: any) {
      toast.error("Falha ao excluir: " + (e.message || String(e)), { duration: 12000 });
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  };

  if (!visible) return null;

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-primary flex items-center gap-2">
              <Package size={13} /> Catálogo de produtos
            </CardTitle>
            <CardDescription>
              Produtos publicados no catálogo do WhatsApp Business. Somente leitura, com ações de visibilidade e exclusão.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {notConfigured ? (
            <div className="flex items-start gap-2 text-xs rounded-md border border-border bg-muted/30 p-3 text-muted-foreground">
              <AlertCircle size={14} className="mt-0.5" />
              Conecte a instância uazapi Business para ver o catálogo.
            </div>
          ) : loading && products.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" /> Carregando produtos…
            </div>
          ) : products.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Nenhum produto encontrado no catálogo.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-lg border border-border/60 bg-background overflow-hidden flex flex-col"
                  >
                    <div className="relative aspect-square bg-muted/40 flex items-center justify-center overflow-hidden">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <ImageOff size={28} className="text-muted-foreground/60" />
                      )}
                      <span
                        className={
                          "absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wider " +
                          (p.is_hidden
                            ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400")
                        }
                      >
                        {p.is_hidden ? "Oculto" : "Ativo"}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col p-2.5 gap-1">
                      <div className="flex items-start justify-between gap-1">
                        <div className="text-sm font-medium truncate flex-1">{p.name}</div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7 -mr-1 -mt-1"
                              disabled={busyId === p.id}
                            >
                              {busyId === p.id ? <Loader2 size={13} className="animate-spin" /> : <MoreVertical size={13} />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetails(p)}>
                              Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleVisibility(p)}>
                              {p.is_hidden ? (
                                <><Eye size={13} className="mr-2" /> Mostrar</>
                              ) : (
                                <><EyeOff size={13} className="mr-2" /> Ocultar</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                            >
                              <Trash2 size={13} className="mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.price_formatted || (p.price != null ? `${p.currency ?? ""} ${p.price}` : "—")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {nextAfter && (
                <div className="flex justify-center pt-4">
                  <Button size="sm" variant="outline" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? <Loader2 size={14} className="mr-2 animate-spin" /> : null}
                    Carregar mais
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Details modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name || "Detalhes do produto"}</DialogTitle>
            <DialogDescription>
              Dados sincronizados do catálogo do WhatsApp Business.
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="py-6 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin mr-2" /> Carregando…
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {detail.image_url && (
                <img src={detail.image_url} alt={detail.name} className="w-full max-h-64 object-contain rounded-md bg-muted/30" />
              )}
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Preço</div>
                <div>{detail.price_formatted || (detail.price != null ? `${detail.currency ?? ""} ${detail.price}` : "—")}</div>
              </div>
              {detail.description && (
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Descrição</div>
                  <div className="whitespace-pre-wrap">{detail.description}</div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Disponibilidade</div>
                  <div>{detail.availability ?? "—"}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Status</div>
                  <div>{detail.is_hidden ? "Oculto" : "Ativo"}</div>
                </div>
              </div>
              {detail.url && (
                <div className="text-xs">
                  <a href={detail.url} target="_blank" rel="noreferrer" className="text-primary underline">
                    Abrir no WhatsApp Business
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{deleteTarget?.name}” do catálogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove o produto do catálogo do WhatsApp Business de verdade, não só do Accord.
              A ação é irreversível pelo lado do WhatsApp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyId === deleteTarget?.id}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={busyId === deleteTarget?.id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busyId === deleteTarget?.id && <Loader2 size={13} className="mr-2 animate-spin" />}
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
