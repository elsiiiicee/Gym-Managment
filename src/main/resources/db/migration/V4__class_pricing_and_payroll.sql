-- V4: per-class drop-in pricing + trainer per-class fee + payout ledger.
-- Strictly additive; existing rows get safe defaults.

-- Drop-in price for a class. Members with an active subscription book free;
-- everyone else gets debited from their wallet for this amount.
alter table gym_classes
    add column price_cents bigint not null default 0;

alter table gym_classes
    add constraint ck_class_price_nonneg check (price_cents >= 0);

-- What the gym pays this trainer for each class they teach.
alter table trainers
    add column fee_per_class_cents bigint not null default 0;

alter table trainers
    add constraint ck_trainer_fee_nonneg check (fee_per_class_cents >= 0);

-- Payout ledger. Each row records the admin paying a trainer a specific
-- amount on a specific date for the classes they've taught up to that point.
-- Earnings are computed on-the-fly from gym_classes.fee_per_class_cents *
-- count(class_bookings where status=BOOKED ... ) at query time, but the
-- *paid* portion lives here.
create table trainer_payouts (
    id uuid primary key,
    trainer_id uuid not null references trainers(id) on delete cascade,
    admin_user_id uuid not null references app_users(id),
    amount_cents bigint not null,
    notes varchar(500),
    idempotency_key varchar(120) not null,
    created_at timestamp with time zone not null,
    constraint uk_trainer_payout_idempotency unique (trainer_id, idempotency_key),
    constraint ck_payout_amount_positive check (amount_cents > 0)
);

create index idx_trainer_payouts_trainer_created
    on trainer_payouts(trainer_id, created_at desc);
