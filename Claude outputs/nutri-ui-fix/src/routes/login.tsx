import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck, MailWarning, Gift } from "lucide-react";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import { trackPixelEvent, isPixelDisabled } from "@/lib/pixel";
import { getFbCookies } from "@/lib/metaCookies";
import { trackLandingVisit } from "@/lib/landingMetrics";

import { LoginHeader } from "@/components/login/LoginHeader";
import { EmailForm } from "@/components/login/EmailForm";
import { LoginFooter } from "@/components/login/LoginFooter";

const ALLOWED_REDIRECTS = new Set([
  "/",
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
  if (!input) return "/";
  let path = input;
  try {
    const u = new URL(input, window.location.origin);
    if (u.origin !== window.location.origin) return "/";
    path = u.pathname;
  } catch {
    if (!input.startsWith("/")) return "/";
    const parts = input.split("?");
    path = parts[0];
  }
  if (path === "/login") return "/";
  return ALLOWED_REDIRECTS.has(path) ? path : "/";
}

const searchSchema = z.object({
  redirect: fallback(z.string().optional(), undefined),
  code: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/login")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: `Entrar — ${BRAND_NAME}` },
      {
        name: "description",
        content: `Entre ou crie sua conta ${BRAND_NAME} só com o e-mail. Acesso grátis por 3 dias.`,
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

type LoginStep = "enter_email" | "check_email";

function LoginPage() {
  const { redirect, code: codeParam } = Route.useSearch();
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>("enter_email");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const [showRedeem, setShowRedeem] = useState(!!codeParam);
  const [redeemEmail, setRedeemEmail] = useState("");
  const [redeemCode, setRedeemCode] = useState(codeParam ?? "");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Ponto de entrada dos anúncios pagos (destino atual da campanha "Prisma - 3 dias
  // grátis"). Registra aqui, e não só na /sales-lp, porque é a única página que vê o
  // clique original -- o magic link do e-mail pode abrir em outro navegador depois.
  useEffect(() => {
    void trackLandingVisit({ eventType: "page_view" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        navigate({ to: safeRedirect(redirect) as never, replace: true });
      } else {
        setCheckingSession(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        navigate({ to: safeRedirect(redirect) as never, replace: true });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate, redirect]);

  async function handleRequestCode(targetEmail: string) {
    setError(null);
    setSubmitting(true);
    const formattedEmail = targetEmail.toLowerCase().trim();
    setEmail(formattedEmail);

    try {
      const { fbp, fbc } = getFbCookies();
      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `signup_${crypto.randomUUID()}`
          : `signup_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const params = new URL(window.location.href).searchParams;
      const response = await fetch("/api/public/auth/check-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formattedEmail,
          fbp,
          fbc,
          eventId,
          noTrack: isPixelDisabled(),
          utm_source: params.get("utm_source"),
          utm_medium: params.get("utm_medium"),
          utm_campaign: params.get("utm_campaign"),
          utm_content: params.get("utm_content"),
          utm_term: params.get("utm_term"),
          fbclid: params.get("fbclid"),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        // Bloqueios do cadastro (e-mail descartável, limite por IP): mensagem amigável do servidor.
        setError(data.error ?? "Falha na comunicação com o servidor.");
        return;
      }

      if (data.status === "SIGNUP_CREATED") {
        // Mesmo eventId da Conversions API (servidor) para a Meta deduplicar.
        trackPixelEvent(
          "CompleteRegistration",
          { content_name: "free_trial_signup", status: true },
          { eventID: data.eventId ?? eventId },
        );
        void trackLandingVisit({ eventType: "signup_completed", userId: data.userId ?? null });
      }

      if (data.status === "SIGNUP_CREATED" || data.status === "ALLOWED") {
        setStep("check_email");
        setSubmitting(false);
        return;
      }

      setError("Ocorreu um erro ao enviar o link. Tente novamente em instantes.");
    } catch (err) {
      console.error("[Login Connection Error]:", err);
      setError("Erro de conexão com o servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRedeem() {
    setError(null);
    setRedeemError(null);

    const targetEmail = (redeemEmail || email || "").toLowerCase().trim();
    if (!targetEmail) {
      setRedeemError("Informe seu e-mail para resgatar o código.");
      return;
    }
    if (!redeemCode.trim()) {
      setRedeemError("Informe o código de indicação.");
      return;
    }

    setRedeeming(true);
    try {
      const response = await fetch("/api/public/auth/redeem-referral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail, code: redeemCode }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setRedeemError(data.error || "Não foi possível resgatar o código.");
        return;
      }

      setEmail(targetEmail);
      setStep("check_email");
    } catch (err) {
      console.error("[Login Redeem Error]:", err);
      setRedeemError("Erro de conexão. Tente novamente.");
    } finally {
      setRedeeming(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-fio-paper">
        <Loader2 className="h-5 w-5 animate-spin text-fio-rose-ink" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-fio-paper text-fio-ink">
      <LoginHeader />

      <section className="container-prose flex flex-col items-center py-10 sm:py-14">
        <div className="w-full max-w-md">
          <header>
            <p className="font-fio-body text-[10px] uppercase tracking-[0.2em] text-fio-ink-faint">
              {BRAND_NAME}
            </p>
            <h1 className="mt-1 font-fio-display text-4xl italic text-fio-ink">
              {step === "enter_email" ? "Entre ou comece grátis." : "Confira seu e-mail."}
            </h1>
            <p className="mt-2 font-fio-body text-[13px] font-light text-fio-ink-soft">
              {step === "enter_email"
                ? "Sem senha e sem cartão — 3 dias grátis para quem está chegando."
                : "Verifique sua caixa de entrada."}
            </p>
          </header>

          {error && (
            <div
              role="alert"
              className="mt-4 border-l-2 border-fio-rose py-1.5 pl-3 font-fio-body text-[12.5px] text-fio-rose-ink"
            >
              {error}
            </div>
          )}

          {step === "enter_email" ? (
            <>
              <EmailForm
                onSubmit={handleRequestCode}
                submitting={submitting}
                value={email}
                onValueChange={setEmail}
              />

              <div className="mt-6 border-t border-fio-line-soft pt-5">
                <button
                  type="button"
                  onClick={() => setShowRedeem((v) => !v)}
                  className="inline-flex items-center gap-1.5 font-fio-body text-[12px] font-medium text-fio-rose-ink hover:underline"
                >
                  <Gift className="h-3.5 w-3.5" aria-hidden />
                  {showRedeem ? "Fechar" : "Um código de indicação? Ganhe 7 dias grátis"}
                </button>

                {showRedeem && (
                  <div className="mt-3 space-y-3">
                    <p className="font-fio-body text-[11.5px] font-light leading-relaxed text-fio-ink-faint">
                      Recebeu um código de uma amiga? Resgate aqui e ganhe 7 dias de acesso — você e
                      quem indicou saem ganhando.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                      <div className="flex-1">
                        <label className="block font-fio-body text-[9px] uppercase tracking-[0.14em] text-fio-ink-faint">
                          Seu e-mail
                        </label>
                        <input
                          type="email"
                          value={redeemEmail || email}
                          onChange={(e) => setRedeemEmail(e.target.value)}
                          className="mt-1 w-full border-0 border-b border-fio-line bg-transparent pb-1.5 font-fio-body text-[13px] text-fio-ink outline-none focus:border-fio-rose"
                        />
                      </div>
                      <div className="sm:w-32">
                        <label className="block font-fio-body text-[9px] uppercase tracking-[0.14em] text-fio-ink-faint">
                          Código
                        </label>
                        <input
                          value={redeemCode}
                          onChange={(e) => setRedeemCode(e.target.value)}
                          className="mt-1 w-full border-0 border-b border-fio-line bg-transparent pb-1.5 font-fio-body text-[13px] text-fio-ink outline-none focus:border-fio-rose"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleRedeem}
                        disabled={redeeming}
                        className="rounded-sm bg-fio-ink px-4 py-2 font-fio-body text-[12px] font-medium text-fio-paper-2 transition-opacity hover:opacity-90 disabled:opacity-60"
                      >
                        {redeeming ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        ) : (
                          "Resgatar"
                        )}
                      </button>
                    </div>
                    {redeemError && (
                      <div
                        role="alert"
                        className="border-l-2 border-fio-rose py-1.5 pl-3 font-fio-body text-[12px] text-fio-rose-ink"
                      >
                        {redeemError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-6 space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-fio-rose text-fio-rose-ink">
                <MailCheck className="h-6 w-6" aria-hidden />
              </div>
              <p className="font-fio-body text-[13px] font-light leading-relaxed text-fio-ink-soft">
                Enviamos um link de acesso para{" "}
                <span className="font-medium text-fio-ink">{email}</span>. Clique no link para
                entrar — ele é de uso único.
              </p>
              <div
                role="alert"
                className="flex items-center justify-center gap-2 border-t border-fio-line-soft pt-4 font-fio-body text-[11.5px] text-fio-ink-faint"
              >
                <MailWarning className="h-3.5 w-3.5 flex-none" aria-hidden />
                <span>
                  Não recebeu? Verifique sua caixa de{" "}
                  <strong className="text-fio-ink-soft">spam</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep("enter_email");
                  setError(null);
                }}
                className="font-fio-body text-[11px] text-fio-ink-faint hover:text-fio-ink hover:underline"
              >
                Utilizar outro e-mail
              </button>
            </div>
          )}

          <LoginFooter />
        </div>
      </section>
    </main>
  );
}
