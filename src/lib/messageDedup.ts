/**
 * Central message deduplication utility for the Accord Stack inbox.
 *
 * Every code path that writes into the messages state (initial fetch,
 * realtime INSERT, realtime UPDATE, optimistic send, refetch) MUST funnel
 * through `mergeMessagesDedup` so a message can never be rendered twice.
 */

export interface DedupableMessage {
  id?: string | null;
  external_message_id?: string | null;
  message_id?: string | null;
  provider_message_id?: string | null;
  client_temp_id?: string | null;
  contact_id?: string | null;
  conversation_id?: string | null;
  phone?: string | null;
  direction?: string | null;
  message?: string | null;
  content?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

/**
 * Stable unique key for a message. Prefers provider/external IDs, falls back
 * to the database id, and finally to a content-based hash so realtime events
 * that arrive before the DB roundtrip still dedupe correctly.
 */
export function getMessageUniqueKey(message: any): string {
  return (
    message?.external_message_id ||
    message?.message_id ||
    message?.provider_message_id ||
    message?.client_temp_id ||
    message?.id ||
    `${message?.contact_id || message?.conversation_id || message?.phone || ""}-${
      message?.direction || ""
    }-${message?.message || message?.content || ""}-${message?.created_at || ""}`
  );
}

/**
 * Merge two lists of messages, dropping duplicates by stable key.
 * When the same key appears more than once, later occurrences shallow-merge
 * over earlier ones — this is what lets a confirmed backend message replace
 * an optimistic temp message with the same key.
 */
export function mergeMessagesDedup<T = any>(prev: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();

  for (const msg of [...prev, ...incoming]) {
    const key = getMessageUniqueKey(msg);
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...(existing as any), ...(msg as any) });
    } else {
      map.set(key, msg);
    }
  }

  return Array.from(map.values()).sort((a: any, b: any) => {
    const ta = a?.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b?.created_at ? new Date(b.created_at).getTime() : 0;
    return ta - tb;
  });
}

/** Convenience: dedupe a single list (e.g. straight after a fetch). */
export function dedupMessages<T = any>(list: T[]): T[] {
  return mergeMessagesDedup<T>([], list);
}

