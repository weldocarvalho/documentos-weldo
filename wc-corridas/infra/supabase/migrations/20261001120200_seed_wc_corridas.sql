insert into public.landing_apps (app_slug, display_name, meta_pixel_id, capi_secret_name, allowed_origins)
values (
  'wc-corridas',
  'WC Corridas',
  '1576806120384003',
  'CAPI_TOKEN_WC_CORRIDAS',
  array['https://wc-corridas.belter-oracle.com.br']
)
on conflict (app_slug) do update
set display_name = excluded.display_name,
    meta_pixel_id = excluded.meta_pixel_id,
    capi_secret_name = excluded.capi_secret_name,
    allowed_origins = excluded.allowed_origins;
