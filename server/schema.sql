create extension if not exists pgcrypto;

create table if not exists reservations (
  id            uuid primary key default gen_random_uuid(),
  pass_code     text unique not null,
  status        text not null default 'held'
                check (status in ('held','confirmed','picked_up','relisted','released')),
  name          text not null,
  email         text not null,
  phone         text not null,
  confirm_by    timestamptz not null,
  pickup_at     timestamptz not null,
  confirmed_at  timestamptz,
  picked_up_at  timestamptz,
  relisted_at   timestamptz,
  fri_sms_at    timestamptz,
  sun_sms_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists reservation_items (
  id                uuid primary key default gen_random_uuid(),
  reservation_id    uuid not null references reservations(id) on delete cascade,
  product_id        text not null,
  variant_id        text not null,
  inventory_item_id text not null,
  title             text not null
);

create table if not exists active_variant_holds (
  variant_id      text primary key,
  reservation_id uuid not null references reservations(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index if not exists idx_reservations_status_confirm_by
  on reservations(status, confirm_by);

create index if not exists idx_reservations_status_pickup_at
  on reservations(status, pickup_at);

create index if not exists idx_reservations_phone_created_at
  on reservations(phone, created_at desc);

create index if not exists idx_reservation_items_variant
  on reservation_items(variant_id);

create index if not exists idx_active_variant_holds_reservation
  on active_variant_holds(reservation_id);

create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reservations_touch_updated_at on reservations;
create trigger reservations_touch_updated_at
before update on reservations
for each row execute function touch_updated_at();
