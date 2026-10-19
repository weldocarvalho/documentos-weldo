# Correção: atribuição de UTM perdida em `trial_started`

Esse pacote contém os 6 arquivos alterados no seu app (caminhos relativos à raiz
do repo `nutri-ui`). Não tenho acesso ao seu repositório Git real nem ao seu
pipeline de deploy a partir daqui — apliquei e testei tudo num checkout local
isolado (typecheck + `npm run build` + suíte de testes, todos passando), então
o próximo passo é você copiar esses arquivos por cima dos originais no seu
repo, revisar o diff e fazer o deploy normalmente.

## O que NÃO precisou de correção

O Pixel da Meta (`window.fbq`) na verdade **está funcionando corretamente** em
`/sales-lp` e `/login`. O que eu tinha visto como "Pixel não dispara" na
auditoria anterior era um falso positivo: o navegador que eu estava usando
para testar tinha a flag `nopixel=1` gravada no `localStorage` de uma sessão
de teste anterior (essa é uma funcionalidade que já existe no seu código,
em `src/lib/pixel.ts` / `src/routes/__root.tsx`, para testes não sujarem as
métricas da Meta). Limpei a flag, recarreguei, e o Pixel carrega e dispara
normalmente nas duas páginas. Não mudei nada nesse código.

## O que foi corrigido: atribuição (utm_source/fbclid) em `trial_started`

**Causa raiz:** o evento `trial_started` só é gravado em `/auth/callback`,
depois que a pessoa clica no magic link do e-mail. Essa URL é gerada pelo
Supabase Auth e nunca carrega `utm_source`/`fbclid` — só a página original do
anúncio (`/sales-lp` ou `/login`) tinha isso. Por isso 100% dos `trial_started`
caíam no banco com atribuição nula.

**Correção em duas camadas** (a segunda cobre o caso em que o magic link é
aberto num aparelho diferente do que clicou no anúncio, que é o motivo de eu
não ter resolvido isso só com `localStorage`):

1. `src/lib/landingMetrics.ts` — ao visitar `/sales-lp` ou `/login` com
   `utm_source`/`fbclid` na URL, guarda essa atribuição (primeiro clique) no
   `localStorage` por até 30 dias. Qualquer chamada futura de `trackLandingVisit`
   sem UTM na URL atual cai de volta nesse valor guardado. Cobre o caso em que
   o magic link abre no mesmo navegador.

2. `src/routes/api/public/auth/check-login.ts` + `FreeTrialSignup.tsx` +
   `login.tsx` — no momento do cadastro (quando a pessoa ainda está na página
   real do anúncio), o client manda os parâmetros UTM/fbclid para o servidor,
   que grava um snapshot de atribuição no banco associado ao `user_id` recém-
   criado (bypass de RLS via service role, então funciona mesmo a página não
   tendo permissão de leitura nessa tabela). `check-login.ts` também passou a
   devolver o `userId` na resposta.

3. `src/routes/api/public/auth/trial-started.ts` + `auth.callback.tsx` —
   quando o trial começa, o **servidor** (não mais o client) grava a linha de
   `trial_started` em `landing_page_visits`, resolvendo a atribuição nesta
   ordem: (a) o snapshot gravado no passo 2 pelo `user_id` — funciona mesmo em
   aparelho diferente; (b) se não achar, usa a atribuição do `localStorage` que
   o client manda junto (passo 1) — só ajuda no caso mesmo-aparelho; (c) se não
   achar nenhuma, grava `NULL` mesmo, porque não há de onde tirar o dado (ex.:
   tráfego orgânico, sem nenhum utm). Removi a gravação antiga do client (que
   sempre saía com utm nulo) para não duplicar linha.

Rodei `npx tsc --noEmit`, `npm run build` e `npx vitest run` (115 testes) no
checkout local depois de todas as mudanças — tudo passou limpo.

## Resíduo conhecido (não dá pra resolver 100% no client)

Contas criadas **antes** desse deploy não têm o snapshot de atribuição do
passo 2 — para elas, se o magic link abrir num aparelho diferente de quem
clicou no anúncio, o `trial_started` ainda vai gravar `utm_source = NULL`.
Isso é uma limitação inerente ao fluxo de magic link por e-mail, não um bug;
a partir do deploy, toda conta nova passa a ter o snapshot.
