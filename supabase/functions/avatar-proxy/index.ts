import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXTS = ["jpg", "jpeg", "png", "webp", "gif"];
const CTYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("u");
    const rawPath = url.searchParams.get("p");

    let candidates: string[] = [];
    if (rawPath) {
      // basic sanitization: no slashes, no traversal
      if (rawPath.includes("/") || rawPath.includes("..") || rawPath.length > 128) {
        return new Response("Invalid path", { status: 400, headers: cors });
      }
      const ext = rawPath.split(".").pop()?.toLowerCase() || "";
      if (!EXTS.includes(ext)) {
        return new Response("Invalid extension", { status: 400, headers: cors });
      }
      candidates = [rawPath];
    } else if (userId && UUID_RE.test(userId)) {
      candidates = EXTS.map((e) => `${userId}.${e}`);
    } else {
      return new Response("Missing or invalid user id", { status: 400, headers: cors });
    }

    for (const name of candidates) {
      const { data, error } = await supabase.storage.from("avatars").download(name);
      if (error || !data) continue;
      const ext = name.split(".").pop()!.toLowerCase();
      const buf = await data.arrayBuffer();
      return new Response(buf, {
        headers: {
          ...cors,
          "Content-Type": CTYPE[ext] || "application/octet-stream",
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      });
    }
    return new Response("Not found", { status: 404, headers: cors });
  } catch (e) {
    console.error("avatar-proxy error", e);
    return new Response("Internal error", { status: 500, headers: cors });
  }
});
