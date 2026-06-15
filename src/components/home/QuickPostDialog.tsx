import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export function QuickPostDialog({
  open, onOpenChange, userId, servidorId, onPublished,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId?: string;
  servidorId?: string;
  onPublished?: () => void;
}) {
  const [content, setContent] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [publishing, setPublishing] = useState(false);

  async function handlePublish() {
    if (!content.trim()) {
      toast({ title: "Escreva algo antes de publicar" });
      return;
    }
    if (!userId || !servidorId) {
      toast({ title: "Sessão inválida", variant: "destructive" });
      return;
    }
    setPublishing(true);
    const tags = tagsText.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean);
    const { error } = await supabase.from("feed_posts").insert({
      content: content.trim(),
      tags,
      servidor_id: servidorId,
      author_id: userId,
    });
    setPublishing(false);
    if (error) {
      toast({ title: "Erro ao publicar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Publicado no feed" });
    setContent("");
    setTagsText("");
    onOpenChange(false);
    onPublished?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova publicação</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="No que está pensando?"
            rows={5}
            autoFocus
          />
          <Input
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="Tags (separadas por vírgula, opcional)"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={publishing}>
            Cancelar
          </Button>
          <Button onClick={handlePublish} disabled={publishing || !content.trim()}>
            {publishing ? "Publicando..." : "Publicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
