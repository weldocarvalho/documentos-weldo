import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { sendMagicLinkEmail, getAppOrigin } from "@/lib/email.server";
import { findOrCreateUserByEmail, ensureNutritionProfile } from "@/lib/account.server";
import { checkNewSignupAllowed, recordNewSignup } from "@/lib/signupGuard.server";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let _supabaseAdmin: SupabaseClient<Database> | null = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error(
        `[Check Login API] Erro crítico: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no ambiente.`,
      );
    }

    _supabaseAdmin = createClient<Database>(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _supabaseAdmin;
}

async function sendMagicLink(email: string) {
  return sendMagicLinkEmail(getSupabaseAdmin(), email);
}

/**
 * Entrada única do app (login e cadastro gratuito):
 *  - e-mail já cadastrado -> envia o link de acesso (status ALLOWED);
 *  - e-mail novo -> passa pela proteção de cadastro (descartáveis + limite por IP),
 *    cria a conta e envia o link (status SIGNUP_CREATED). O teste gratuito de 3
 *    dias começa no PRIMEIRO login, em claim_free_trial() (auth.callback).
 */
export const Route = createFileRoute("/api/public/auth/check-login")({
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
          const body = (await request.json()) as {
            email?: string;
            fbp?: string | null;
            fbc?: string | null;
            eventId?: string | null;
            noTrack?: boolean;
            utm_source?: string | null;
            utm_medium?: string | null;
            utm_campaign?: string | null;
            utm_content?: string | null;
            utm_term?: string | null;
            fbclid?: string | null;
          };
          const rawEmail = typeof body.email === "string" ? body.email : "";
          const formattedEmail = rawEmail.toLowerCase().trim();

          if (!formattedEmail || !EMAIL_RE.test(formattedEmail) || formattedEmail.length > 200) {
            return new Response(JSON.stringify({ error: "Informe um e-mail válido." }), {
              status: 400,
              headers: corsHeaders,
            });
          }

          const supabaseAdmin = getSupabaseAdmin();

          const { data: exists, error: rpcError } = await supabaseAdmin.rpc(
            "check_subscriber_status",
            { target_email: formattedEmail },
          );
          if (rpcError) {
            console.error("[Check Login] Erro na RPC:", rpcError.message);
            throw rpcError;
          }

          if (exists) {
            // Autocura: conta existente sem perfil (ex.: falha antiga na criação) ganha o perfil
            // aqui. Nunca bloqueia o login.
            try {
              const existingUserId = await findOrCreateUserByEmail(formattedEmail);
              await ensureNutritionProfile(existingUserId, formattedEmail, null);
            } catch (healErr) {
              console.warn("[Check Login] autocura do perfil falhou:", healErr);
            }
            const linkSent = await sendMagicLink(formattedEmail);
            return new Response(JSON.stringify({ status: "ALLOWED", linkSent }), {
              status: 200,
              headers: corsHeaders,
            });
          }

          // ---- Cadastro novo (teste gratuito) ----
          const guard = await checkNewSignupAllowed(formattedEmail, request);
          if (!guard.ok) {
            return new Response(JSON.stringify({ status: guard.reason, error: guard.message }), {
              status: guard.reason === "rate_limited" ? 429 : 400,
              headers: corsHeaders,
            });
          }

          const userId = await findOrCreateUserByEmail(formattedEmail);
          await ensureNutritionProfile(userId, formattedEmail, null);
          await recordNewSignup(guard.ipHash, formattedEmail);

          // Guarda a atribuição (utm/fbclid) de quem clicou no anúncio, associada ao
          // userId, direto no banco (bypass de RLS via service role). É o que permite
          // o claim_free_trial() em /auth/callback recuperar a campanha de origem
          // mesmo quando o magic link do e-mail é aberto num aparelho diferente do
          // que clicou no anúncio -- nesse caso o navegador do callback não tem o
          // localStorage de quem clicou, então não dá para confiar só no client.
          const hasAttribution = Boolean(body.utm_source || body.fbclid);
          if (hasAttribution) {
            const { error: attributionError } = await supabaseAdmin
              .from("landing_page_visits")
              .insert({
                path: "/signup",
                full_url: null,
                referrer: null,
                utm_source: body.utm_source ?? null,
                utm_medium: body.utm_medium ?? null,
                utm_campaign: body.utm_campaign ?? null,
                utm_content: body.utm_content ?? null,
                utm_term: body.utm_term ?? null,
                fbclid: body.fbclid ?? null,
                user_id: userId,
                // Tipo próprio (não é "signup_completed") para não duplicar a
                // contagem do evento real que o client já grava em
                // FreeTrialSignup.tsx / login.tsx. Este aqui é só um snapshot de
                // atribuição para o trial-started.ts reaproveitar depois.
                event_type: "signup_attribution_snapshot",
              });
            if (attributionError) {
              console.warn(
                `[Check Login] falha ao gravar atribuição de signup userId=${userId}:`,
                attributionError.message,
              );
            }
          }

          const linkSent = await sendMagicLink(formattedEmail);

          // Conversão para os anúncios: CompleteRegistration. O mesmo eventId vai no
          // Pixel do navegador (deduplicação). Testes com ?nopixel=1 mandam noTrack.
          const eventId =
            typeof body.eventId === "string" && body.eventId.length > 0
              ? body.eventId.slice(0, 100)
              : `signup_${userId}`;
          if (!body.noTrack) {
            await sendMetaCapiEvent({
              eventName: "CompleteRegistration",
              eventId,
              eventSourceUrl: `${getAppOrigin()}/sales-lp`,
              userData: { email: formattedEmail, fbp: body.fbp ?? null, fbc: body.fbc ?? null },
              customData: { content_name: "free_trial_signup", status: true },
            });
          }

          console.log(`[Check Login] novo cadastro criado userId=${userId} linkSent=${linkSent}`);
          return new Response(
            JSON.stringify({ status: "SIGNUP_CREATED", linkSent, eventId, userId }),
            { status: 200, headers: corsHeaders },
          );
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : String(e);
          console.error("[Check Login Error]:", message);
          return new Response(
            JSON.stringify({ error: "Não foi possível concluir agora. Tente novamente." }),
            { status: 500, headers: corsHeaders },
          );
        }
      },
    },
  },
});
