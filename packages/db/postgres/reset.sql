DROP TYPE IF EXISTS upload_type cascade;
DROP TYPE IF EXISTS pin_status_type cascade;
DROP TABLE IF EXISTS upload CASCADE;
DROP TABLE IF EXISTS pin CASCADE;
DROP TABLE IF EXISTS pin_location;
DROP TABLE IF EXISTS pin_request;
DROP TABLE IF EXISTS pin_sync_request;
DROP TABLE IF EXISTS public.pinning_api_pin_request;
DROP TABLE IF EXISTS content;
DROP TABLE IF EXISTS backup;
DROP TABLE IF EXISTS auth_key;
DROP TABLE IF EXISTS public.user;

DROP SCHEMA IF EXISTS cargo CASCADE;
DROP SERVER IF EXISTS dag_cargo_server CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.aggregate_entry CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.deal CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.aggregate CASCADE;