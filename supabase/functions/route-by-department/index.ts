import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface RouteRequest {
  contact_id: string;
  tenant_id: string;
  selected_option: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authentication: require a valid Supabase JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RouteRequest;

    if (!body.contact_id || !body.tenant_id || !body.selected_option) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tenant ownership check
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_master, company_id")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    let allowed = !!profile?.is_master || profile?.company_id === body.tenant_id;
    if (!allowed) {
      const { data: link } = await supabase
        .from("user_tenants")
        .select("id")
        .eq("user_id", userData.user.id)
        .eq("tenant_id", body.tenant_id)
        .eq("status", "ativo")
        .maybeSingle();
      allowed = !!link;
    }
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const optionNum = parseInt(body.selected_option, 10);
    if (Number.isNaN(optionNum) || optionNum < 1 || optionNum > 9) {
      return new Response(
        JSON.stringify({ error: "Opção inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: departments, error: deptError } = await supabase
      .from("tenant_departments")
      .select("*")
      .eq("tenant_id", body.tenant_id)
      .eq("is_active", true)
      .order("position", { ascending: true });

    if (deptError) {
      console.error("[route-by-department] dept query error:", deptError);
      return new Response(
        JSON.stringify({ error: deptError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!departments || departments.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum departamento configurado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedDept = departments[optionNum - 1];
    if (!selectedDept) {
      return new Response(
        JSON.stringify({ error: "Opção não disponível" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: assignedUser, error: routeError } = await supabase.rpc(
      "route_by_department",
      {
        p_contact_id: body.contact_id,
        p_tenant_id: body.tenant_id,
        p_department_id: selectedDept.id,
        p_selected_option: body.selected_option,
      }
    );

    if (routeError) {
      console.error("[route-by-department] routing failed:", routeError);
      return new Response(
        JSON.stringify({ error: routeError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: "routed",
        assigned_user: assignedUser,
        department_id: selectedDept.id,
        department: selectedDept.name,
        auto_response: selectedDept.auto_response_message,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[route-by-department] error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
