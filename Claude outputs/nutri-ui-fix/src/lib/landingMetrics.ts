import { supabase } from "@/integrations/supabase/client";
import { isPixelDisabled } from "@/lib/pixel";

const VISITOR_ID_KEY = "zsc_visitor_id";
const SESSION_ID_KEY = "zsc_session_id";
const ATTRIBUTION_KEY = "zsc_attribution";
const ATTRIBUTION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

type StoredAttribution = {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  fbclid: string | null;
  capturedAt: number;
};

/**
 * Atribuição de primeiro clique (first-touch), guardada no navegador.
 *
 * O motivo de existir: o evento "trial_started" só é disparado em /auth/callback,
 * depois que a pessoa clica no magic link do e-mail -- e essa URL de callback não
 * carrega utm_source/fbclid nenhum (é gerada pelo Supabase Auth, não pela campanha).
 * Sem isso, TODO trial_started cai no banco com utm_source = NULL, mesmo quando a
 * sessão inteira começou num anúncio.
 *
 * Guardamos aqui os parâmetros da PRIMEIRA página com utm/fbclid que a pessoa abriu
 * (sales-lp ou login) para poder reaproveitar em eventos futuros na mesma aba/
 * navegador, como o trial_started. Só cobre o caso em que o magic link é aberto no
 * mesmo navegador que clicou no anúncio -- se abrir em outro aparelho, ver o reforço
 * server-side em /api/public/auth/trial-started.ts.
 */
export function readStoredAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAttribution;
    if (!parsed.capturedAt || Date.now() - parsed.capturedAt > ATTRIBUTION_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function captureAttributionIfPresent(params: URLSearchParams): void {
  if (typeof window === "undefined") return;
  const utm_source = params.get("utm_source");
  const fbclid = params.get("fbclid");
  // Sem sinal nenhum de campanha nessa URL -- nada novo para guardar.
  if (!utm_source && !fbclid) return;
  // First-touch: não sobrescreve uma atribuição já guardada e ainda válida.
  if (readStoredAttribution()) return;

  try {
    const attribution: StoredAttribution = {
      utm_source,
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      utm_content: params.get("utm_content"),
      utm_term: params.get("utm_term"),
      fbclid,
      capturedAt: Date.now(),
    };
    window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
  } catch {
    // localStorage indisponível (modo privado, etc.) -- segue sem atribuição guardada.
  }
}

function randomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getOrCreateId(storage: Storage, key: string) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const id = randomId();
    storage.setItem(key, id);
    return id;
  } catch {
    return randomId();
  }
}

function getVisitorId() {
  if (typeof window === "undefined") return null;
  return getOrCreateId(window.localStorage, VISITOR_ID_KEY);
}

function getSessionId() {
  if (typeof window === "undefined") return null;
  return getOrCreateId(window.sessionStorage, SESSION_ID_KEY);
}

function getDeviceType() {
  if (typeof window === "undefined") return null;
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

export type LandingEventType =
  | "page_view"
  | "cta_click"
  | "cta_click_header"
  | "cta_click_hero_primary"
  | "cta_click_hero_secondary"
  | "view_oferta"
  | "scroll_50"
  | "scroll_90"
  | "checkout_started"
  | "signup_completed"
  | "trial_started";

type TrackLandingVisitOptions = {
  eventType?: LandingEventType;
  userId?: string | null;
};

export async function trackLandingVisit(options: TrackLandingVisitOptions = {}) {
  if (typeof window === "undefined") return;
  // Navegadores de teste (?nopixel=1) não entram nas métricas de landing.
  if (isPixelDisabled()) return;

  const { eventType = "page_view", userId = null } = options;

  try {
    const url = new URL(window.location.href);
    const params = url.searchParams;

    // Guarda o primeiro clique com utm/fbclid que aparecer (sales-lp ou login) para
    // reaproveitar depois em páginas sem UTM na URL, como /auth/callback.
    captureAttributionIfPresent(params);

    const hasUtmOnUrl = Boolean(params.get("utm_source") || params.get("fbclid"));
    const fallback = hasUtmOnUrl ? null : readStoredAttribution();

    const { error } = await supabase.from("landing_page_visits").insert({
      path: url.pathname,
      full_url: url.toString(),
      referrer: document.referrer || null,
      utm_source: params.get("utm_source") ?? fallback?.utm_source ?? null,
      utm_medium: params.get("utm_medium") ?? fallback?.utm_medium ?? null,
      utm_campaign: params.get("utm_campaign") ?? fallback?.utm_campaign ?? null,
      utm_content: params.get("utm_content") ?? fallback?.utm_content ?? null,
      utm_term: params.get("utm_term") ?? fallback?.utm_term ?? null,
      fbclid: params.get("fbclid") ?? fallback?.fbclid ?? null,
      session_id: getSessionId(),
      visitor_id: getVisitorId(),
      user_id: userId,
      event_type: eventType,
      device_type: getDeviceType(),
      browser_locale: typeof navigator !== "undefined" ? navigator.language : null,
      screen_width: window.screen?.width ?? null,
      screen_height: window.screen?.height ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (error) {
      console.warn("[landingMetrics] failed to record event", eventType, error);
    }
  } catch (err) {
    console.warn("[landingMetrics] failed to record event", eventType, err);
  }
}
