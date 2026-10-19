# Belter Oracle — Documento de Continuidade e Análise de Mercado

> **Propósito deste documento:** registro de referência para não perder o fio condutor da análise entre sessões. Contém o objetivo real do projeto, a metodologia acordada, todos os achados de mercado validados até agora, a análise de funcionalidades dos três produtos, e as comparações cruzadas com concorrentes reais. Atualizar este arquivo sempre que houver achado novo relevante.

**Última atualização:** 08/09/2026 (inclui seção 7.5 — hipótese de pivô de nutrição)

---

## 1. Objetivo real do projeto (não perder isso de vista)

Este NÃO é um exercício de "encontrar um nicho genérico para empreender do zero". O Weldo já tem três produtos construídos — **Capila**, **Zion Skincare** e **Goak Tech Official** — que vão receber investimento. O objetivo é usar dado real de mercado (anúncio escalando, produto validado) para responder duas perguntas concretas:

1. **O que falta na Goak Tech** para ela se tornar competitiva dentro do mercado já validado em que ela compete (SaaS B2B para restaurantes / agente de WhatsApp para vendas-atendimento)?
2. **O que falta na Zion e na Capila** para se tornarem produtos que vendem, usando como régua os produtos/anúncios já validados no mercado de beleza/skincare/haircare?

O próximo passo combinado com o Weldo é: ele mostra anúncios reais para comparação direta contra o que já validamos escalando no Meta Ads — não pesquisa abstrata nova, mas comparação ponto a ponto com o que os três projetos já têm.

## 2. Metodologia acordada (princípio anti-viés — NÃO repetir o erro)

**Regra fixada pelo Weldo, corrigida duas vezes ao longo da pesquisa:** primeiro entender o que é genuinamente emergente nos dados brutos, sem filtro nenhum de categoria ou preferência pessoal — só depois nichar, só depois validar/funilar. Eu (Claude) errei duas vezes escolhendo categorias de busca (Software, AI) baseado na preferência declarada do Weldo por SaaS, em vez de olhar dado 100% sem filtro. A correção veio de rodar Exploding Topics sem filtro de categoria nenhum, o que revelou que o topo do crescimento é dominado por **beleza/skincare e saúde/longevidade**, não software.

**Erro de julgamento raso a evitar:** ao analisar um projeto/concorrente, não parar no reconhecimento superficial (só `package.json` e pastas de topo). O caso Goak Tech mostrou isso — só descobri a integração nativa de WhatsApp Business API dela depois de grep explícito em `utils/`, algo que devia ter sido feito desde o início.

## 3. Os três projetos — inventário de funcionalidades

### 3.1 Capila (`Documents/projects/belter-oracle/capila-app`)
App de rotina capilar por IA. Stack: Vite + React 19 + TypeScript, TanStack Start/Router, Supabase.
- Onboarding capilar (tipo de cabelo, sensibilidade, alergias, orçamento, tempo, clima)
- Rotina gerada por IA (Google GenAI SDK): 3-5 passos AM/PM, linguagem cosmética (não terapêutica — ANVISA/CDC)
- Acompanhamento diário (check-in sono/água, marcação de passo)
- Diário de fotos (selfies periódicas)
- XP acumulado (nunca decresce), 4 níveis: Iniciante, Consistente, Disciplinada, Mestre Capilar
- Desafio semanal único ativo, pool fixo de templates
- 10 conquistas fixas
- Pagamentos: Stripe + Paddle (padrão Paddle)
- **É fork explícito do Zion Skincare.** Duas inconsistências documentadas e não corrigidas: (1) landing page ainda fala de "pele"/skincare; (2) `routine-validator.server.ts` ainda exige protetor solar e bloqueia retinol — regras de skincare vazando pro produto capilar.
- **Não tem scanner de foto/diagnóstico visual** (diferença crítica frente aos concorrentes validados — ver seção 5).

### 3.2 Zion Skincare (`Documents/projects/belter-oracle/zion-skincare`)
Mesmo motor de produto do Capila, tema pele. Infraestrutura de crescimento mais completa:
- Mesmo núcleo (onboarding, rotina IA, XP/streaks/conquistas/desafios, diário de fotos)
- Programa de referral
- Integração WhatsApp (`whatsapp.server.ts`)
- Push notifications + e-mail transacional
- Meta Conversions API server-side + pixel/cookies (`metaCapi.server.ts`, `metaCookies.ts`)
- 3 landing pages de venda (A/B testing): `sales-landing.tsx`, `sales-lp.tsx`, `sales-lp-v3.tsx`
- Feature flags, nudges de engajamento, painel admin próprio
- Pagamentos: Stripe + Paddle
- **Não tem scanner de foto/diagnóstico visual** (mesma lacuna do Capila)
- *(Não confirmei se o `src/lib/` do Capila replica 100% desses módulos de crescimento — só vi a estrutura de pastas de alto nível do Capila. Verificar se for relevante.)*

### 3.3 Goak Tech Official ("Gòak Tech Deliveries e Ads") (`Documents/projects/goak-tech-official`)
Produto totalmente separado — SaaS B2B multi-tenant para restaurantes. Stack: Next.js 16.2.10, React 19.2, Supabase, Stripe (sem Paddle).
- Cardápio digital multi-tenant via `[slug]`
- Checkout próprio: PIX, dinheiro, cartão
- Gestão de estoque/insumos, painel de cozinha
- Gestão de entregadores + link de rastreamento pro cliente
- Métricas operacionais/funil + métricas e pixel de Meta Ads próprios
- Modelo: assinatura SaaS (`/assinar` → Stripe → provisionamento automático → magic link)
- Suíte de testes de homologação extensa (auth, admin, vitrine/carrinho, checkout, webhook, cozinha)
- **Integração nativa com WhatsApp Business API (achado tardio, importante):**
  - `app/api/admin/integracoes/whatsapp-business/` — OAuth com a Meta (conectar/desconectar/callback)
  - `app/api/webhooks/whatsapp/route.ts` — webhook de eventos
  - `utils/whatsapp-business.ts` — chama Graph API da Meta diretamente, gerencia token/WABA/template aprovado
  - `utils/notificacoes-pedido.ts` — dispara notificação de status de pedido via WhatsApp, fallback push
  - **Limitação atual: só outbound/transacional.** Não recebe/processa mensagem do cliente, não tem chatbot, não tem inbox compartilhado, não tem disparo em massa/campanha.

## 4. Mercado validado — Fase 1 (tabela original do Weldo, reproduzida literalmente)

### Mercado de produto não-físico (digital)
- **Contador de calorias com IA** `B2C` — Calo (CaloApp.ai). Ativo desde 18/dez/2025, roda BR+EUA.
- **App de treino em casa** `B2C` — LazyFit. 4 anúncios ativos com mesmo criativo simultaneamente.
- **Produtividade/tracking de tempo** `B2C/prosumer` — Rize. Ativo desde 14/fev/2024 (~19 meses).
- **Fricção consciente de tela** `B2C` — one sec app. Ativo desde 28/nov/2023 (~34 meses, o mais longevo).
- **Agente de IA no WhatsApp (vendas/atendimento)** `B2B` — WhatChimp, Poli Digital, LeminAi. WhatChimp ativo desde 12/nov/2025, 3 idiomas simultâneos — achado mais forte da categoria.
- **Ferramenta de IA pra criador de conteúdo** `B2C/prosumer` — Vid.ai, Vidix, VideoExpress.ai, Captions.
- **Agente de IA de reunião** `B2B` — Otter.ai (achado cruzado, não buscado direto).
- *Sem validação de anúncio ainda naquele momento: Higgsfield, Outmind, Jobright (depois validados/invalidados — ver seção 6.3).*

### Mercado de produto físico
- **Suplemento de colágeno** `B2C` — Vitae Saúde. Ativo desde abril/2023 (+3 anos) — achado mais validado de toda a pesquisa.
- **Sérum PDRN (DNA de salmão)** `B2C + B2B` — Medik8, DERM Skincare, Marini SkinSolutions (B2B pra clínica).
- **Chá/suplemento emagrecedor via criador** `B2C` — Renan B. Ativo desde set/2024.
- **Suplementos multi-produto** `B2C` — Always FIT.
- **VSL de emagrecimento** `B2C` (caso ambíguo digital/físico) — Eduardo Claas.
- *Sem validação de anúncio ainda naquele momento: Weight Loss Peptides, Epitalon, Medicube.*

**Nota:** depois dessa tabela, validei por anúncio real Weight Loss Peptides, Epitalon, Medicube, e também Higgsfield/Outmind/Jobright — Outmind e Jobright não retornaram anúncio no Meta (provável B2B via LinkedIn/sales-led). **O texto literal desse resultado final não está mais disponível** (perdido na compactação) — se for crítico, re-rodar.

## 5. Cruzamento com os 3 projetos — achados centrais

### 5.1 Zion/Capila × mercado validado
Nenhuma das duas listas (Fase 1) tinha, originalmente, um app de skincare/haircare. Rodei busca dedicada (Meta Ad Library, BR+EUA) e encontrei:

- **Lóvi** — concorrente direto e fortemente validado da Zion. Ver seção 6.1 completa.
- **MyHair AI** — concorrente adjacente (não direto) da Capila, ocupa nicho de diagnóstico de queda de cabelo. Ver seção 6.2.
- **Nenhum concorrente de app de rotina capilar genérico** apareceu em nenhuma busca (BR "rotina capilar"/"app rotina capilar", EUA "AI hair care app") — todos os resultados foram produto físico (cosmético, clínica, salão, suplemento). A Capila corre sozinha nesse território específico — sem prova de que anúncio pago funciona para esse ângulo exato.

**Gap estrutural identificado (quadro comparativo completo na seção 6.4):** Zion e Capila têm o motor de gamificação mais completo dos quatro apps comparados, mas são as únicas **sem diagnóstico visual (scanner de foto)** — que é exatamente o gancho de aquisição que Lóvi e MyHair AI usam.

### 5.2 Goak Tech × mercado validado
A Goak Tech tem relação direta (não "zero relação", como cheguei a dizer errado antes) com WhatChimp/Poli Digital/LeminAi: ela já resolve, internamente, uma fatia estreita da mesma dor (notificação oficial via WhatsApp API), mas só outbound/transacional. Faltam (detalhe completo na seção 7):
- Recebimento e resposta automática de mensagem (inbound)
- Agente de IA pra vender/atender via chat (fechar pedido pelo WhatsApp)
- Inbox compartilhado multi-atendente
- Disparo em massa/campanha de marketing
- Catálogo de cardápio exposto dentro do chat
- Integração click-to-WhatsApp a partir do próprio anúncio de Meta Ads que a Goak Tech já roda

## 6. Análise detalhada de concorrentes digitais (skincare/hair)

### 6.1 Lóvi (interview.lovi.care / lovi.care) — concorrente da Zion

**Anúncios (Meta Ad Library):** 39 IDs de anúncio ativos distintos mapeados (amostra, não é o total). Janela: 31/mar/2026 até 4/set/2026 (5+ meses contínuos, criativo novo ainda essa semana). Formato: 100% vídeo estilo depoimento/autoridade, só duas personas fixas ("Kim Ji Soo 김지수 - Korean Skincare Expert", "Lia Choi Eun-ha 리아 최 은하 - Korean Skincare Expert"). Multilíngue simultâneo: inglês, espanhol, francês, português. Dois ganchos de CTA: quiz direto e "comente 'lovi' que te mando o guia". Um variant sinalizado como restrito por "Transparência da UE" (não cumpriu requisito — provável questão regulatória de claim de saúde/cosmético).

**Produto:** "Lovi – AI Skin Care Scanner" (App Store/Google Play). Face Scanner (11+ condições via foto), Cosmetics Scanner ("Fit Score" sem barcode), AI Assistant 24/7 (claim de ter "passado no US Medical License Exam" — marketing, desconfiar), Routine Generator a partir de "My Skin Profile", banco de dados de segurança de ingrediente.

**Empresa:** opera como **Pora.ai**, fundada 2021, sede Chipre, 11-50 funcionários, seed de US$50 mil da **Palta** (holding conhecida por escalar apps de saúde/bem-estar por assinatura, tipo Flo/Simple) em 2021 + nota conversível 2023. Adquiriu Ama Care em fev/2025.

**Métricas de uso:** App Store 4,6★ (3,8 mil avaliações); Google Play "10 mil+" downloads, 328 avaliações, 4,5★. Preços: semanal US$7,99, mensal US$12,99, trimestral US$29,99, anual US$49,99.

**Assinantes:** número exato não divulgado publicamente em nenhuma fonte checada (Crunchbase, Dealroom, App Store, Play Store).

**Está vendendo? Avaliação:** anúncio pago sozinho é evidência indireta forte, não prova direta — 5+ meses de gasto sustentado normalmente não sobrevive se não converte, mas isso não descarta subsídio estratégico de portfólio (Palta). Cruzando com preço de assinatura publicado de forma transparente + quase 4 mil avaliações reais + 5 anos de operação + aquisição recente: **confiança alta de que vende o suficiente pra sustentar e expandir**, mas sem número exato de receita/assinantes disponível publicamente.

### 6.2 MyHair AI (myhair.ai) — concorrente adjacente da Capila

**Fundadores:** Cyriac Lefort (francês, 32 anos) e Tilen Babnik. Ideia nasceu de comentário de cabeleireiro sobre queda de cabelo do próprio Lefort, em salão de NY.
**Fundação:** ~2023, lançamento verão 2024. Protótipo construído em semanas com Cursor (IA-assisted coding).
**Métricas:** **200.000+ usuários registrados, 1.000+ assinantes pagantes** (conversão free→pago ~0,5%), 300.000+ fotos de couro cabeludo analisadas.
**Produto:** análise de couro cabeludo por foto (visão computacional), medição de densidade capilar, detecção precoce de padrão de queda, tracking de progressão, "AI Hair Advisor" (chat com histórico do próprio usuário), conexão com especialistas verificados.
**Parcerias:** 50+ médicos, 20+ clínicas (Paris, NY, Dubai — incl. Clinique des Champs-Élysées). Dra. Tess Mauricio (dermatologista) no board.
**Modelo:** freemium (grátis limitado + Premium ilimitado).
**Concorrente citado na imprensa:** Hims (telemedicina de queda de cabelo).
**Canal de aquisição:** parceria médica/clínica + imprensa — **não encontrei anúncio ativo dela no Meta Ad Library** nas buscas feitas. Canal diferente do da Lóvi.

**Ponto estratégico chave:** MyHair AI ocupa nicho de **diagnóstico médico-adjacente de queda de cabelo**, não o nicho "cosmético amplo, todo tipo de cabelo" que a Capila ocupa. Prova que "app de cabelo com IA" escala (200k usuários é validação forte), mas por caminho de maior fricção regulatória que a Capila evitou de propósito. Decisão estratégica em aberto: ficar no território seguro sem prova direta de venda, ou mirar a fatia já provada (queda de cabelo) assumindo o peso regulatório.

### 6.3 WhatChimp, Poli Digital e LeminAi — mesma análise aplicada ao concorrente da Goak Tech

*(Ver quadro consolidado completo na seção 7 — aqui só o detalhe bruto de anúncio/empresa de cada um.)*

**WhatChimp:**
- Empresa: fundada 2019, entidade legal GrowMeOrganic LLC, Meta Business Partner verificado.
- Anúncios: >50.000 resultados na busca por palavra-chave (ruído de correspondência ampla), mas **19 IDs distintos de anúncio da própria marca** mapeados no topo por impressão, janela 12/nov/2025 → 18/ago/2026 (9+ meses contínuos). Formato: copy direto de venda, voz de marca única (não influencer/UGC como a Lóvi). Mensagem consistente: "0% markup na API da Meta (concorrentes cobram 20-25%)", "confiado por milhares de empresas em 90+ países", "#1 no Trustpilot", preço-âncora "a partir de US$12/mês".
- Reputação: Trustpilot 4,7★, 192 avaliações.
- Assinantes/receita: não divulgado.

**Poli Digital (Polichat):**
- Empresa: sede Goiânia (BR), 101-250 funcionários, 4 rodadas seed (investidores incluem Bossa Invest, ACE Ventures), ~114 mil visitas mensais ao site.
- Anúncios: 210 resultados na busca BR, **17 IDs distintos de anúncio da marca** mapeados, janela 27/jan/2026 → 5/set/2026 (7+ meses, ainda ativo há poucos dias). Formato: vídeo de marca, direto ao benefício ("evite banimento do WhatsApp", "profissionalize o atendimento"). *Nota metodológica: a busca também trouxe ruído de anunciantes homônimos não relacionados ("Teacher Poli", "Tintim") — cuidado ao repetir essa busca.*
- Reputação: Capterra 5,0★ mas só 2 avaliações (amostra pequena demais pra significar algo — provavelmente porque cliente BR não usa Capterra).
- Assinantes/receita: não divulgado, mas porte de equipe (100+) e funding institucional (VCs conhecidos) indicam operação real e substancial.

**LeminAi:**
- Empresa: site próprio alega "15.000+ empresas atendidas, 150 mil usuários ativos mensais, aumento de 130% em conversão" — **claim não verificado, autodeclarado**.
- Anúncios: **apenas ~1 (um) anúncio ativo encontrado** globalmente para essa palavra-chave — começou 16/jun/2026, criativo único (Shared Team Inbox, AI-Powered Automation, Bulk Broadcasting, Auto Replies, Chatbot Builder, Drip Campaigns, CRM Integration, Multi-Agent Support), oferece teste grátis de 15 dias + demo.
- **Discrepância relevante:** a escala autodeclarada (15 mil empresas) não bate com o investimento em anúncio pago quase inexistente encontrado. Hipóteses: aquisição por outro canal (SEO, parceria, outbound) — ou número inflado/aspiracional. Não cheguei a checar Trustpilot/Capterra/G2 pra LeminAi ainda.
- **Veredito: sinal mais fraco e menos confiável dos três.** Tratar "15 mil empresas" com ceticismo até corroboração independente.

### 6.4 Quadro comparativo — apps de skincare/hair (Lóvi × MyHair AI × Zion × Capila)

| | Lóvi (validado) | MyHair AI (validado) | Zion Skincare | Capila |
|---|---|---|---|---|
| Onboarding | "My Skin Profile" | Upload de foto do couro cabeludo | Questionário tipo de pele | Questionário tipo de cabelo |
| Diagnóstico IA | Face Scanner (11+ condições via foto) | Densidade capilar + padrão de queda via foto | Não tem scanner de foto | Não tem scanner de foto |
| Geração de rotina | Routine Generator | Recomendação de tratamento | Rotina IA 3-5 passos AM/PM | Rotina IA 3-5 passos AM/PM |
| Scanner de produto/ingrediente | Sim ("Fit Score") | Não | Não | Não |
| Acompanhamento | Comparação visual de progresso | Tracking + alertas | Diário de fotos + check-in | Diário de fotos + check-in |
| Gamificação | Não aparente | Não aparente | XP, níveis, streak, desafio, conquistas | XP, níveis, streak, desafio, conquistas |
| Especialista humano | Não | Sim (50+ médicos, 20+ clínicas) | Não | Não |
| Posicionamento | Cosmético amplo | Diagnóstico de queda (nicho médico) | Cosmético amplo | Cosmético amplo |
| Monetização | Assinatura | Freemium | Stripe/Paddle | Stripe/Paddle |
| Usuários | Não divulgado (proxies: 3,8k avaliações App Store, 10k+ Android) | 200k+ registrados, 1k+ pagantes | Não lançado publicamente (presumo) | Não lançado publicamente (presumo) |
| Canal de aquisição | Anúncio pago em massa (UGC/depoimento), 5+ meses | Parceria clínica/médica + imprensa | — | — |

## 7. Quadro consolidado — concorrentes da Goak Tech (WhatsApp AI B2B)

| | WhatChimp | Poli Digital | LeminAi | Goak Tech (hoje) |
|---|---|---|---|---|
| Fundação | 2019 | — (BR, Goiânia) | — | — |
| Porte | Meta Business Partner verificado | 101-250 funcionários, funding institucional (Bossa Invest, ACE Ventures) | Autodeclarado 15k empresas/150k MAU (não verificado) | — |
| Anúncios ativos mapeados | 19 IDs, 9+ meses contínuos | 17 IDs, 7+ meses contínuos | **1 único ID ativo** | Não anuncia esse recurso separadamente |
| Reputação | Trustpilot 4,7★ (192 avaliações) | Capterra 5,0★ (só 2 avaliações) | Não checado | — |
| Inbound (recebe/responde mensagem) | Sim | Sim | Sim (alegado) | **Não** |
| Agente de IA conversacional pra venda | Sim (ChatGPT-powered) | Sim (chatbot) | Sim (alegado) | **Não** |
| Inbox compartilhado multi-atendente | Sim | Sim ("um número, vários atendentes") | Sim (alegado) | **Não** |
| Disparo em massa/campanha | Sim | Sim | Sim (alegado) | **Não** (só notificação individual de pedido) |
| Catálogo de produto no chat | Sim | Não confirmado | Não confirmado | Tem cardápio estruturado no banco — não exposto via WhatsApp |
| Integração anúncio→chat | Sim (click-to-WhatsApp) | Não confirmado | Não confirmado | Já tem pixel/métricas próprias de Meta Ads — não conectado ao WhatsApp ainda |
| Envio de notificação de status via API oficial | Não é o foco | Não é o foco | Não é o foco | **Sim — só isso hoje** |

**Conclusão da seção 7:** o que falta na Goak Tech não é pequeno, mas também não é do zero — é transformar a integração de WhatsApp de "notificador de status" (outbound only) em "canal de venda completo" (inbound + IA conversacional + inbox + campanha), que é exatamente a categoria mais validada de toda a Fase 1 da pesquisa. WhatChimp e Poli Digital têm sinal de validação forte (ads sustentados por muitos meses + empresa de porte real); LeminAi é o mais fraco dos três e não deveria ser tratado como referência de peso igual.

## 7.5. Nova hipótese de produto: pivô/derivado de nutrição usando o motor da Zion

**Proposta do Weldo (08/09/2026):** criar um SaaS web mobile-first de rotina de nutrição saudável, com foco em objetivo (lista de 2-3 objetivos — ex: emagrecimento, outro — usuário escolhe só 1).

**Decisão de base de código (atualizado 08/09/2026): usar a Capila como ponto de partida, não a Zion.** Motivo: o layout/design system da Capila está mais condizente com o produto pretendido. Tecnicamente os dois compartilham o mesmo motor (Capila é fork da Zion), então a análise de reaproveitamento abaixo continua válida — só o ponto de partida do fork muda de Zion para Capila. **Pendência:** ainda não fizemos o levantamento completo de `src/lib/` da Capila (só temos isso em profundidade da Zion) — necessário antes de planejar o build, porque as duas notas conhecidas de inconsistência do fork Capila (landing ainda fala de pele, `routine-validator.server.ts` ainda com regra de skincare) precisam ser reavaliadas nesse novo contexto de nutrição, não cabelo.

### Validação de mercado (achado mais forte de toda a pesquisa até agora)
- **Calo (CaloApp.ai)** — já validado na Fase 1: "Contador de Calorias & Emagrecimento", app IA, ativo BR+EUA simultâneo, 9 meses.
- **Cal AI** (app DIFERENTE, não confundir com o Calo acima) — validação por **exit real, não por inferência de anúncio**: construído por dois então-adolescentes (Zach Yadegari, Henry Langmack), **15M+ downloads em <2 anos, US$30M+ de receita anual**, **adquirido pelo MyFitnessPal** (fechado dez/2025), time de só 7 pessoas. É o sinal de validação mais forte de toda a pesquisa (mais forte que Lóvi, MyHair AI, ou qualquer achado de anúncio).

### Diferença estrutural crítica: tracker vs. gerador prescritivo
Cal AI e Calo são **rastreadores** — usuário fotografa a comida, app estima caloria/macro, acompanha progresso. Não é a IA que decide o que o usuário deve comer. Isso é estruturalmente diferente do motor atual da Zion, que **gera** a rotina completa a partir do onboarding. Uma "rotina de nutrição gerada por IA" nos moldes da Zion se aproxima mais de **prescrição dietética** do que de contador de caloria.

### Barreira regulatória (Brasil) — mais pesada que a da Zion/Capila
Confirmado via resolução do CFN (Conselho Federal de Nutricionistas): pela **Lei 8.234/1991, Art. 3º §VIII**, prescrever dieta (valor calórico, macro/micronutriente, distribuição de refeição) é **atividade privativa de nutricionista registrado**. Nem médico pode, além de indicar via de acesso geral. Existe fiscalização ativa contra exercício ilegal da profissão. O documento da CFN não trata de app/IA diretamente (zona cinzenta), mas o princípio legal é claro. **Isso é uma barreira mais explícita/fiscalizada do que a linguagem cosmética que a Zion/Capila já usam pra driblar ANVISA/CDC.**

### Recomendação de mapeamento (o que reaproveita vs. o que é novo)
**Reaproveita direto do motor da Zion:** onboarding (escolha de 1 objetivo entre 2-3 mapeia no padrão de tipo de pele/cabelo), XP/níveis/streak/desafio semanal/conquistas (só copy muda), diário de fotos (vira progresso corporal), check-in diário (troca sono/água por refeição), Stripe/Paddle, **e toda a infraestrutura de Meta CAPI/pixel já pronta** (vantagem real — permite rodar anúncio validado desde o dia 1).

**Trabalho novo de verdade:** núcleo de reconhecimento/registro de refeição (visão computacional pra estimar caloria por foto — peça de IA bem diferente do prompt de texto que gera rotina de skincare) e base de dados nutricional.

**Ajuste de produto recomendado:** desenhar como rastreador com sugestão geral, não como gerador de "plano alimentar pronto" — mesmo tipo de cuidado de linguagem que o `routine-validator.server.ts` da Zion já aplica pra skincare, adaptado pra ficar do lado seguro da linha nutricionista-exclusiva.

## 8. Perguntas em aberto / próximos passos possíveis

1. Weldo vai trazer anúncios reais para comparação direta ponto a ponto com os projetos — aguardando esse material.
2. Confirmar se `src/lib/` do Capila replica os módulos de crescimento do Zion (referral, WhatsApp, Meta CAPI, 3 landing pages) — só a estrutura de pastas de alto nível foi checada até agora.
3. Checar LeminAi em Trustpilot/Capterra/G2 pra ter segundo dado além do anúncio quase inexistente.
4. Decisão estratégica em aberto pra Capila: permanecer no território "cosmético amplo sem prova direta" ou mirar o nicho de queda de cabelo já provado pela MyHair AI (implica revisar a decisão deliberada de não fazer claim terapêutico).
5. Avaliar se vale adicionar scanner de foto/diagnóstico visual à Zion e à Capila — é o gap estrutural mais evidente frente aos dois concorrentes validados (Lóvi e MyHair AI).
6. Re-rodar a validação por anúncio de Weight Loss Peptides/Epitalon/Medicube se o dado exato for necessário (o texto literal desse resultado foi perdido na compactação anterior).

## 9. Execução — progresso (08/09/2026, sessão de build)

**Decisão confirmada:** app de nutrição é aplicação **totalmente separada** da Capila (infra/deploy próprios), fork de código apenas como ponto de partida. Nome de marca ainda em aberto — usar placeholder até decidir.

- **Fork criado:** `belter-oracle/nutri-app` (cópia de `capila-app`, sem `node_modules`/`.output`/`.git` antigos; `git init` novo feito). Falta rodar `npm install`.
- **Branding via env var: já pronto no código herdado**, não precisa implementar do zero — `.env.local.example` já tem `APP_BRAND_NAME`, `APP_BRAND_TAGLINE`, `APP_BRAND_DOMAIN`, `APP_BRAND_CONTACT_EMAIL` (client `VITE_*` e server, ambos). Só trocar o valor.
- **Precedente técnico valioso encontrado:** migration `20260903184757_generalize_skin_profiles_to_hair.sql` já documenta o padrão certo pra esse tipo de generalização — usar `ALTER TABLE ... RENAME` (Postgres preserva RLS/FK por OID, não por nome) em vez de recriar tabela do zero, remover coluna sem equivalente em vez de reaproveitar com sentido errado, e limpar seed de demonstração herdado. Vou seguir esse mesmo padrão pra `hair_profiles` → perfil de nutrição.
- **Infra atual da Capila:** deploy em GCP (`Dockerfile`, `scripts/deploy-gcp.sh`, `.env.production.gcp`), não é só Vercel/Netlify padrão do TanStack Start. IA usa Vertex AI (Google Cloud) + OpenRouter como alternativa.
- **Supabase:** org "Belter Tech" já existe, mas só tem **1 projeto (Zion, AWS sa-east-1, plano Free, Nano)**. Preciso confirmar com o Weldo se o plano Free da organização comporta um 2º projeto sem custo, ou se criar o novo projeto exige upgrade pago — não vou criar/pagar nada sem confirmação explícita.
- **Meta Ads:** conta "Belter OTech" (ID 1749133929563751) já tem **forma de pagamento salva**, mas **ainda falta**: escolher a Página do Facebook (duas disponíveis: "Belter Oracle Tech" e "Belter Oracle Tech Ads" — a segunda bate com o nome que o Weldo definiu) e verificar telefone. Nenhuma campanha ativa ainda, R$0,00 gasto.
- **Mineração de anúncios (Cal AI vs Calo) — achado que ajusta a recomendação anterior:**
  - **Cal AI**: copy 100% "tracker puro" — "AI can now count your calories—just from a photo... instant nutritional breakdowns" — nunca promete plano/prescrição. Also usa vídeo do próprio fundador (zachyadegari) contando a origem do app — storytelling autêntico, não persona fictícia.
  - **Calo (CaloApp.ai)**: copy inclui explicitamente **"🎯 Tailored meal plans designed just for you based on your weight loss goals"** — ou seja, ao contrário do que eu presumi antes, a Calo SE ANUNCIA como gerador de plano alimentar personalizado, não só tracker. Roda esse criativo único, quase sem variação, desde nov/2025 até agora (10+ meses, o mais longevo validado até aqui).
  - **Isso é uma atualização real à recomendação da seção 7.5:** a linha seguro/arriscado não é tão limpa quanto eu descrevi — existe validação de mercado (em anúncio, mercado dos EUA) tanto pro modelo "tracker puro" (Cal AI) quanto pro modelo "com plano personalizado" (Calo). A barreira do CFN que levantei é especificamente brasileira; não sabemos ainda se a Calo opera/anuncia no Brasil com essa mesma promessa. **Precisa checar isso antes de decidir qual dos dois modelos copiar.**
  - Concorrentes menores no mesmo espaço, mesma tática de persona múltipla que a Lóvi usa: "CalScan" (Calorie Counter AI, várias contas-persona diferentes anunciando o mesmo app), "Rich King"/"Rich Family" (Track calories/BMI), "Dietfit" (mercado vietnamita, mesmo conceito).

## 10. Fontes usadas nesta análise
- Meta Ad Library (facebook.com/ads/library) — buscas por palavra-chave, BR e EUA/Global
- App Store / Google Play (páginas de app da Lóvi)
- Dealroom.co, Crunchbase — dados de empresa/funding (Lóvi/Pora.ai, Poli Digital/Polichat)
- Trustpilot, Capterra — reputação/avaliações
- techbuzz.ai, ubos.tech, myhair.ai — MyHair AI
- whatchimp.com, leminai.com, poli.digital — sites próprios dos produtos
- Código-fonte dos três projetos (device bridge, Mac do Weldo)
