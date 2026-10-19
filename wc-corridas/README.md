# WC Corridas (Belter Tecnologia)

Plataforma de corridas para São Sebastião (DF). Lançamento previsto: novembro de 2026.

## Estrutura

- `landing/`: landing de pré-cadastro de motoristas (index.html, privacidade.html, nginx.conf, Dockerfile)
- `infra/supabase/`: migrations SQL e Edge Function `landing-lead`
- `scripts/deploy-gcp.sh`: build, push e deploy no Cloud Run
- `meta-ads/`: criativos A1 a D1 (4x5 e 9x16) e ícone de perfil
- `branding/`, `financeiro/`: identidade e unit economics

## Ambiente em produção

| Item | Valor |
| --- | --- |
| URL do anúncio | https://wc-corridas.belter-oracle.com.br |
| Política de privacidade | https://wc-corridas.belter-oracle.com.br/privacidade |
| Cloud Run | `wccorridas-belter-oracle` (projeto `belter-oracle-aplications`, região `us-east1`) |
| Imagem | `us-east1-docker.pkg.dev/belter-oracle-aplications/cloud-run-source-deploy/wc-corridas:amd64` |
| DNS | CNAME `wc-corridas` para `ghs.googlehosted.com.` na zona `belter-oracle-zone` |
| Supabase | projeto `belter-smoke-tests` (ref `mprqmsvzbavpkhuzttot`, sa-east-1), compartilhado entre apps |
| Portfólio Meta | Belter Oracle Tech Ads (1771623723972333), conta de anúncios 1024466199986934 |
| Pixel / dataset | WC Corridas Pixel, ID 1576806120384003 |
| Domínio verificado no Meta | belter-oracle.com.br (TXT no Cloud DNS) |

## Como as métricas funcionam

O projeto Supabase é agnóstico. Cada app é identificado por `app_slug` (aqui, `wc-corridas`) e cadastrado em `landing_apps`, que guarda o Pixel e as origens permitidas.

- `landing_page_visits`: eventos da página (`page_view`, `scroll_50`, `scroll_90`, `form_view`, `form_start`, `simulator_use`, `faq_open`, `cta_click`, `lead_submitted`, `lead_error`). A coluna `ad_source` vem de `utm_content`, ou `organico` quando vazia. O navegador insere com a chave publicável; o RLS só aceita apps ativos.
- `landing_leads`: cadastros dos motoristas. Só a Edge Function grava, com `service_role`. Deduplicado por `(app_slug, phone)`. Guarda UTMs, `fbp`, `fbc`, `event_id`, status do envio para a API de Conversões e status comercial.
- `landing_funnel_by_ad` e `landing_daily_summary`: views de funil por campanha e anúncio, e resumo diário. Acesso restrito ao `service_role` (SQL Editor do Supabase).

Para adicionar outro app ao mesmo projeto: inserir uma linha em `landing_apps`, usar outro `app_slug` na landing e, se houver API de Conversões, criar o segredo `CAPI_TOKEN_<NOME>` e apontá-lo em `capi_secret_name`.

## Consultas úteis (SQL Editor do Supabase)

```sql
select * from public.landing_funnel_by_ad where app_slug = 'wc-corridas' order by leads desc;
select * from public.landing_daily_summary where app_slug = 'wc-corridas' order by day desc;
select created_at, full_name, phone, form_data->>'car_year' as ano_carro, ad_source, capi_status
from public.landing_leads where app_slug = 'wc-corridas' order by created_at desc;
```

## Rastreamento no Meta

Pixel no navegador: `PageView`, `Lead` (só após o cadastro ser gravado) e o evento customizado `CliqueCadastro`. A API de Conversões envia o mesmo `Lead` pelo servidor, com telefone e nome em hash SHA-256, `fbp`, `fbc`, IP e user agent. O `event_id` é o mesmo do navegador, e a Meta deduplica.

Parâmetros de URL para configurar no anúncio (campo "Parâmetros de URL"):

```
utm_source=meta&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&utm_term={{adset.name}}
```

Use como nome de cada anúncio exatamente o código do criativo (`A1`, `B1`, `C1`, `D1`), porque o `utm_content` vira o `ad_source` nos relatórios.

## Segredos da Edge Function

Configurados em Supabase, Edge Functions, Secrets:

- `CAPI_TOKEN_WC_CORRIDAS`: token de acesso da API de Conversões do dataset 1576806120384003 (gerado no Gerenciador de Eventos).
- `META_TEST_EVENT_CODE` (opcional, só para testar): código da aba "Eventos de teste". Remover depois dos testes.
- `IP_HASH_SALT` (opcional): sal para o hash de IP usado no limite de envios.

## Deploy

`./scripts/deploy-gcp.sh` (precisa de Docker e gcloud logados). Alterações no banco são migrations em `infra/supabase/migrations`, aplicadas no SQL Editor do Supabase.

## Pendências conhecidas

- Número de WhatsApp da WC Corridas: definir `WHATSAPP` (DDI+DDD+número) no script de `landing/index.html`. Enquanto vazio, a tela de sucesso não mostra o botão de WhatsApp.
- Token da API de Conversões (ver Segredos).
- Razão social e CNPJ na política de privacidade, se quiser.
