import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["contract-pdfs", "signatures", "user-signatures", "documents"];

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  if (!url) return null;
  for (const bucket of PRIVATE_BUCKETS) {
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = decodeURIComponent(url.substring(idx + marker.length).split("?")[0]);
      return { bucket, path };
    }
  }
  return null;
}

/**
 * Hook that resolves a stored URL (possibly an old public URL) into a signed URL.
 * If the URL is not from a private bucket, returns it as-is.
 */
export function useSignedUrl(storedUrl: string | null | undefined): string | null {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storedUrl) {
      setSignedUrl(null);
      return;
    }

    const parsed = parseStorageUrl(storedUrl);
    if (!parsed) {
      // Not a private bucket URL - could be external or already signed
      setSignedUrl(storedUrl);
      return;
    }

    let cancelled = false;
    supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 3600)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.signedUrl) {
          setSignedUrl(data.signedUrl);
        } else {
          setSignedUrl(storedUrl); // fallback
        }
      });

    return () => { cancelled = true; };
  }, [storedUrl]);

  return signedUrl;
}

/**
 * Resolve a stored URL to a signed URL (imperative version).
 */
export async function resolveSignedUrl(storedUrl: string): Promise<string> {
  if (!storedUrl) return storedUrl;
  const parsed = parseStorageUrl(storedUrl);
  if (!parsed) return storedUrl;
  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  return storedUrl;
}
