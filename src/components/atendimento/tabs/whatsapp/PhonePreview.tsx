interface Props {
  header?: string;
  body: string;
  footer?: string;
  buttons?: string[];
  compact?: boolean;
}

export function PhonePreview({ header, body, footer, buttons, compact }: Props) {
  return (
    <div
      className={`mx-auto rounded-[28px] border border-border bg-neutral-900 p-2 shadow-inner ${
        compact ? "w-full max-w-[240px]" : "w-[280px]"
      }`}
    >
      <div className="rounded-[22px] bg-[#0b1410] p-3 min-h-[200px] flex flex-col gap-2">
        <div className="max-w-[85%] rounded-lg bg-[#1f2c34] px-3 py-2 text-white text-xs space-y-1 shadow">
          {header && <div className="font-semibold">{header}</div>}
          <div className="whitespace-pre-wrap break-words">{body || "Seu texto aparece aqui..."}</div>
          {footer && <div className="text-[10px] text-white/50 pt-1">{footer}</div>}
        </div>
        {buttons && buttons.length > 0 && (
          <div className="space-y-1">
            {buttons.slice(0, 3).map((b, i) => (
              <div
                key={i}
                className="max-w-[85%] rounded-lg bg-[#1f2c34] py-1.5 text-center text-xs text-[#53bdeb]"
              >
                {b}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
