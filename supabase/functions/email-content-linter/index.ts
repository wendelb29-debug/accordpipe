// email-content-linter
// Analisa assunto + corpo de e-mail e retorna avisos (não bloqueia) sobre
// sinais que aumentam risco de spam. Reutilizado por Envio em Massa e por
// disparos individuais quando o front escolher chamar.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SPAM_WORDS_PT = [
  "grátis","gratis","ganhe dinheiro","100% garantido","clique aqui agora",
  "oferta imperdível","compre já","dinheiro fácil","promoção exclusiva",
  "última chance","urgente!!!","risco zero","renda extra garantida",
  "sem custo","ligue agora","viagra","loteria","prêmio","milionário",
];

const SHORTENERS = ["bit.ly","tinyurl.com","goo.gl","ow.ly","t.co","is.gd","buff.ly","rebrand.ly","cutt.ly"];

interface LintIssue {
  code: string;
  severity: "info" | "warning";
  message: string;
}

function countEmojis(str: string): number {
  const re = /[\p{Extended_Pictographic}]/gu;
  return (str.match(re) || []).length;
}

function stripTags(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function lint({ subject, html, text, isTransactional, hasUnsubscribe }: {
  subject: string; html?: string; text?: string;
  isTransactional?: boolean; hasUnsubscribe?: boolean;
}): { issues: LintIssue[]; score: number } {
  const issues: LintIssue[] = [];
  const rawText = (text || (html ? stripTags(html) : "")) || "";
  const subj = subject || "";

  // Assunto todo em maiúsculas
  const letters = subj.replace(/[^a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]/g, "");
  if (letters.length >= 6 && letters === letters.toUpperCase()) {
    issues.push({ code: "subject_all_caps", severity: "warning", message: "O assunto está todo em maiúsculas — provedores tratam isso como sinal de spam." });
  }
  if (/[!?]{2,}/.test(subj)) {
    issues.push({ code: "subject_excess_punct", severity: "warning", message: "Excesso de pontuação (!!! ou ???) no assunto aumenta risco de spam." });
  }
  const subjEmojis = countEmojis(subj);
  if (subjEmojis >= 3) {
    issues.push({ code: "subject_many_emojis", severity: "warning", message: `Muitos emojis no assunto (${subjEmojis}). Reduza para no máximo 1–2.` });
  }

  // Palavras spam
  const haystack = (subj + " " + rawText).toLowerCase();
  const hits = SPAM_WORDS_PT.filter((w) => haystack.includes(w));
  if (hits.length) {
    issues.push({ code: "spam_words", severity: "warning", message: `Termos frequentemente associados a spam encontrados: ${hits.slice(0, 5).join(", ")}.` });
  }

  // Links encurtados
  const body = (html || "") + " " + (text || "");
  const shortenerHit = SHORTENERS.find((d) => body.toLowerCase().includes(d));
  if (shortenerHit) {
    issues.push({ code: "shortened_link", severity: "warning", message: `Link encurtado detectado (${shortenerHit}). Use o domínio real para melhor entregabilidade.` });
  }

  // Ausência de descadastro em não-transacional
  if (!isTransactional && !hasUnsubscribe) {
    const hasUnsubKeyword = /descadastr|unsubscribe|sair da lista|remover meu e-?mail/i.test(rawText + " " + (html || ""));
    if (!hasUnsubKeyword) {
      issues.push({ code: "missing_unsubscribe", severity: "warning", message: "E-mail em massa sem link de descadastro. Inclua um link claro para o usuário se descadastrar." });
    }
  }

  // Proporção imagem/texto
  if (html) {
    const imgCount = (html.match(/<img\b/gi) || []).length;
    const textLen = stripTags(html).length;
    if (imgCount >= 1 && textLen < 120) {
      issues.push({ code: "image_heavy", severity: "warning", message: "Muita imagem e pouco texto — filtros anti-spam penalizam esse padrão." });
    }
    if (imgCount >= 6) {
      issues.push({ code: "too_many_images", severity: "info", message: `${imgCount} imagens no e-mail. Verifique se todas são necessárias.` });
    }
  }

  // Falta versão texto
  if (html && !text) {
    issues.push({ code: "missing_text_alternative", severity: "info", message: "Envie sempre em multipart (HTML + texto). O texto puro será gerado automaticamente se você não fornecer." });
  }

  const score = Math.max(0, 100 - issues.reduce((s, i) => s + (i.severity === "warning" ? 15 : 5), 0));
  return { issues, score };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const result = lint({
      subject: String(body.subject || ""),
      html: typeof body.html === "string" ? body.html : undefined,
      text: typeof body.text === "string" ? body.text : undefined,
      isTransactional: !!body.isTransactional,
      hasUnsubscribe: !!body.hasUnsubscribe,
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
