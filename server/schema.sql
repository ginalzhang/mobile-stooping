create extension if not exists pgcrypto;

create table if not exists reservations (
  id            uuid primary key default gen_random_uuid(),
  pass_code     text unique not null,
  status        text not null default 'held'
                check (status in ('held','confirmed','released')),
  name          text not null,
  email         text not null,
  phone         text not null,
  push_token    text,
  confirm_by    timestamptz not null,
  pickup_at     timestamptz not null,
  confirmed_at  timestamptz,
  released_at   timestamptz,
  fri_push_at   timestamptz,
  sun_push_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists reservation_items (
  id                uuid primary key default gen_random_uuid(),
  reservation_id    uuid not null references reservations(id) on delete cascade,
  product_id        text not null,
  variant_id        text not null,
  title             text not null
);

create index if not exists idx_reservations_status_fri_push_at
  on reservations(status, fri_push_at);

create index if not exists idx_reservations_status_sun_push_at
  on reservations(status, sun_push_at);

create index if not exists idx_reservations_email_status_created_at
  on reservations(email, status, created_at desc);

create index if not exists idx_reservation_items_reservation_id
  on reservation_items(reservation_id);

create index if not exists idx_reservation_items_variant_id
  on reservation_items(variant_id);
