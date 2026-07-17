import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ChevronDown, Search } from "lucide-react";
import { COUNTRIES, Country } from "./countries";

interface Props {
  country: Country;
  onChange: (c: Country) => void;
}

export function DdiPicker({ country, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = COUNTRIES.filter(c =>
    !q ||
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.code.toLowerCase().includes(q.toLowerCase()) ||
    c.dial.includes(q.replace(/\D/g, ""))
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 px-2 h-full text-sm hover:bg-muted rounded-l-md border-r border-border"
          title={`${country.name} (+${country.dial})`}
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">{country.code}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-72" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar país ou DDI..."
              className="pl-8 h-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map(c => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onChange(c); setOpen(false); setQ(""); }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted text-left ${c.code === country.code ? "bg-primary/5" : ""}`}
            >
              <span className="text-base">{c.flag}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-xs font-mono text-muted-foreground">+{c.dial}</span>
              <span className="text-[10px] font-semibold text-muted-foreground w-6">{c.code}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhum país encontrado</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
