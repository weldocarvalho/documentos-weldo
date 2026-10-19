-- =========================================================================
-- Exclusão completa de usuário de teste: kauyoxatreve-2071@yopmail.com
-- =========================================================================
-- Rode isso você mesmo no SQL Editor do Supabase (projeto nutri-app). Eu não
-- executo exclusões permanentes de dados por conta própria -- é por isso que
-- estou te entregando o script em vez de rodar direto.
--
-- Mapeei as foreign keys do schema antes de escrever isto:
--   * public.nutrition_profiles é referenciada por CASCADE (ON DELETE CASCADE)
--     de: check_ins, check_outs, meal_logs, milestone_events, nutrition_plans,
--     plan_adherence_checks, plan_changes, progress_photos, push_subscriptions,
--     weekly_feedback, weight_logs -- ou seja, apagar a linha em
--     nutrition_profiles já apaga tudo isso automaticamente.
--   * As demais tabelas com user_id (subscriptions, payments, refunds,
--     cancellation_tickets, pending_onboarding, admin_users, landing_page_visits,
--     trial_leads) NÃO têm foreign key formal para auth.users -- são apagadas
--     manualmente abaixo, uma a uma.
--   * Não confirmei a estrutura de `referral_redemptions` (não tive tempo de
--     checar as colunas antes de fechar esta sessão) -- se esse e-mail chegou a
--     usar ou gerar um código de indicação, vale checar essa tabela à parte
--     (deixo uma consulta de apoio no PASSO 1 para você ver se ela referencia
--     o e-mail ou o user_id de alguma forma).
--
-- Ordem: dados dependentes primeiro, identidade em auth.users por último.
-- =========================================================================


-- PASSO 1 — DIAGNÓSTICO (rode isto primeiro, sem apagar nada)
-- Mostra o usuário e quantas linhas existem em cada tabela para ele. Confirme
-- que é mesmo a conta de teste antes de continuar para o PASSO 2.
select id, email, created_at, confirmed_at, last_sign_in_at
from auth.users
where email = 'kauyoxatreve-2071@yopmail.com';

select
  (select count(*) from public.nutrition_profiles   where user_id = u.id) as nutrition_profiles,
  (select count(*) from public.subscriptions        where user_id = u.id) as subscriptions,
  (select count(*) from public.payments             where user_id = u.id) as payments,
  (select count(*) from public.refunds              where user_id = u.id) as refunds,
  (select count(*) from public.cancellation_tickets where user_id = u.id) as cancellation_tickets,
  (select count(*) from public.pending_onboarding   where user_id = u.id) as pending_onboarding,
  (select count(*) from public.admin_users          where user_id = u.id) as admin_users,
  (select count(*) from public.landing_page_visits  where user_id = u.id) as landing_page_visits,
  (select count(*) from public.trial_leads          where user_id = u.id or email = u.email) as trial_leads
from auth.users u
where u.email = 'kauyoxatreve-2071@yopmail.com';

-- Checagem manual à parte (colunas não confirmadas por mim): veja se esse
-- e-mail aparece em referral_redemptions antes de seguir, se for relevante.
-- select * from public.referral_redemptions where <coluna de email/user_id> = ...;


-- PASSO 2 — EXCLUSÃO (revise o PASSO 1 antes de rodar isto)
-- Está tudo dentro de uma transação: se algo der errado no meio, nada fica
-- aplicado pela metade. Depois do COMMIT não tem como desfazer.
begin;

-- 2.1) Perfil de nutrição -- cascade apaga automaticamente check_ins,
--      check_outs, meal_logs, milestone_events, nutrition_plans,
--      plan_adherence_checks, plan_changes, progress_photos,
--      push_subscriptions, weekly_feedback, weight_logs.
delete from public.nutrition_profiles
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

-- 2.2) Assinatura(s) / cobrança
delete from public.subscriptions
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

delete from public.payments
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

delete from public.refunds
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

delete from public.cancellation_tickets
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

-- 2.3) Onboarding pendente e trial_leads (tabela guarda user_id E email --
--      apaga por qualquer um dos dois que bater)
delete from public.pending_onboarding
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

delete from public.trial_leads
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com')
   or email = 'kauyoxatreve-2071@yopmail.com';

-- 2.4) admin_users -- só existe linha aqui se essa conta tiver sido promovida
--      a admin (não deveria ser o caso de um e-mail de teste, mas por segurança)
delete from public.admin_users
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

-- 2.5) Rastros de analytics/atribuição do funil de anúncios ligados à conta
delete from public.landing_page_visits
where user_id = (select id from auth.users where email = 'kauyoxatreve-2071@yopmail.com');

-- 2.6) Por último, a identidade em si -- o schema auth do Supabase já limpa
--      sozinho as tabelas internas dele (auth.identities, auth.sessions,
--      auth.refresh_tokens etc.) por cascade quando você apaga de auth.users.
delete from auth.users
where email = 'kauyoxatreve-2071@yopmail.com';

commit;


-- PASSO 3 — CONFIRMAÇÃO (depois do commit, deve devolver 0 linhas)
select count(*) as ainda_existe
from auth.users
where email = 'kauyoxatreve-2071@yopmail.com';
