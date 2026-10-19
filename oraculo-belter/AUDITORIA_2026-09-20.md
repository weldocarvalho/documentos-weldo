# Oráculo Belter Tecnologia — Auditoria do ecossistema (20/09/2026)

Escopo: leitura do código local (nutri-app, capila-app, zion-skincare, desviciar, goak, oficial-page) e leitura dos painéis Google Cloud, Stripe e Meta. **Nada foi alterado em nenhum painel.** Valores de segredos não foram copiados: onde há comparação, ela foi feita por hash.

Decisões já tomadas pelo Weldo: Stripe em conta única segregada por app; domínio `prismanutri.belter-oracle.com.br`; um pixel/dataset por app dentro do portfólio "Belter Oracle Tech Ads"; auditar primeiro e só mudar com aprovação.

---

## 1. Achados críticos (bloqueiam o lançamento e o isolamento entre apps)

### C1. Stripe: o Prisma Nutri venderia produtos de outros apps
- Conta única no Stripe: "Capila Tratamentos" (`acct_1U7gk6PNBP8I9OxO`). Existe ainda uma segunda conta, "AceleraFood".
- O catálogo tem só 3 produtos: "Zion Skincare - Plano Trimestral", "Zion Skincare - Plano Bimestral" e "Capila - Plano Mensal" (3 preços: R$29,90, R$24,90 e R$6,90). Não existe nenhum produto do Prisma Nutri.
- `.env.production.gcp` do nutri-app usa os price IDs: mensal `price_1UCkgM…` (= Capila, R$6,90 "preço único 2026"), bimestral `price_1U7hcJ…` e trimestral `price_1U7heH…` (= produtos da Zion). Nutri, Capila e Zion compartilham os mesmos IDs.
- O cupom `zion-ads-mensal-6m` também está nos três apps.
- Efeito: uma venda no Prisma Nutri apareceria como "Capila - Plano Mensal" ou "Zion Skincare", e a receita/MRR ficaria misturada.

### C2. Stripe: webhooks misturados
- Existe **um único** endpoint de webhook na conta: `zion-skincare-live` → `https://zionskincare.belter-oracle.com.br/api/public/payments/webhook-stripe?env=…` (3 eventos). Não existe endpoint do Capila nem do Prisma Nutri.
- Os três apps usam o mesmo `STRIPE_LIVE_WEBHOOK_SECRET` (hash idêntico), copiado do endpoint da Zion.
- O handler (`webhook-stripe.ts`) não filtra por app: lê `session.metadata.plan` e o price, cria/localiza usuário e envia e-mail de acesso. Como os produtos não têm metadata `app`, **qualquer checkout da conta chega ao endpoint da Zion e é tratado como compra da Zion**.
- Efeito provável: compradores do Capila (há 2 assinaturas ativas, MRR R$36,80) recebem conta e e-mail da Zion, e o Capila pode não estar liberando acesso. **Confirmar o que acontece hoje com esses 2 assinantes.**
- Chaves secreta e publicável live são as mesmas nos 3 apps (hash idêntico).

### C3. Meta: pixel único para tudo
- O portfólio "Belter Oracle Tech Ads" tem **1 pixel**: "Zion Skincare Pixel" (`1889083312055915`).
- Esse ID está fixo no `src/routes/__root.tsx` dos 3 apps (Nutri, Capila, Zion). Tudo que o Prisma Nutri disparar entra no pixel da Zion.
- A CAPI do Nutri e do Capila está sem `META_PIXEL_ID`/`META_CAPI_ACCESS_TOKEN` (o código registra "NÃO enviado"). Na Zion o pixel está preenchido, o token está vazio.
- **Nenhum domínio verificado** no portfólio (0 domínios). Sem isso, a otimização de eventos para iOS (AEM) fica limitada.
- Conta de anúncios `1024466199986934` sem nome (só o ID), 1 usuário, 1 Página ("Belter Oracle Tech Ads", 0 seguidores, sem Instagram).
- Campanhas (ambas desligadas hoje): "Zion Skincare | Vendas | v3 | BR" e "Capila - Assinatura R$6,90 - Vendas" (11 finalizações iniciadas, R$150,45 em 30 dias). Há **3 rascunhos pendentes** de publicação. Nomenclatura inconsistente.
- Outros portfólios: "Belter Oracle" (2 Páginas, 0 contas) e "Belter Oracle Tech" (vazio). Você definiu usar só "Belter Oracle Tech Ads".

### C3b. Atenção de política
O Prisma Nutri está na categoria saúde/bem-estar (regras mais rígidas: sem promessa de resultado, sem "antes e depois", sem atributos pessoais). Como a conta de anúncios é única, uma restrição afetaria Zion e Capila. Revisar criativos antes de publicar.

### C4. Domínio e DNS do Prisma Nutri não existem
- Mapeamentos de domínio do Cloud Run: só `belter-oracle.com.br`, `www`, `capila.` e `zionskincare.`. **Não há mapeamento para nutriapp nem para prismanutri.**
- Cloud DNS (zona `belter-oracle-zone`) não tem nenhum registro para nutriapp/prismanutri. O padrão do Capila é `CNAME → ghs.googlehosted.com`.
- O serviço `nutriapp-belter-oracle` (us-east1) está no ar e responde na URL `*.run.app`, ainda com a marca "NutriTrack".

### C5. E-mail (login por link mágico) sem domínio configurado
- Resend: registros SPF/DKIM/DMARC existem **só** para `zionskincare.belter-oracle.com.br`.
- Capila envia como `contact@zionskincare…` (marca trocada). Nutri usa `contato@nutriapp…`, sem nenhum registro. Como o acesso é por link/OTP por e-mail, sem isso o login do Prisma Nutri cai em spam ou falha.
- A chave do Resend é a mesma nos 3 apps.

### C6. Variáveis de produção do Nutri incompletas
Vazias em `.env.production.gcp`: `CRON_SECRET`, `VAPID_PRIVATE_KEY`, `VITE_VAPID_PUBLIC_KEY`, `UNSUBSCRIBE_SECRET`, `PROFILE_IMAGE_BUCKET`, e todo o Stripe sandbox. Sem `CRON_SECRET` o script de Scheduler aborta.

### C7. Cloud Scheduler
Só existem os 6 jobs `zion-*`. **Não há jobs do Capila nem do Nutri.** Lembretes, digest semanal e reengajamento do Capila provavelmente não estão rodando (confirmar).

---

## 2. Achados importantes

- **Google Cloud em conta de avaliação gratuita:** o banner mostra R$1.445,57 de crédito e 40 dias restantes (por volta de 30/10/2026). É preciso fazer upgrade para conta completa antes disso, senão os serviços param.
- Cloud Run (projeto `belter-oracle-aplications`): `belter-oracle-tech` (site), `zion-belter-oracle` (us-east1 **e uma cópia em southamerica-east1**), `capila-belter-oracle`, `nutriapp-belter-oracle`, job `desviciar-production-migrate`. A cópia da Zion em sa-east1 parece órfã. Confirmar tráfego antes de remover.
- Segredos ficam como variáveis de ambiente em texto no Cloud Run (via `--env-vars-file`). Migrar para Secret Manager.
- Todos os apps usam o mesmo projeto GCP, região us-east1 e Artifact Registry em southamerica-east1. Aceitável, mas sem contas de serviço por app nem labels.
- OpenRouter: chave única nos 3 apps (a produção da Zion usa outra). Custo de IA não é atribuível por app.
- Zion: `.env.production` com token Paddle live permanece no histórico do git (a própria documentação pede rotação). `.env.local` da Zion ainda tem `PAYMENTS_PROVIDER=paddle`.
- Nutri: resíduos do fork (`migrations_capila_archive`, textos "NutriTrack", domínio `nutriapp`).
- Supabase: cada app tem projeto próprio (nutri `qxukvv…`, capila `chcxtj…`, zion `gcgvnr…`). **Isolamento de dados OK.**
- Desviciar e Goak usam chaves Stripe diferentes do trio (provavelmente a conta "AceleraFood" ou outra). Goak roda na Vercel com Supabase próprio. Desviciar tem DNS (`desviciar.`, `api.desviciar.`) mas não apareceu serviço Cloud Run dele além do job de migração. **Não auditado a fundo.**

---

## 3. Matriz: compartilhar × segregar

| Recurso | Decisão | Situação hoje |
|---|---|---|
| Projeto GCP, Artifact Registry, Vertex AI, Cloud DNS | Compartilhar | OK |
| Faturamento GCP | Compartilhar | Conta de avaliação, precisa de upgrade |
| Conta Stripe | Compartilhar (uma conta) | OK |
| Produtos, preços, cupons Stripe | **Segregar por app** | Misturados |
| Webhook Stripe (endpoint + signing secret) | **Segregar por app** | 1 endpoint só, secret copiado |
| Chaves Stripe | **Segregar (chave restrita por app)** | Chave única |
| Supabase (banco, auth, storage) | **Segregar** | OK |
| Serviço Cloud Run, Scheduler, domínio | **Segregar** | Nutri sem domínio e sem jobs; Capila sem jobs |
| Resend (conta) | Compartilhar; **domínio e remetente por app** | Só Zion configurado |
| OpenRouter | Chave por app (custo por app) | Compartilhada |
| VAPID / CRON_SECRET / UNSUBSCRIBE_SECRET | **Segregar** | Nutri vazio |
| Meta: portfólio e conta de anúncios | Compartilhar (decisão do Weldo) | 1 conta, sem nome |
| Meta: pixel/dataset, token CAPI | **Segregar por app** | 1 pixel para 3 apps |
| Meta: domínio verificado, campanhas, públicos | **Segregar por app** | 0 domínios, nomes inconsistentes |

---

## 4. Padrão de nomenclatura proposto (Oráculo)

- Slug do app: `prisma-nutri`, `capila`, `zion`, `desviciar`, `goak`.
- Cloud Run: `<slug sem hífen>-belter-oracle` (ex.: `prismanutri-belter-oracle`). Labels: `app=<slug>`, `umbrella=belter-oracle`.
- Scheduler: `<slug sem hífen>-<tarefa>` (ex.: `prismanutri-weekly-digest`).
- Domínio: `<slug sem hífen>.belter-oracle.com.br`; e-mail: `contato@` e `send.` no mesmo subdomínio.
- Stripe: produto `Prisma Nutri - Plano Mensal`; metadata `app=prisma-nutri` em produto, preço, sessão de checkout e assinatura; cupons `pn-…`; endpoint `prisma-nutri-live`.
- Meta: dataset `Prisma Nutri Pixel`; campanha `[PN] Vendas | <oferta> | <público> | AAAA-MM`.
- Variáveis: `META_PIXEL_ID`/`VITE_META_PIXEL_ID` vindas do env (nunca fixas no código).
- Registro central: `oraculo-belter/registry/apps.yaml` com todos esses identificadores por app (sem segredos).

---

## 5. Plano priorizado (nada foi executado)

### Fase 0: confirmar antes de mexer
1. Ver no Capila (Supabase/Stripe) o que ocorreu com as 2 assinaturas ativas, dado o achado C2.
2. Confirmar se a cópia da Zion em sa-east1 tem tráfego.

### Fase 1: Prisma Nutri (recursos novos, sem tocar nos outros apps)
1. Stripe: criar produtos e preços "Prisma Nutri" com metadata `app`; criar endpoint `prisma-nutri-live` e obter seu signing secret; criar chave restrita; criar cupom próprio.
2. Meta: criar "Prisma Nutri Pixel" e token da CAPI; verificar o domínio `prismanutri.belter-oracle.com.br` no portfólio.
3. GCP: criar serviço `prismanutri-belter-oracle` (o atual `nutriapp-…` não tem tráfego), mapear `prismanutri.belter-oracle.com.br` e criar `CNAME → ghs.googlehosted.com` no Cloud DNS.
4. Resend: domínio `prismanutri.belter-oracle.com.br` (SPF, DKIM, MX de retorno, DMARC no Cloud DNS).
5. Gerar `CRON_SECRET`, VAPID e `UNSUBSCRIBE_SECRET`; criar os 6 jobs `prismanutri-*`.
6. Código: rebrand para Prisma Nutri, pixel via env, `deploy-gcp.sh` e `create-scheduler-jobs.sh` com os novos nomes, remover resíduos do fork.

### Fase 2: corrigir o que já está no ar (exige aprovação item a item)
1. Criar endpoint e price IDs próprios do Capila; ajustar o handler da Zion para ignorar eventos de outros apps (filtro por `metadata.app` ou allowlist de price IDs).
2. Criar pixel do Capila e migrar Capila e Zion para pixel por env; verificar domínios `capila.` e `zionskincare.`.
3. Criar jobs de Scheduler do Capila.
4. Resend próprio do Capila (hoje envia pela Zion).
5. Chave Stripe restrita por app e, depois, rotacionar a chave raiz.

### Fase 3: governança
1. Upgrade da conta de faturamento do GCP (antes de ~30/10).
2. Secret Manager e contas de serviço por app.
3. Nomear a conta de anúncios, definir Páginas/Instagram por app, padronizar campanhas e limpar os 3 rascunhos.
4. Criar `oraculo-belter/registry/apps.yaml` e checklist de "novo app" (fork seguro).
5. Auditar Desviciar, Goak e a conta Stripe "AceleraFood".

---

## 6. Registro de execução — Fase 1 (Prisma Nutri), atualizado em 20/09/2026

Decisões do Weldo: conta Stripe única segregada por app; domínio `prismanutri.belter-oracle.com.br`; um pixel por app; remetente de e-mail único `contato@belter-oracle.com.br` em todos os apps (limite do Resend); no Scheduler ficam só os jobs do Prisma Nutri; preço de R$ 6,90 no Pix (1º mês, pagamento único) e R$ 12,90/mês recorrente no cartão.

| Item | Situação |
|---|---|
| Rebrand e código do Nutri (`appId.ts`, `brand.ts`, manifest, Dockerfile com ARGs `VITE_*`) | Feito |
| Webhook do Nutri ignora eventos de outros apps (`metadata.app === "prisma-nutri"`) | Feito |
| Preço Pix separado (`STRIPE_PRICE_LIVE_PIX_INTRO`) e cartão (`STRIPE_PRICE_LIVE_MONTHLY`) | Feito |
| Stripe: endpoint `prisma-nutri-live` (7 eventos) | Feito, ativo |
| Meta: dataset/Pixel "Prisma Nutri Pixel" (`1723427992076279`) no portfólio Belter Oracle Tech Ads | Feito |
| Meta: token da Conversions API | **Pendente** (exige verificação da conta de desenvolvedor; adiado a pedido do Weldo) |
| Meta: verificação de domínio `belter-oracle.com.br` (TXT adicionado ao registro raiz, portfólio Belter Oracle Tech Ads, id 1771623723972333) | Aguardando propagação; clicar em "Verificar domínio" depois |
| Resend: domínio `belter-oracle.com.br` (DKIM, `rsend`, `send`, `_dmarc`) | **Verified** |
| `EMAIL_FROM` do Prisma Nutri | `Prisma Nutri <contato@belter-oracle.com.br>` |
| `EMAIL_FROM` do Capila | Trocado para `Capila <contato@belter-oracle.com.br>` (nova revisão do Cloud Run) |
| `EMAIL_FROM` do Zion | **Não alterado** (adiado a pedido do Weldo). Correção: a cópia do Zion que abri e que não tem variáveis é a de `southamerica-east1`, provável órfã. A de produção (`us-east1`, mapeada ao domínio zionskincare) provavelmente tem as variáveis e permite trocar o `EMAIL_FROM`; ainda não verificado |
| Deploy do Cloud Run `prismanutri-belter-oracle` (us-east1), revisão `00001-k84` | Feito, 100% do tráfego |
| Mapeamento de domínio `prismanutri.belter-oracle.com.br` (CNAME já existente para `ghs.googlehosted.com.`) | Criado; certificado SSL em emissão |
| Scheduler: 6 jobs `zion-*` pausados | Feito |
| Scheduler: 6 jobs `prismanutri-*` (`scripts/create-scheduler-jobs.sh`) | Weldo vai rodar no Mac |
| Serviço antigo `nutriapp-belter-oracle` | Removido (aprovado); gatilho do Cloud Build que o alimentava foi desativado |

### Pendências
1. Verificação de domínio na Meta e token CAPI.
2. Teste ponta a ponta depois que o domínio ativar (e-mail de login, assinatura do webhook, checkout, Pixel) e conferir a oferta de R$ 12,90 no cartão na página de vendas.
3. Fase 2 e Fase 3 continuam pendentes e exigem aprovação item a item. Atenção: o Capila ainda não tem endpoint Stripe nem preços próprios (achados C1/C2).

## 7. Registro de execução — Fase 2 (isolamento Zion/Capila), 20/09/2026

| Item | Situação |
|---|---|
| Cópia órfã do Zion em `southamerica-east1` | Removida (aprovado). Produção (`us-east1`) intacta |
| Meta: "Capila Pixel" (`1592751772061635`) criado no portfólio Belter Oracle Tech Ads, conta de anúncios ligada | Feito |
| Meta: Pixel do Zion | Mantido o "Zion Skincare Pixel" (`1889083312055915`, ~14,8 mil eventos): já é exclusivo do Zion e trocar zeraria o aprendizado das campanhas |
| Capila usava o Pixel do Zion (ID fixo em `__root.tsx`) | Corrigido no código: Zion e Capila leem `VITE_META_PIXEL_ID` (Dockerfile com ARG). `capila-app/.env.production.gcp` recebeu `META_PIXEL_ID`/`VITE_META_PIXEL_ID` do Capila Pixel |
| Webhook do Zion e do Capila processava compras de outros apps | Corrigido no código: `src/lib/appId.ts` + guarda `isOwnPurchase` (metadata.app; legado por lista de price IDs próprios) antes de criar usuário/e-mail. Checkout agora grava `metadata.app` |
| Stripe: endpoint `capila-live` (`we_1UHrnnPNBP8I9OxODf7qmYa7`, 3 eventos, `https://capila.belter-oracle.com.br/api/public/payments/webhook-stripe?env=live`) | Criado, com segredo de assinatura próprio já gravado em `capila-app/.env.production.gcp` |
| Capila: preços bimestral/trimestral eram do Zion | Removidos do env do Capila (o Capila só vende o mensal) |
| `EMAIL_FROM` no env do Capila | Alinhado a `contato@belter-oracle.com.br` |
| Assinaturas ativas do Capila | 2, ambas do próprio Weldo (testes: R$ 6,90 e R$ 29,90). Nenhum cliente real afetado |

Pendências desta fase (exigem deploy no Mac, nesta ordem): 1) Capila (código + env), 2) Zion (código). Depois disso, enviar novamente os eventos das 2 assinaturas de teste do Capila ao endpoint `capila-live` e conferir/limpar contas do Capila criadas indevidamente no Supabase do Zion (nenhum dado foi apagado). Chaves do Stripe: separar em chaves restritas por app fica como tarefa manual do Weldo (alteração de segurança). Cupom `zion-ads-mensal-6m` ainda referenciado no env do Capila.

---

## 8. Fase 3 — Estratégia "3 dias grátis" no Prisma Nutri (21/09/2026)

**Decisão do Weldo:** cadastro e acesso gratuitos por 3 dias, sem cartão; o prazo começa no
PRIMEIRO login; depois, paywall existente; plano de R$ 12,90/mês só dentro da plataforma (nada de
preço em anúncios, páginas públicas ou e-mails). Promoção Pix R$ 6,90 removida (Pix não habilitado
na Stripe — convite/≥60 dias de histórico). Indicação continua com 7 dias. Antiabuso: limite de
cadastros por IP + bloqueio de e-mails descartáveis (sem captcha; revisão manual do Weldo).

**Implementado (nutri-app, NADA commitado/deployado ainda):**

| Área | Arquivo | O que mudou |
|---|---|---|
| Banco | `supabase/migrations/20260921120000_free_trial_and_signup_guard.sql` | `claim_free_trial()` (3 dias fixos, idempotente, só authenticated), tabela `signup_attempts` (RLS: só service_role), colunas `trial_reminder_sent_at`/`trial_ended_email_sent_at` |
| Cadastro | `api/public/auth/check-login.ts` | Entrada única login+cadastro; guarda de cadastro; cria usuário + perfil; CAPI `CompleteRegistration` (eventId compartilhado com o browser) |
| Antiabuso | `lib/disposableEmail.ts`, `lib/signupGuard.server.ts` | ~139 domínios descartáveis (+env `EXTRA_DISPOSABLE_EMAIL_DOMAINS`); limite por IP (hash) `SIGNUP_MAX_PER_IP_HOUR`=5 / `SIGNUP_MAX_PER_IP_DAY`=15 |
| Indicação | `api/public/auth/redeem-referral.ts` | Mesma guarda para contas novas |
| 1º login | `routes/auth.callback.tsx` | Chama `claim_free_trial` após validar e-mail; evento `StartTrial` |
| Paywall | `InactivePlanPaywall.tsx`, `_authenticated.assinar.tsx` | Paywall → `/assinar` (cartão R$ 12,90/mês) |
| Pagamento | `lib/paymentMethods.ts`, `StripePricingPlans.tsx` | Padrão só cartão; Pix desligado |
| Páginas públicas | `sales-lp.tsx`, `Hero.tsx`, `SiteHeader.tsx`, `FreeTrialSignup.tsx` | Sem preço; CTA "Começar grátis por 3 dias" |
| Login/legal | `login.tsx`, `EmailForm.tsx`, `termos.tsx`, `privacidade.tsx` | Copy de trial; termos e privacidade (hash de IP) atualizados |
| E-mails | `email.server.ts`, `api/cron/trial-emails.ts`, `scripts/create-scheduler-jobs.sh` | Lembrete (≤24h do fim) e fim do teste, idempotentes; novo job `prismanutri-trial-emails` (11h) |
| Pixel | `pixel.ts`, `landingMetrics.ts`, `__root.tsx` | `?nopixel=1` respeitado também nos eventos novos |

**Verificações locais:** `tsc --noEmit` limpo; `vitest` 104 testes ok (inclui novo teste de e-mails
descartáveis); `vite build` ok em cópia limpa (Linux); rotas `/sales-lp`, `/login`, `/termos`,
`/assinar` respondem 200 em servidor local. E2E real (cadastro, e-mail, 3 dias, paywall, compra com
cupom, webhook, crons) pendente do deploy.

**Pendências dessa fase:** aplicar migration no Supabase do Nutri; deploy; criar job do Scheduler;
textos remanescentes em `email.server.ts` ("Como foi sua semana de pele", nota "via Paddle");
`ACCESS_RULES.md` (tabela de acesso) precisa refletir a linha "sem conta → cadastro gratuito".

### 8.1 Achados do E2E (21/09/2026) — permissões do banco

- **Causa raiz:** o projeto Supabase do Nutri não concede GRANT nenhum nas tabelas do schema `public`
  (relacl NULL nas 23 tabelas) → `permission denied for table …` para service_role/authenticated/anon.
  Cadastro criou o usuário em `auth.users`, mas falhou ao gravar `nutrition_profiles` e `signup_attempts`
  (erros só logados; o limite por IP falha "aberto" nesse estado).
- **Correção (migration, a aplicar):** `20260921130000_grant_table_privileges.sql` — service_role ALL;
  authenticated CRUD (RLS decide as linhas); anon só INSERT em `landing_page_visits`; `signup_attempts`
  fechada a usuários; default privileges para tabelas futuras.
- **Varredura complementar (somente leitura):** RLS ligado em 100% das tabelas; a única policy permissiva
  (`true`) para anon/authenticated é "Anyone can record a page visit"; funções: `owns_profile` (usada em
  policies) executável por todos, as 5 funções de gating/admin só service_role, `claim_free_trial` só
  authenticated — todas conforme o desenho; sem ACL por coluna, sem views, sem sequences;
  **storage: nenhum bucket e nenhuma policy** (código de selfies espera bucket; `PROFILE_IMAGE_BUCKET` vazio;
  feature `VITE_FEATURE_SELFIE_JOURNAL` desligada por padrão) → migration `20260921131000_selfies_storage_bucket.sql`
  (bucket privado `prisma-nutri-selfies`, pasta por usuário) e envs preenchidos.
- **IAM do Cloud Run:** conta de serviço = default compute; tem Usuário da Plataforma de Agentes (Vertex),
  Logs Writer, Cloud Run Admin (excessivo — vai ao pacote de segurança).
- **Código:** `check-login` agora cria o perfil de contas existentes que não tenham (autocura).
- **Pendente de validação em runtime:** geração de plano por IA (Vertex) e escrita no diário — testar no E2E.
