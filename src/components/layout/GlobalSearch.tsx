import { useState, useEffect, useRef } from "react";
import { Search, Loader2, User, Phone, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export function GlobalSearch() {
  const navigate = useNavigate();
  const companyId = useActiveCompanyId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2 || !companyId) {
      setResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setLoading(true);
      const q = query.trim().replace(/[%,]/g, " ");
      try {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("id, contact_name, company_name, email, phone, stage")
          .eq("servidor_id", companyId)
          .or(`contact_name.ilike.%${q}%,company_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
          .limit(8);
        if (error) {
          console.error("[GlobalSearch] query error:", error);
          setResults([]);
        } else {
          setResults(data || []);
        }
      } catch (err) {
        console.error("[GlobalSearch] unexpected error:", err);
        setResults([]);
      } finally {
        setLoading(false);
        setOpen(true);
      }
    }, 250);
    return () => clearTimeout(handler);
  }, [query, companyId]);

  return (
    <div className="relative hidden md:block w-48 lg:w-64" ref={boxRef}>
      <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50 z-10" />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && setOpen(true)}
        placeholder="Buscar leads, contatos..."
        className="pl-8 pr-7 bg-muted/40 border border-border/40 focus:ring-1 focus:ring-primary/50 rounded-xl h-8 text-xs w-full outline-none"
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />
      )}

      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <div className="px-3 py-6 text-center">
              <div className="text-[12px] text-muted-foreground">Nenhum resultado para "{query}"</div>
            </div>
          ) : (
            <div className="p-1">
              <div className="text-[9.5px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1.5">
                Leads ({results.length})
              </div>
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                    navigate(`/atendimento?lead=${r.id}`);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-foreground truncate">
                      {r.contact_name || r.company_name || "Sem nome"}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground truncate flex items-center gap-2">
                      {r.email && <span className="inline-flex items-center gap-1 truncate"><Mail className="w-2.5 h-2.5 shrink-0" />{r.email}</span>}
                      {r.phone && <span className="inline-flex items-center gap-1 truncate"><Phone className="w-2.5 h-2.5 shrink-0" />{r.phone}</span>}
                    </div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                    {r.stage || "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
