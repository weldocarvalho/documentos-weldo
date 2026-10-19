import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getAppOrigin } from "@/lib/email.server";
import { sendMetaCapiEvent } from "@/lib/metaCapi.server";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function resolveCorsOrigin(request: Request): string {
  if (ALLOWED_ORIGINS.length === 0) return "*";
  const origin = request.headers.get("origin");
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return ALLOWED_ORIGINS[0];
}

let _supabaseAdmin: SupabaseClient<Database> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        `[Trial Started API] Erro crítico: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente.`,
      );
    }

    _supabaseAdmin = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

/**
 * Conversions API (servidor) para o evento StartTrial -- complementa o Pixel do
 * navegador disparado em auth.callback.tsx. Esse é o evento de otimização da
 * campanha, e é o mais exposto a perda de atribuição: o magic link do e-mail
 * costuma abrir num app/navegador diferente de onde a pessoa clicou no anúncio,
 * o que pode derrubar o Pixel silenciosamente. O CAPI dá uma segunda via.
 *
 * Exige um access token válido do Supabase (o usuário já está autenticado nesse
 * ponto do fluxo, logo após o clique no magic link) -- assim não confiamos no
 * e-mail que o cliente mandar, buscamos direto no Supabase Auth.
 */
export const Route = createFileRoute("/api/public/auth/trial-started")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": resolveCorsOrigin(request),
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
        });
      },

      POST: async ({ request }) => {
        const corsHeaders = {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": resolveCorsOrigin(request),
        };

        try {
          const authHeader = request.headers.get("authorization") ?? "";
          const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
          if (!accessToken) {
            return new Response(JSON.stringify({ error: "Não autenticado." }), {
              status: 401,
              headers: corsHeaders,
            });
          }

          const supabaseAdmin = getSupabaseAdmin();
          const { data: userData, error: userError } =
            await supabaseAdmin.auth.getUser(accessToken);
          if (userError || !userData.user?.email) {
            return new Response(JSON.stringify({ error: "Sessão inválida." }), {
              status: 401,
              headers: corsHeaders,
            });
          }

          const body = (await request.json().catch(() => ({}))) as {
            fbp?: string | null;
            fbc?: string | null;
            eventId?: string | null;
            // Atribuição guardada no localStorage do navegador (ver
            // src/lib/landingMetrics.ts) -- serve de reforço quando não existir
            // snapshot no banco (ex.: usuário criado antes desta atribuição
            // server-side existir). Só é usada se ela for do MESMO navegador que
            // abriu o magic link, o que só ajuda no caso same-device.
            fallbackAttribution?: {
              utm_source?: string | null;
              utm_medium?: string | null;
              utm_campaign?: string | null;
              utm_content?: string | null;
              utm_term?: string | null;
              fbclid?: string | null;
            } | null;
          };

          // Mesmo eventId do Pixel (navegador) para a Meta deduplicar.
          const eventId =
            typeof body.eventId === "string" && body.eventId.length > 0
              ? body.eventId.slice(0, 100)
              : `trial_${userData.user.id}`;

          const result = await sendMetaCapiEvent({
            eventName: "StartTrial",
            eventId,
            eventSourceUrl: `${getAppOrigin()}/auth/callback`,
            userData: {
              email: userData.user.email,
              fbp: body.fbp ?? null,
              fbc: body.fbc ?? null,
            },
            customData: { content_name: "free_trial_3_days" },
          });

          // Resolve a atribuição real da campanha para o registro de trial_started:
          // 1) snapshot gravado em /api/public/auth/check-login no momento do
          //    cadastro (mesma sessão que clicou no anúncio, funciona mesmo se o
          //    magic link for aberto depois num aparelho diferente);
          // 2) se não achar (conta antiga, ou signup sem nenhum utm/fbclid), cai
          //    para a atribuição que o navegador do callback mandou do seu
          //    próprio localStorage (só cobre o caso same-device).
          // Sem as duas, grava NULL mesmo -- não há de onde tirar o dado.
          let attribution = {
            utm_source: null as string | null,
            utm_medium: null as string | null,
            utm_campaign: null as string | null,
            utm_content: null as string | null,
            utm_term: null as string | null,
            fbclid: null as string | null,
          };

          const { data: snapshot } = await supabaseAdmin
            .from("landing_page_visits")
            .select("utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid")
            .eq("user_id", userData.user.id)
            .eq("event_type", "signup_attribution_snapshot")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (snapshot) {
            attribution = snapshot;
          } else if (body.fallbackAttribution) {
            attribution = {
              utm_source: body.fallbackAttribution.utm_source ?? null,
              utm_medium: body.fallbackAttribution.utm_medium ?? null,
              utm_campaign: body.fallbackAttribution.utm_campaign ?? null,
              utm_content: body.fallbackAttribution.utm_content ?? null,
              utm_term: body.fallbackAttribution.utm_term ?? null,
              fbclid: body.fallbackAttribution.fbclid ?? null,
            };
          }

          const { error: insertError } = await supabaseAdmin.from("landing_page_visits").insert({
            path: "/auth/callback",
            full_url: null,
            referrer: null,
            user_id: userData.user.id,
            event_type: "trial_started",
            ...attribution,
          });
          if (insertError) {
            console.warn(
              `[Trial Started] falha ao gravar landing_page_visits userId=${userData.user.id}:`,
              insertError.message,
            );
          }

          return new Response(JSON.stringify({ ok: result.ok }), {
            status: 200,
            headers: corsHeaders,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("[Trial Started Error]:", message);
          return new Response(JSON.stringify({ error: "Não foi possível registrar agora." }), {
            status: 500,
            headers: corsHeaders,
          });
        }
      },
    },
  },
});
