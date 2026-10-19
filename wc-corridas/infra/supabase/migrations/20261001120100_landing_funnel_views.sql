create or replace view public.landing_funnel_by_ad
with (security_invoker = true) as
with v as (
  select
    app_slug,
    coalesce(utm_campaign, '(sem campanha)') as utm_campaign,
    ad_source,
    count(distinct visitor_id) filter (where event_type = 'page_view') as visitors,
    count(*) filter (where event_type = 'page_view') as page_views,
    count(distinct session_id) filter (where event_type = 'cta_click') as cta_sessions,
    count(distinct session_id) filter (where event_type = 'scroll_50') as scroll_50_sessions,
    count(distinct session_id) filter (where event_type = 'form_start') as form_start_sessions
  from public.landing_page_visits
  group by 1, 2, 3
),
l as (
  select
    app_slug,
    coalesce(utm_campaign, '(sem campanha)') as utm_campaign,
    ad_source,
    count(*) as leads
  from public.landing_leads
  group by 1, 2, 3
)
select
  coalesce(v.app_slug, l.app_slug) as app_slug,
  coalesce(v.utm_campaign, l.utm_campaign) as utm_campaign,
  coalesce(v.ad_source, l.ad_source) as ad_source,
  coalesce(v.visitors, 0) as visitors,
  coalesce(v.page_views, 0) as page_views,
  coalesce(v.scroll_50_sessions, 0) as scroll_50_sessions,
  coalesce(v.cta_sessions, 0) as cta_sessions,
  coalesce(v.form_start_sessions, 0) as form_start_sessions,
  coalesce(l.leads, 0) as leads,
  round(100.0 * coalesce(l.leads, 0) / nullif(v.visitors, 0), 2) as conversion_pct
from v
full join l using (app_slug, utm_campaign, ad_source);

create or replace view public.landing_daily_summary
with (security_invoker = true) as
select
  app_slug,
  (created_at at time zone 'America/Sao_Paulo')::date as day,
  count(distinct visitor_id) filter (where event_type = 'page_view') as visitors,
  count(*) filter (where event_type = 'page_view') as page_views,
  count(*) filter (where event_type = 'cta_click') as cta_clicks,
  count(*) filter (where event_type = 'scroll_90') as scroll_90,
  count(*) filter (where event_type = 'lead_submitted') as lead_events
from public.landing_page_visits
group by 1, 2;

revoke all on public.landing_funnel_by_ad from anon, authenticated;
revoke all on public.landing_daily_summary from anon, authenticated;
grant select on public.landing_funnel_by_ad to service_role;
grant select on public.landing_daily_summary to service_role;
