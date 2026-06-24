create table app_users (
    id uuid primary key,
    email varchar(320) not null unique,
    password_hash varchar(100) not null,
    full_name varchar(120) not null,
    role varchar(20) not null,
    active boolean not null,
    email_verified boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_app_users_role check (role in ('USER', 'TRAINER', 'ADMIN'))
);

create table profiles (
    id uuid primary key,
    user_id uuid not null unique references app_users(id) on delete cascade,
    display_name varchar(120) not null,
    phone varchar(40),
    avatar_path varchar(500),
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create table refresh_tokens (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamp with time zone not null,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone not null
);

create table account_tokens (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    type varchar(40) not null,
    token_hash varchar(64) not null unique,
    expires_at timestamp with time zone not null,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone not null,
    constraint ck_account_token_type check (type in ('EMAIL_VERIFICATION', 'PASSWORD_RESET'))
);

create table notifications (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    type varchar(60) not null,
    message varchar(500) not null,
    read_at timestamp with time zone,
    created_at timestamp with time zone not null
);

create table mail_outbox_messages (
    id uuid primary key,
    recipient varchar(320) not null,
    subject varchar(200) not null,
    body varchar(4000) not null,
    sent_at timestamp with time zone,
    created_at timestamp with time zone not null
);

create table products (
    id uuid primary key,
    sku varchar(80) not null unique,
    name varchar(160) not null,
    description varchar(1000) not null,
    price_cents bigint not null,
    stock_quantity integer not null,
    active boolean not null,
    version bigint not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_products_price check (price_cents > 0),
    constraint ck_products_stock check (stock_quantity >= 0)
);

create table cart_items (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    product_id uuid not null references products(id),
    quantity integer not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint uk_cart_user_product unique (user_id, product_id),
    constraint ck_cart_quantity check (quantity > 0)
);

create table customer_orders (
    id uuid primary key,
    user_id uuid not null references app_users(id),
    status varchar(30) not null,
    subtotal_cents bigint not null,
    tax_cents bigint not null,
    shipping_cents bigint not null,
    total_cents bigint not null,
    idempotency_key varchar(120) not null,
    created_at timestamp with time zone not null,
    constraint uk_order_user_idempotency unique (user_id, idempotency_key),
    constraint ck_order_status check (status in ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED')),
    constraint ck_order_totals check (subtotal_cents >= 0 and tax_cents >= 0 and shipping_cents >= 0 and total_cents >= 0)
);

create table order_items (
    id uuid primary key,
    order_id uuid not null references customer_orders(id) on delete cascade,
    product_id uuid not null references products(id),
    sku varchar(80) not null,
    product_name varchar(160) not null,
    unit_price_cents bigint not null,
    quantity integer not null,
    constraint ck_order_items_quantity check (quantity > 0),
    constraint ck_order_items_price check (unit_price_cents > 0)
);

create table payments (
    id uuid primary key,
    order_id uuid not null unique references customer_orders(id) on delete cascade,
    provider varchar(40) not null,
    amount_cents bigint not null,
    status varchar(30) not null,
    idempotency_key varchar(120) not null,
    created_at timestamp with time zone not null,
    constraint ck_payment_amount check (amount_cents >= 0),
    constraint ck_payment_status check (status in ('REQUIRES_ACTION', 'COMPLETED', 'FAILED', 'REFUNDED'))
);

create table trainers (
    id uuid primary key,
    user_id uuid unique references app_users(id) on delete set null,
    name varchar(120) not null,
    specialty varchar(120) not null,
    bio varchar(1000) not null,
    active boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null
);

create table membership_plans (
    id uuid primary key,
    name varchar(120) not null unique,
    description varchar(1000) not null,
    price_cents bigint not null,
    billing_period_months integer not null,
    active boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_plan_price check (price_cents > 0),
    constraint ck_plan_months check (billing_period_months between 1 and 24)
);

create table user_subscriptions (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    plan_id uuid not null references membership_plans(id),
    status varchar(30) not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    canceled_at timestamp with time zone,
    idempotency_key varchar(120) not null,
    created_at timestamp with time zone not null,
    constraint uk_subscription_user_idempotency unique (user_id, idempotency_key),
    constraint ck_subscription_status check (status in ('ACTIVE', 'CANCELED', 'EXPIRED')),
    constraint ck_subscription_dates check (starts_at < ends_at)
);

create table gym_classes (
    id uuid primary key,
    trainer_id uuid not null references trainers(id),
    title varchar(160) not null,
    description varchar(1000) not null,
    starts_at timestamp with time zone not null,
    ends_at timestamp with time zone not null,
    capacity integer not null,
    active boolean not null,
    created_at timestamp with time zone not null,
    updated_at timestamp with time zone not null,
    constraint ck_class_dates check (starts_at < ends_at),
    constraint ck_class_capacity check (capacity > 0)
);

create table class_bookings (
    id uuid primary key,
    user_id uuid not null references app_users(id) on delete cascade,
    class_id uuid not null references gym_classes(id) on delete cascade,
    status varchar(30) not null,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone not null,
    constraint uk_booking_user_class unique (user_id, class_id),
    constraint ck_booking_status check (status in ('BOOKED', 'CANCELED'))
);

create index idx_refresh_tokens_user on refresh_tokens(user_id);
create index idx_account_tokens_user_type on account_tokens(user_id, type);
create index idx_notifications_user_created on notifications(user_id, created_at desc);
create index idx_mail_outbox_unsent on mail_outbox_messages(sent_at, created_at);
create index idx_products_active_name on products(active, name);
create index idx_orders_user_created on customer_orders(user_id, created_at desc);
create index idx_subscriptions_user_status_ends on user_subscriptions(user_id, status, ends_at);
create index idx_classes_active_starts on gym_classes(active, starts_at);
create index idx_bookings_user_status on class_bookings(user_id, status);
create index idx_bookings_class_status on class_bookings(class_id, status);
