import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveCompanyId } from "@/hooks/useActiveCompanyId";

export interface MentionUser {
  user_id: string;
  name: string;
}

export interface MentionResult {
  text: string;
  mentions: string[]; // user_ids
  mention_all: boolean;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (result: MentionResult) => void;
  placeholder?: string;
  canMentionAll?: boolean;
  autoFocus?: boolean;
  compact?: boolean;
}

/** Token used internally for resolved mentions: @[name](user_id) */
const TOKEN_RE = /@\[([^\]]+)\]\(([^\)]+)\)/g;

export function renderMentionContent(content: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(TOKEN_RE);
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    parts.push(
      <span key={`${m.index}-${m[2]}`} style={{ color: "#3B82F6", fontWeight: 600 }}>
        @{m[1]}
      </span>
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(content.slice(last));
  return parts;
}

export function MentionTextarea({
  value,
  onChange,
  onSubmit,
  placeholder = "Escrever comentário...",
  canMentionAll = false,
  autoFocus = false,
  compact = false,
}: Props) {
  const companyId = useActiveCompanyId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState("");
  const [anchor, setAnchor] = useState(0);

  useEffect(() => {
    if (!companyId) return;
    supabase
      .from("profiles")
      .select("user_id,name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setUsers(((data || []) as any[]).map((p) => ({ user_id: p.user_id, name: p.name || "Usuário" })));
      });
  }, [companyId]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    onChange(v);
    const pos = e.target.selectionStart || v.length;
    // Find last "@" before cursor without whitespace after
    const upto = v.slice(0, pos);
    const at = upto.lastIndexOf("@");
    if (at >= 0 && (at === 0 || /\s/.test(upto[at - 1]))) {
      const q = upto.slice(at + 1);
      if (!/\s/.test(q)) {
        setQuery(q.toLowerCase());
        setAnchor(at);
        setShowDropdown(true);
        return;
      }
    }
    setShowDropdown(false);
  };

  const insertMention = (label: string, id: string | "all") => {
    const before = value.slice(0, anchor);
    const afterStart = anchor + 1 + query.length;
    const after = value.slice(afterStart);
    const token = id === "all" ? `@[todos](all) ` : `@[${label}](${id}) `;
    const next = before + token + after;
    onChange(next);
    setShowDropdown(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !showDropdown) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") setShowDropdown(false);
  };

  const submit = () => {
    if (!value.trim()) return;
    const mentions: string[] = [];
    let mention_all = false;
    let text = value;
    const re = new RegExp(TOKEN_RE);
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) !== null) {
      if (m[2] === "all") mention_all = true;
      else if (!mentions.includes(m[2])) mentions.push(m[2]);
    }
    onSubmit({ text, mentions, mention_all });
  };

  const filtered = users
    .filter((u) => !query || u.name.toLowerCase().includes(query))
    .slice(0, 6);

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={compact ? 1 : 2}
        style={{
          width: "100%",
          resize: "none",
          padding: compact ? "8px 12px" : "10px 12px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "inherit",
          fontFamily: "inherit",
          fontSize: 13,
          outline: "none",
        }}
      />
      {showDropdown && (filtered.length > 0 || canMentionAll) && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            marginBottom: 4,
            background: "#0f0f12",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 10,
            zIndex: 50,
            minWidth: 200,
            maxHeight: 220,
            overflowY: "auto",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {canMentionAll && "todos".includes(query) && (
            <div
              onMouseDown={(e) => { e.preventDefault(); insertMention("todos", "all"); }}
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#10B981", fontWeight: 600, borderBottom: "1px solid rgba(255,255,255,0.05)" }}
            >
              @todos · notifica todo o tenant
            </div>
          )}
          {filtered.map((u) => (
            <div
              key={u.user_id}
              onMouseDown={(e) => { e.preventDefault(); insertMention(u.name, u.user_id); }}
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
            >
              {u.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
