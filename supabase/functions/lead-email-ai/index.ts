import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { geminiChatCompletion } from "../_shared/gemini.ts";


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { lead, instruction, currentSubject, currentBody, senderName } = await req.json();

    const leadCtx = lead
      ? `Lead/contato:
- Nome: ${lead.name || "-"}
- Empresa: ${lead.empresa || lead.company || "-"}
- E-mail: ${lead.email || "-"}
- Telefone: ${lead.phone || lead.whatsapp || "-"}
- Valor: ${lead.value || lead.valor_total || "-"}
- Origem: ${lead.origem || "-"}
- Observações: ${lead.observacoes || lead.notes || "-"}`
      : "";

    const system = `Você é um assistente que escreve e-mails comerciais em português do Brasil, claros, cordiais e curtos. Retorne APENAS um JSON válido com as chaves "subject" e "body_html". O "body_html" deve usar tags HTML simples (<p>, <br>, <strong>, <ul><li>) — sem <html>, <head> ou <body>. Não inclua assinatura genérica se já houver nome do remetente.`;

    const user = `${leadCtx}

Remetente: ${senderName || "-"}
Assunto atual (pode estar vazio): ${currentSubject || "-"}
Rascunho atual (pode estar vazio): ${currentBody || "-"}

Instrução do usuário: ${instruction || "Escreva um e-mail apropriado para este contato."}`;

    const res = await geminiChatCompletion({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }, corsHeaders);

    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({ error: `AI error: ${res.status} ${text}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const json = await res.json();
    const content = json.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = { subject: "", body_html: content }; }

    return new Response(JSON.stringify({
      subject: parsed.subject || "",
      body_html: parsed.body_html || parsed.body || "",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
