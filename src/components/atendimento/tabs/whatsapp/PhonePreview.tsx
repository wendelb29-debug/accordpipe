export type PreviewButton = { label: string; type?: "reply" | "url" | "call" | "copy" } | string;

interface Props {
  header?: string;
  headerMediaType?: "none" | "text" | "image" | "video" | "document" | "audio";
  headerMediaUrl?: string | null;
  headerMediaDocName?: string | null;
  body: string;
  footer?: string;
  buttons?: PreviewButton[];
  compact?: boolean;
}

function labelOf(b: PreviewButton) {
  return typeof b === "string" ? b : b.label || "";
}

const MEDIA_ICON: Record<string, string> = {
  image: "🖼️",
  video: "🎬",
  audio: "🎧",
  document: "📄",
};

export function PhonePreview({
  header,
  headerMediaType = "text",
  headerMediaUrl,
  headerMediaDocName,
  body,
  footer,
  buttons,
  compact,
}: Props) {
  const btns = (buttons || []).filter((b) => labelOf(b).trim().length > 0);
  const showList = btns.length > 3;

  return (
    <div
      className={`mx-auto rounded-[28px] border border-border bg-neutral-900 p-2 shadow-inner ${
        compact ? "w-full max-w-[240px]" : "w-[280px]"
      }`}
    >
      <div className="rounded-[22px] bg-[#0b1410] p-3 min-h-[200px] flex flex-col gap-2">
        <div className="max-w-[85%] rounded-lg bg-[#1f2c34] px-2 py-2 text-white text-xs space-y-1 shadow overflow-hidden">
          {headerMediaType === "image" && headerMediaUrl && (
            <img src={headerMediaUrl} className="w-full rounded-md" alt="" />
          )}
          {headerMediaType === "video" && (
            <div className="w-full h-24 rounded-md bg-black/50 flex items-center justify-center text-2xl">🎬</div>
          )}
          {headerMediaType === "audio" && (
            <div className="w-full rounded-md bg-black/40 px-2 py-2 flex items-center gap-2 text-[11px]">🎧 Áudio</div>
          )}
          {headerMediaType === "document" && (
            <div className="w-full rounded-md bg-black/40 px-2 py-2 flex items-center gap-2 text-[11px]">
              📄 <span className="truncate">{headerMediaDocName || "documento.pdf"}</span>
            </div>
          )}
          {(headerMediaType === "text" || headerMediaType === "none") && header && (
            <div className="font-semibold px-1">{header}</div>
          )}
          <div className="whitespace-pre-wrap break-words px-1">{body || "Seu texto aparece aqui..."}</div>
          {footer && <div className="text-[10px] text-white/50 pt-1 px-1">{footer}</div>}
        </div>
        {btns.length > 0 && (
          <div className="space-y-1">
            {showList ? (
              <div className="max-w-[85%] rounded-lg bg-[#1f2c34] py-1.5 text-center text-xs text-[#53bdeb]">
                ▤ Ver opções ({btns.length})
              </div>
            ) : (
              btns.slice(0, 3).map((b, i) => (
                <div
                  key={i}
                  className="max-w-[85%] rounded-lg bg-[#1f2c34] py-1.5 text-center text-xs text-[#53bdeb]"
                >
                  {labelOf(b)}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
