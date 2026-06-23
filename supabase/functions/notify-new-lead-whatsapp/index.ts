// Sends a WhatsApp notification to the current user when a new lead arrives.
// Called from the client-side useNewLeadNotifications hook.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

function normalizePhone(p: string): string {
  return (p || '').replace(/\D/g, '')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: claims } = await anon.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const {
      lead_id, company_name, contact_name, workspace_id, servidor_id,
    } = body || {}

    if (!lead_id || !company_name || !servidor_id) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // User's WhatsApp number from profile
    const { data: profile } = await admin
      .from('profiles')
      .select('whatsapp, full_name')
      .eq('user_id', userId)
      .maybeSingle()

    const userPhone = profile?.whatsapp
    if (!userPhone) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_user_whatsapp' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Tenant WhatsApp integration (active)
    const { data: integ } = await admin
      .from('tenant_whatsapp_integrations')
      .select('provider_type, server_url, instance_token, instance_id, is_active')
      .eq('tenant_id', servidor_id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!integ?.server_url || !integ?.instance_token) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_integration' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Workspace name
    let workspaceName = ''
    if (workspace_id) {
      const { data: ws } = await admin
        .from('workspaces').select('name').eq('id', workspace_id).maybeSingle()
      workspaceName = ws?.name || ''
    }

    const link = `https://accordpipe.com.br/atendimento?lead=${lead_id}`
    const text = `✨ *Novo Lead*\n\n*${company_name}*${
      contact_name ? `\nContato: ${contact_name}` : ''
    }${workspaceName ? `\nWorkspace: ${workspaceName}` : ''}\n\n👉 ${link}`

    const phone = normalizePhone(userPhone)
    const base = integ.server_url.replace(/\/$/, '')

    let ok = false
    if (integ.provider_type === 'zapi' && integ.instance_id) {
      const r = await fetch(
        `${base}/instances/${integ.instance_id}/token/${integ.instance_token}/send-text`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: text }),
        },
      )
      ok = r.ok
    } else {
      const r = await fetch(`${base}/send/text`, {
        method: 'POST',
        headers: { token: integ.instance_token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: phone, text }),
      })
      ok = r.ok
    }

    return new Response(JSON.stringify({ success: ok }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('notify-new-lead-whatsapp error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
