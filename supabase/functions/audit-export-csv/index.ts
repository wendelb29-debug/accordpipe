import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" }
      });
    }

    const body = await req.json().catch(() => ({}));
    const filters = body.filters || {};

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10000);

    if (filters.from) query = query.gte("created_at", filters.from);
    if (filters.to)   query = query.lte("created_at", filters.to);
    if (filters.user_id) query = query.eq("user_id", filters.user_id);
    if (filters.action) query = query.eq("action", filters.action);
    if (filters.target_type) query = query.eq("target_type", filters.target_type);
    if (filters.page_path) query = query.eq("details->>page_path", filters.page_path);

    const { data: logs, error } = await query;
    if (error) throw error;

    const headers = ["Data/Hora", "Usuário", "Ação", "Tipo", "Página", "IP", "Detalhes"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = (logs || []).map((l: any) => [
      new Date(l.created_at).toLocaleString("pt-BR"),
      l.user_name || "",
      l.action || "",
      l.target_type || "",
      l.details?.page_path || "",
      l.ip_address || "",
      JSON.stringify(l.details || {}),
    ]);
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        ...cors,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" }
    });
  }
});
