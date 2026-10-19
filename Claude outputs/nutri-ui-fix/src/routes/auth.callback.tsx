import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackPixelEvent, isPixelDisabled } from "@/lib/pixel";
import { getFbCookies } from "@/lib/metaCookies";
import { readStoredAttribution } from "@/lib/landingMetrics";

const ALLOWED_REDIRECTS = new Set([
  "/onboarding",
  "/today",
  "/routine",
  "/journal",
  "/progress",
  "/profile",
  "/tips",
  "/assinar",
]);

function safeRedirect(input: string | undefined): string {
  if (!input || !input.startsWith("/")) return "/";
  return ALLOWED_REDIRECTS.has(input) ? input : "/";
}

async function markEmailValidated(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from("nutrition_profiles")
      .update({ email_validated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("email_validated_at", null);
    if (error) {
      console.warn(`[auth.callback] markEmailValidated(${userId}) falhou:`, error.message);
    }
  } catch (e) {
    console.warn(`[auth.callback] markEmailValidated(${userId}) lançou:`, e);
  }
}

/**
 * Primeiro login = início do teste gratuito de 3 dias. A função do banco é
 * idempotente e decide a elegibilidade (só quem ainda não tem nenhuma linha
 * em subscriptions). O prazo é fixo no banco; o cliente não o escolhe.
 *
 * Esse é o evento de otimização da campanha de anúncios (StartTrial). Manda pelo
 * Pixel do navegador E pela Conversions API (servidor, com o mesmo eventId para
 * dedup) -- o magic link do e-mail costuma abrir num navegador diferente de onde
 * a pessoa clicou no anúncio, então só o Pixel sozinho perde atribuição fácil.
 *
 * O registro em landing_page_visits (event_type="trial_started") é gravado pelo
 * PRÓPRIO SERVIDOR em /api/public/auth/trial-started.ts, não aqui no client --
 * essa página de callback não tem utm_source/fbclid na URL (é gerada pelo Supabase
 * Auth), então o servidor busca a atribuição salva no momento do cadastro
 * (funciona mesmo em aparelho diferente) e usa a do localStorage como reforço
 * (mandada abaixo) só para o caso do magic link abrir no mesmo navegador.
 */
async function claimFreeTrial(accessToken: string | undefined): Promise<void> {
  try {
    const { data, error } = await supabase.rpc("claim_free_trial");
    if (error) {
      console.warn("[auth.callback] claim_free_trial falhou:", error.message);
      return;
    }
    if (data === "started") {
      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `trial_${crypto.randomUUID()}`
          : `trial_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      trackPixelEvent("StartTrial", { content_name: "free_trial_3_days" }, { eventID: eventId });

      if (!isPixelDisabled() && accessToken) {
        const { fbp, fbc } = getFbCookies();
        const fallbackAttribution = readStoredAttribution();
        fetch("/api/public/auth/trial-started", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify({ fbp, fbc, eventId, fallbackAttribution }),
        }).catch((e) => console.warn("[auth.callback] trial-started (CAPI) falhou:", e));
      }
    }
  } catch (e) {
    console.warn("[auth.callback] claim_free_trial lançou:", e);
  }
}

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      const redirect = safeRedirect(
        new URLSearchParams(window.location.search).get("redirect") ?? undefined,
      );

      if (data.session?.user) {
        await markEmailValidated(data.session.user.id);
        await claimFreeTrial(data.session.access_token);
        await navigate({ to: redirect as never, replace: true });
      } else {
        await navigate({ to: "/login", replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
    </main>
  );
}
