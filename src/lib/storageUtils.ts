import { supabase } from "@/integrations/supabase/client";

const PRIVATE_BUCKETS = ["contract-pdfs", "signatures", "user-signatures", "documents"];

/**
 * Parse a Supabase storage public URL into bucket + path.
 */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
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
 * Get a signed URL for a file in a private bucket.
 * Accepts either a full public URL or a raw path + bucket.
 * For authenticated users only (uses client JWT).
 */
export async function getSignedStorageUrl(
  urlOrPath: string,
  bucket?: string,
  expiresIn = 3600,
): Promise<string> {
  if (!urlOrPath) return urlOrPath;

  // Try to parse as a full public URL
  const parsed = parseStorageUrl(urlOrPath);
  if (parsed) {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
    return urlOrPath;
  }

  // If bucket provided, treat as raw path
  if (bucket) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(urlOrPath, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  return urlOrPath;
}

/**
 * Upload a file and return the path (NOT a public URL).
 * Use getSignedStorageUrl(path, bucket) to get a temporary URL when needed.
 */
export async function uploadToPrivateBucket(
  bucket: string,
  path: string,
  file: Blob | File,
  options?: { contentType?: string; upsert?: boolean },
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, file, options);
  if (error) throw error;
  return path;
}

/**
 * Upload a file and return a short-lived signed URL for immediate use.
 */
export async function uploadAndGetSignedUrl(
  bucket: string,
  path: string,
  file: Blob | File,
  options?: { contentType?: string; upsert?: boolean },
  expiresIn = 3600,
): Promise<{ path: string; signedUrl: string }> {
  await uploadToPrivateBucket(bucket, path, file, options);

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) throw error || new Error("Failed to create signed URL");

  return { path, signedUrl: data.signedUrl };
}

/**
 * Get a public-access signed URL via the storage-signed-url edge function.
 * For use on public pages (e.g., contract signing) where no auth is available.
 */
export async function getPublicSignedUrl(
  token: string,
  context: "pdf_contract" | "contract" | "document",
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke("storage-signed-url", {
    body: { token, context },
  });
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
