import { useState, type FormEvent } from "react";
import { Check, Loader2, MailCheck } from "lucide-react";
import { trackPixelEvent, isPixelDisabled } from "@/lib/pixel";
import { trackLandingVisit } from "@/lib/landingMetrics";
import { getFbCookies } from "@/lib/metaCookies";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "sent";

/**
 * Seção "oferta" das páginas públicas: cadastro gratuito de 3 dias, só com e-mail.
 * NÃO mostra preço (o plano pago só aparece dentro do app). Mantém id="oferta"
 * porque os botões do topo e do hero apontam para essa âncora.
 */
export function FreeTrialSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Digite um e-mail válido.");
      return;
    }
    setError(null);
    setStatus("submitting");

    try {
      const { fbp, fbc } = getFbCookies();
      const eventId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? `signup_${crypto.randomUUID()}`
          : `signup_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const params = new URL(window.location.href).searchParams;
      const res = await fetch("/api/public/auth/check-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
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
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        eventId?: string;
        userId?: string;
        error?: string;
      };

      if (!res.ok) {
        setError(data.error ?? "Não foi possível criar sua conta agora. Tente novamente.");
        setStatus("idle");
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

      setSentTo(trimmed);
      setStatus("sent");
    } catch {
      setError("Erro de conexão. Tente novamente.");
      setStatus("idle");
    }
  }

  return (
    <section id="oferta" className="section-y" aria-labelledby="teste-gratis-titulo">
      <div className="container-prose">
        <div className="relative overflow-hidden rounded-3xl border border-fio-line bg-white p-6 shadow-[var(--shadow-bento)] sm:p-10">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(600px 300px at 100% 0%, color-mix(in oklab, var(--fio-rose) 14%, transparent), transparent 60%)",
            }}
          />

          <header className="space-y-2 text-center">
            <h2
              id="teste-gratis-titulo"
              className="font-fio-display text-3xl italic text-fio-ink sm:text-4xl"
            >
              Acesso grátis por 3 dias
            </h2>
            <p className="font-fio-body text-sm text-fio-ink-soft">
              Crie sua conta só com o e-mail e use a plataforma completa. Sem cartão de crédito.
            </p>
          </header>

          {status === "sent" ? (
            <div className="mx-auto mt-8 max-w-sm space-y-3 text-center" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-fio-rose text-fio-rose-ink">
                <MailCheck className="h-6 w-6" aria-hidden />
              </div>
              <p className="font-fio-body text-sm text-fio-ink">
                Enviamos o link de acesso para <strong>{sentTo}</strong>. Clique nele para entrar —
                seus 3 dias grátis começam no primeiro acesso.
              </p>
              <p className="font-fio-body text-xs text-fio-ink-faint">
                Não chegou? Confira a caixa de spam.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="mx-auto mt-8 max-w-sm">
              <label htmlFor="trial-email" className="sr-only">
                Seu e-mail
              </label>
              <input
                id="trial-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                disabled={status === "submitting"}
                placeholder="voce@email.com"
                className="w-full rounded-xl border border-fio-line bg-white px-4 py-3 font-fio-body text-base text-fio-ink outline-none placeholder:text-fio-ink-faint focus:border-fio-rose disabled:opacity-60"
              />
              {error && (
                <p role="alert" className="mt-2 font-fio-body text-xs text-fio-rose-ink">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-fio-rose px-4 py-3 font-fio-body text-sm font-medium text-white transition-colors hover:bg-fio-rose-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
                {status === "submitting" ? "Criando sua conta..." : "Começar grátis por 3 dias"}
              </button>
              <ul className="mt-5 space-y-2 font-fio-body text-sm text-fio-ink">
                {[
                  "Plano alimentar personalizado com IA",
                  "Metas de calorias, macros e água por dia",
                  "Sem cartão de crédito para começar",
                ].map((b) => (
                  <li key={b} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-fio-rose-ink" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </form>
          )}

          <p className="mt-6 text-center font-fio-body text-xs text-fio-ink-faint">
            Ao continuar, você concorda com os{" "}
            <a href="/termos" className="underline">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="/privacidade" className="underline">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
