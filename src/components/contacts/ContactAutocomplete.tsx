import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ContactSuggestion {
  id: string;
  name: string;
  phone: string;
  avatar_url?: string | null;
  status?: string | null;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSelect?: (contact: ContactSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  searchBy?: "phone" | "name" | "both";
  className?: string;
  autoFocus?: boolean;
  excludeBlocked?: boolean;
}

/**
 * Single source of truth for contact search across the whole app.
 * Queries whatsapp_contacts scoped to the active tenant (RLS enforced).
 */
export function ContactAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Nome ou telefone...",
  disabled,
  searchBy = "both",
  className,
  autoFocus,
  excludeBlocked = false,
}: Props) {
  const companyId = useActiveCompanyId();
  const debounced = useDebouncedValue(value, 250);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ContactSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId || !debounced || debounced.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const term = debounced.trim();
      const digits = term.replace(/\D/g, "");
      let query = supabase
        .from("whatsapp_contacts")
        .select("id, name, phone, avatar_url, status")
        .eq("company_id", companyId)
        .limit(8);

      if (excludeBlocked) query = query.neq("status", "blocked");

      if (searchBy === "phone" || (searchBy === "both" && digits.length >= 3 && digits.length === term.replace(/[\s()+-]/g, "").length)) {
        query = query.ilike("phone", `%${digits}%`);
      } else if (searchBy === "name") {
        query = query.ilike("name", `%${term}%`);
      } else {
        // both: OR search
        query = query.or(`name.ilike.%${term}%,phone.ilike.%${digits || term}%`);
      }

      const { data } = await query;
      if (!cancelled) {
        setResults((data ?? []) as ContactSuggestion[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced, companyId, searchBy, excludeBlocked]);

  const showList = open && (results.length > 0 || loading);

  return (
    <Popover open={showList} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-1"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {loading && <div className="p-2 text-xs text-muted-foreground">Buscando...</div>}
        {!loading && results.length === 0 && (
          <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" /> Nenhum contato — continue digitando um novo número
          </div>
        )}
        {results.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              onSelect?.(c);
              onChange(c.phone);
              setOpen(false);
              inputRef.current?.blur();
            }}
            className={cn(
              "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
              c.status === "blocked" && "opacity-60"
            )}
          >
            <Avatar className="h-7 w-7">
              {c.avatar_url && <AvatarImage src={c.avatar_url} />}
              <AvatarFallback className="text-[10px]">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{c.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {c.phone}{c.status === "blocked" ? " • bloqueado" : ""}
              </div>
            </div>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
