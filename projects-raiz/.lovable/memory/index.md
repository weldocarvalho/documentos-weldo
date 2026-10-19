# SkinMap IA — Project Memory

## Core
Documentação canônica vive em `/docs` — em conflito com memória/código, `/docs` vence (ADR 0007). Entry points: `docs/README.md` → `FEATURES.md` (F-NN) → `BUSINESS_RULES.md` (BR-NN). Mudança de feature/regra/decisão atualiza `/docs` na mesma PR.
Monetização (ADR 0010): free permanente (LP, signup, onboarding, 1ª rotina, /tips, FAQ) · trial 14d SEM cartão (/today, /routine, /progress) · 3 planos pagos cobrança única por ciclo: Mensal R$29,90/mês, Bimestral R$34,90/2m, Trimestral R$39,90/3m. Plano ANUAL REMOVIDO durante validação. Refine-routine é parte do plano pago mas não é "gancho premium" (ADR 0011, BR-30).
Workflow: pergunta conceitual = IA gratuita; UI/wiring/migration simples = Lovable; refactor >3 arquivos = IDE. Templates em docs/PROMPTS.md. ADR 0008.
Auth: Google OAuth (`lovable.auth.signInWithOAuth("google", ...)`) + email/senha. Auto-confirm ON, HIBP ON. Magic link e signInWithOtp REMOVIDOS (BR-07).
Signup público permitido. Conta nasce via signup, Google OAuth ou webhook Paddle (sem senha). `subscriptions` ativa define acesso pago, não método de criação (BR-31).
Mensagens de erro de auth SEMPRE opacas (BR-04). "Esqueci minha senha" é PLACEHOLDER até M3 (BR-08).
Stack: TanStack Start + Lovable Cloud + Paddle (sandbox+live por env). Locale pt-BR. Nunca editar `src/integrations/supabase/{client,types}.ts` nem `src/routeTree.gen.ts`.
Invariantes: paid ⇒ skin_profile (BR-13); onboarded_at SÓ após 1ª rotina (BR-12); RLS+GRANT obrigatórios em toda tabela public.* (BR-52); supabaseAdmin só via await import dentro do handler (BR-53).
Auth gate vive em `AuthenticatedLayout` via useAuthSession (BR-10) — NUNCA em beforeLoad.
AuthContext/useAuth/AuthProvider moram em `src/hooks/useAuth.tsx` — co-localizar com route.component duplica instância via code-splitter.
404: `NotFoundScreen` decide (logado → 404 com CTA; deslogado → /login?redirect=).
Disclaimer obrigatório (`<AppDisclaimer />`) no rodapé de TODA tela autenticada (BR-50). Nunca texto solto (BR-51).
Separação rígida de telas (BR-22): /today=SÓ DailyCheckIn · /routine=RoutineView SEM RoutineProgress · /progress=SkinScoreChart+médias+RoutineProgress (localStorage, ADR 0005).
Nav mobile (BR-61): 4 fixos (Início/Check-in/Rotina/Progresso) + botão "Mais" (perfil, dicas, selfie). Refine-routine NÃO entra na nav (BR-60), só dentro de /routine.
Chips/labels do perfil sempre via `translateValue()` em `src/lib/profileLabels.ts` (BR-21).
Selfies (F-26) atrás de FEATURES.selfieJournal — off em prod (BR-26, ADR 0009). VITE_FEATURE_SELFIE_JOURNAL controla.

## Memories
- [Auth flow](mem://features/auth) — Google OAuth + email/senha, /login com tabs, mensagens opacas, forgot-password placeholder
- [Onboarding](mem://features/onboarding) — Wizard /welcome de 9 passos + generateInitialRoutine (Lovable AI gemini-2.5-flash)
- [Screen conventions](mem://design/screen-conventions) — Disclaimer global, separação de seções por aba, tradução de chips do perfil
