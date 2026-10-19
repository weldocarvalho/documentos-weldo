import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH_VERSION = "v21.0";
const MAX_PER_IP_WINDOW = 6;
const WINDOW_MINUTES = 10;

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function clean(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed.length ? trimmed : null;
}

function corsHeaders(origin: string | null, allowed: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && allowed.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body: unknown, status: number, extra: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...extra },
  });
}

async function sendCapi(opts: {
  pixelId: string;
  token: string;
  eventId: string;
  sourceUrl: string | null;
  fullName: string;
  phone: string;
  fbp: string | null;
  fbc: string | null;
  ip: string | null;
  userAgent: string | null;
  leadId: string;
  appSlug: string;
}): Promise<{ status: "sent" | "failed"; response: unknown }> {
  const parts = opts.fullName.toLowerCase().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const userData: Record<string, unknown> = {
    ph: [await sha256(opts.phone)],
    fn: first ? [await sha256(first)] : undefined,
    ln: last ? [await sha256(last)] : undefined,
    country: [await sha256("br")],
    external_id: [await sha256(opts.leadId)],
    client_ip_address: opts.ip ?? undefined,
    client_user_agent: opts.userAgent ?? undefined,
    fbp: opts.fbp ?? undefined,
    fbc: opts.fbc ?? undefined,
  };
  const body: Record<string, unknown> = {
    data: [{
      event_name: "Lead",
      event_time: Math.floor(Date.now() / 1000),
      event_id: opts.eventId,
      event_source_url: opts.sourceUrl ?? undefined,
      action_source: "website",
      user_data: userData,
      custom_data: { content_name: "pre_cadastro_motorista", app: opts.appSlug },
    }],
  };
  const testCode = Deno.env.get("META_TEST_EVENT_CODE");
  if (testCode) body.test_event_code = testCode;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${opts.pixelId}/events?access_token=${encodeURIComponent(opts.token)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const response = await res.json().catch(() => ({}));
    return { status: res.ok ? "sent" : "failed", response };
  } catch (err) {
    return { status: "failed", response: { error: String(err) } };
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  const slugGuess = new URL(req.url).searchParams.get("app") ?? "wc-corridas";
  const { data: appGuess } = await admin
    .from("landing_apps")
    .select("allowed_origins")
    .eq("app_slug", slugGuess)
    .maybeSingle();
  const preAllowed: string[] = appGuess?.allowed_origins ?? [];

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin, preAllowed) });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, corsHeaders(origin, preAllowed));

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400, corsHeaders(origin, preAllowed));
  }

  const appSlug = clean(payload.app_slug, 41);
  if (!appSlug) return json({ error: "invalid_app" }, 400, corsHeaders(origin, preAllowed));

  const { data: app } = await admin
    .from("landing_apps")
    .select("app_slug, meta_pixel_id, capi_secret_name, allowed_origins, active")
    .eq("app_slug", appSlug)
    .maybeSingle();

  if (!app || !app.active) return json({ error: "invalid_app" }, 400, corsHeaders(origin, preAllowed));

  const cors = corsHeaders(origin, app.allowed_origins ?? []);
  if (!origin || !(app.allowed_origins ?? []).includes(origin)) {
    return json({ error: "origin_not_allowed" }, 403, cors);
  }

  if (clean(payload.website, 200)) return json({ ok: true }, 200, cors);

  const fullName = clean(payload.nome, 120);
  const phone = clean(payload.whatsapp, 20)?.replace(/\D/g, "") ?? "";
  const carYear = clean(payload.ano_carro, 30);
  if (!fullName || fullName.length < 2) return json({ error: "invalid_name" }, 400, cors);
  if (!/^55[1-9][0-9]9[0-9]{8}$/.test(phone)) return json({ error: "invalid_phone" }, 400, cors);
  if (!carYear) return json({ error: "invalid_car_year" }, 400, cors);
  if (payload.consentimento_lgpd !== true) return json({ error: "consent_required" }, 400, cors);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const userAgent = clean(req.headers.get("user-agent"), 600);
  const salt = Deno.env.get("IP_HASH_SALT") ?? appSlug;
  const ipHash = ip ? await sha256(`${salt}:${ip}`) : null;

  if (ipHash) {
    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await admin
      .from("landing_leads")
      .select("id", { count: "exact", head: true })
      .eq("app_slug", appSlug)
      .eq("ip_hash", ipHash)
      .gte("updated_at", since);
    if ((count ?? 0) >= MAX_PER_IP_WINDOW) return json({ error: "rate_limited" }, 429, cors);
  }

  const utm = (payload.utm && typeof payload.utm === "object" ? payload.utm : {}) as Record<string, unknown>;
  const eventId = clean(payload.event_id, 100) ?? crypto.randomUUID();
  const fbp = clean(payload.fbp, 200);
  const fbc = clean(payload.fbc, 300);
  const sourceUrl = clean(payload.source_url, 500);

  const record = {
    app_slug: appSlug,
    full_name: fullName,
    phone,
    form_data: { car_year: carYear },
    consent_lgpd: true,
    utm_source: clean(utm.utm_source, 200),
    utm_medium: clean(utm.utm_medium, 200),
    utm_campaign: clean(utm.utm_campaign, 200),
    utm_content: clean(utm.utm_content, 200),
    utm_term: clean(utm.utm_term, 200),
    fbclid: clean(utm.fbclid, 500),
    fbp,
    fbc,
    session_id: clean(payload.session_id, 100),
    visitor_id: clean(payload.visitor_id, 100),
    event_id: eventId,
    source_url: sourceUrl,
    user_agent: userAgent,
    ip_hash: ipHash,
  };

  const { data: existing } = await admin
    .from("landing_leads")
    .select("id, submissions")
    .eq("app_slug", appSlug)
    .eq("phone", phone)
    .maybeSingle();

  let leadId: string;
  let duplicate = false;

  if (existing) {
    duplicate = true;
    leadId = existing.id;
    const { error } = await admin
      .from("landing_leads")
      .update({
        full_name: fullName,
        form_data: { car_year: carYear },
        submissions: (existing.submissions ?? 1) + 1,
        ip_hash: ipHash,
      })
      .eq("id", leadId);
    if (error) return json({ error: "storage_failed" }, 500, cors);
  } else {
    const { data: inserted, error } = await admin
      .from("landing_leads")
      .insert(record)
      .select("id")
      .single();
    if (error || !inserted) return json({ error: "storage_failed" }, 500, cors);
    leadId = inserted.id;
  }

  const secretName = app.capi_secret_name as string | null;
  const token = secretName ? Deno.env.get(secretName) : null;

  if (app.meta_pixel_id && token) {
    const capi = await sendCapi({
      pixelId: app.meta_pixel_id,
      token,
      eventId,
      sourceUrl,
      fullName,
      phone,
      fbp,
      fbc,
      ip,
      userAgent,
      leadId,
      appSlug,
    });
    await admin
      .from("landing_leads")
      .update({ capi_status: capi.status, capi_response: capi.response })
      .eq("id", leadId);
  } else {
    await admin.from("landing_leads").update({ capi_status: "skipped" }).eq("id", leadId);
  }

  return json({ ok: true, duplicate }, 200, cors);
});
