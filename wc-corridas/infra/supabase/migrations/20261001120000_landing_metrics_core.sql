create table if not exists public.landing_apps (
  app_slug text primary key check (app_slug ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  display_name text not null,
  meta_pixel_id text,
  capi_secret_name text,
  allowed_origins text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.landing_page_visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  app_slug text not null references public.landing_apps(app_slug),
  path text not null check (char_length(path) <= 300),
  full_url text check (char_length(full_url) <= 2000),
  referrer text check (char_length(referrer) <= 2000),
  utm_source text check (char_length(utm_source) <= 200),
  utm_medium text check (char_length(utm_medium) <= 200),
  utm_campaign text check (char_length(utm_campaign) <= 200),
  utm_content text check (char_length(utm_content) <= 200),
  utm_term text check (char_length(utm_term) <= 200),
  ad_source text generated always as (coalesce(nullif(utm_content, ''), 'organico')) stored,
  fbclid text check (char_length(fbclid) <= 500),
  session_id text check (char_length(session_id) <= 100),
  visitor_id text check (char_length(visitor_id) <= 100),
  event_type text not null default 'page_view' check (event_type in (
    'page_view','cta_click','scroll_50','scroll_90','form_view','form_start','simulator_use','faq_open','lead_submitted','lead_error'
  )),
  device_type text check (device_type in ('mobile','tablet','desktop')),
  browser_locale text check (char_length(browser_locale) <= 20),
  screen_width int check (screen_width between 0 and 20000),
  screen_height int check (screen_height between 0 and 20000),
  user_agent text check (char_length(user_agent) <= 600)
);

create index if not exists landing_page_visits_app_created_idx on public.landing_page_visits (app_slug, created_at desc);
create index if not exists landing_page_visits_app_ad_idx on public.landing_page_visits (app_slug, ad_source);
create index if not exists landing_page_visits_app_campaign_idx on public.landing_page_visits (app_slug, utm_campaign);
create index if not exists landing_page_visits_event_idx on public.landing_page_visits (event_type);
create index if not exists landing_page_visits_session_idx on public.landing_page_visits (session_id);

create table if not exists public.landing_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  app_slug text not null references public.landing_apps(app_slug),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text not null check (phone ~ '^55[0-9]{10,11}$'),
  email text check (char_length(email) <= 200),
  form_data jsonb not null default '{}'::jsonb,
  consent_lgpd boolean not null check (consent_lgpd),
  consent_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  ad_source text generated always as (coalesce(nullif(utm_content, ''), 'organico')) stored,
  fbclid text,
  fbp text,
  fbc text,
  session_id text,
  visitor_id text,
  event_id text,
  source_url text,
  user_agent text,
  ip_hash text,
  capi_status text not null default 'pending' check (capi_status in ('pending','sent','failed','skipped')),
  capi_response jsonb,
  status text not null default 'new' check (status in ('new','contacted','qualified','activated','discarded')),
  submissions int not null default 1,
  unique (app_slug, phone)
);

create index if not exists landing_leads_app_created_idx on public.landing_leads (app_slug, created_at desc);
create index if not exists landing_leads_app_ad_idx on public.landing_leads (app_slug, ad_source);
create index if not exists landing_leads_status_idx on public.landing_leads (app_slug, status);

create or replace function public.landing_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists landing_leads_updated_at on public.landing_leads;
create trigger landing_leads_updated_at
  before update on public.landing_leads
  for each row execute function public.landing_set_updated_at();

alter table public.landing_apps enable row level security;
alter table public.landing_page_visits enable row level security;
alter table public.landing_leads enable row level security;

drop policy if exists "service role manages landing_apps" on public.landing_apps;
create policy "service role manages landing_apps" on public.landing_apps
  for all to service_role using (true) with check (true);

drop policy if exists "service role manages landing_page_visits" on public.landing_page_visits;
create policy "service role manages landing_page_visits" on public.landing_page_visits
  for all to service_role using (true) with check (true);

drop policy if exists "anon can record visit for active app" on public.landing_page_visits;
create policy "anon can record visit for active app" on public.landing_page_visits
  for insert to anon
  with check (exists (select 1 from public.landing_apps a where a.app_slug = landing_page_visits.app_slug and a.active));

drop policy if exists "service role manages landing_leads" on public.landing_leads;
create policy "service role manages landing_leads" on public.landing_leads
  for all to service_role using (true) with check (true);

revoke all on public.landing_apps from anon, authenticated;
revoke all on public.landing_page_visits from anon, authenticated;
revoke all on public.landing_leads from anon, authenticated;
grant all on public.landing_apps to service_role;
grant all on public.landing_page_visits to service_role;
grant all on public.landing_leads to service_role;
grant insert on public.landing_page_visits to anon;
grant select on public.landing_apps to anon;

drop policy if exists "anon can read active apps" on public.landing_apps;
create policy "anon can read active apps" on public.landing_apps
  for select to anon using (active);
