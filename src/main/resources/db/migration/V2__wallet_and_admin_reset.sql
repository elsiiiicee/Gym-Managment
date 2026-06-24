-- Credit wallet system (internal-only payment): admins add credits, users spend.
create table wallets (
    id uuid primary key,
    user_id uuid not null unique references app_users(id) on delete cascade,
    balance_cents bigint not null,
    version bigint not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_wallet_balance_nonneg check (balance_cents >= 0)
);

create table wallet_transactions (
    id uuid primary key,
    wallet_id uuid not null references wallets(id) on delete cascade,
    amount_cents bigint not null,
    balance_after_cents bigint not null,
    transaction_type varchar(30) not null,
    created_by_admin_id uuid,
    reference_type varchar(40),
    reference_id uuid,
    notes varchar(500),
    idempotency_key varchar(120) not null,
    created_at timestamp with time zone not null,
    constraint uk_wallet_tx_idempotency unique (wallet_id, idempotency_key),
    constraint ck_wallet_tx_type check (transaction_type in (
        'CREDIT_ADD', 'PURCHASE', 'REFUND', 'MEMBERSHIP_PAYMENT', 'ADMIN_ADJUSTMENT'
    )),
    constraint ck_wallet_tx_balance_nonneg check (balance_after_cents >= 0)
);

create index idx_wallet_tx_wallet_created on wallet_transactions(wallet_id, created_at desc);

-- Admin-driven password reset audit (replaces email-based reset flow).
create table password_reset_audits (
    id uuid primary key,
    target_user_id uuid not null references app_users(id) on delete cascade,
    admin_user_id uuid not null references app_users(id),
    reason varchar(500),
    created_at timestamp with time zone not null
);

create index idx_password_reset_audit_target on password_reset_audits(target_user_id, created_at desc);
