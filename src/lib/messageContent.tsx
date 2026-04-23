import React from "react";

/**
 * Helpers shared by the Accord Stack chat to render rich message content:
 *  - autolink URLs in plain text
 *  - classify attachments by extension/mime
 *  - format file sizes
 */

const URL_REGEX =
  /\b((?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]}])/gi;

/**
 * Convert a plain string into React nodes where any URL becomes a clickable
 * link (target=_blank, rel=noopener noreferrer). Preserves line breaks.
 */
export function linkifyText(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    URL_REGEX.lastIndex = 0;

    while ((match = URL_REGEX.exec(line)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (start > lastIndex) {
        parts.push(line.slice(lastIndex, start));
      }
      const raw = match[0];
      const href = raw.startsWith("http") ? raw : `https://${raw}`;
      parts.push(
        <a
          key={`${lineIdx}-${start}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 break-all hover:opacity-80"
        >
          {raw}
        </a>,
      );
      lastIndex = end;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return (
      <React.Fragment key={lineIdx}>
        {parts}
        {lineIdx < lines.length - 1 ? <br /> : null}
      </React.Fragment>
    );
  });
}

export type AttachmentKind = "image" | "pdf" | "doc" | "sheet" | "archive" | "text" | "video" | "audio" | "file";

const EXT_MAP: Record<string, AttachmentKind> = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image",
  pdf: "pdf",
  doc: "doc", docx: "doc",
  xls: "sheet", xlsx: "sheet", csv: "sheet",
  ppt: "doc", pptx: "doc",
  txt: "text", md: "text", log: "text",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
  mp4: "video", mov: "video", webm: "video", mkv: "video",
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio",
};

export function getExtension(name?: string | null, url?: string | null): string {
  const src = (name || url || "").split("?")[0];
  const dot = src.lastIndexOf(".");
  if (dot < 0) return "";
  return src.slice(dot + 1).toLowerCase();
}

export function classifyAttachment(opts: {
  mime?: string | null;
  fileName?: string | null;
  url?: string | null;
}): AttachmentKind {
  const mime = (opts.mime || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = getExtension(opts.fileName, opts.url);
  return EXT_MAP[ext] || "file";
}

export function formatFileSize(bytes?: number | string | null): string | undefined {
  if (bytes == null) return undefined;
  const n = typeof bytes === "string" ? Number(bytes) : bytes;
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Friendly label by extension, e.g. "PDF", "DOCX". */
export function extensionLabel(name?: string | null, url?: string | null): string {
  const ext = getExtension(name, url);
  return ext ? ext.toUpperCase() : "ARQUIVO";
}
