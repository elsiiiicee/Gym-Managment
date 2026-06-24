-- V3: fields the admin UI needs that V1/V2 don't have.
-- Strict additive changes; nothing renamed or removed.

-- Membership plans: features list (one row per feature in a side table to
-- stay DB-portable; H2 and Postgres both handle this without arrays/JSON).
-- `feature_index` (not `position`) because `position` is a reserved word
-- in standard SQL and a built-in function in Postgres.
create table membership_plan_features (
    plan_id uuid not null references membership_plans(id) on delete cascade,
    feature_index integer not null,
    feature varchar(200) not null,
    primary key (plan_id, feature_index)
);

alter table membership_plans
    add column popular boolean not null default false;

-- Gym classes: free-text category (HIIT, Yoga, Strength, etc).
-- Default empty string keeps existing rows valid.
alter table gym_classes
    add column category varchar(60) not null default '';

-- Trainers: optional rating (0.0 - 5.0). Null = not yet rated.
alter table trainers
    add column rating numeric(2, 1);

create index idx_plan_features_plan on membership_plan_features(plan_id);
