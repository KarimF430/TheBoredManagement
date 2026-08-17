-- ============================================================================
-- OUTREACH SYSTEM SCHEMA
-- Smart creator outreach pipeline tables.
-- All tables use outreach_ prefix to avoid collisions with existing tables.
-- ============================================================================

-- Sending domains
create table if not exists outreach_sending_domains (
    id uuid primary key default gen_random_uuid(),
    domain text not null unique,
    tier text not null check (tier in ('tier1', 'tier2')),
    is_bulk_sender boolean not null default false,
    spf_status text default 'unknown',
    dkim_status text default 'unknown',
    dmarc_status text default 'unknown',
    status text not null default 'active' check (status in ('active', 'throttled', 'paused')),
    paused_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Mailboxes
create table if not exists outreach_mailboxes (
    id uuid primary key default gen_random_uuid(),
    domain_id uuid references outreach_sending_domains(id) on delete cascade,
    tier text not null check (tier in ('tier1', 'tier2')),
    provider text not null check (provider in ('gmail', 'ses')),
    email text not null unique,
    display_name text,
    warmup_stage int not null default 0,
    daily_cap int not null default 10,
    sent_today int not null default 0,
    status text not null default 'active' check (status in ('active', 'throttled', 'paused')),
    paused_reason text,
    oauth_token_ref text,
    reply_to_email text,
    gmail_history_id text,
    last_reset_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Suppressions
create table if not exists outreach_suppressions (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    reason text not null check (reason in ('hard_bounce', 'complaint', 'unsubscribe', 'manual', 'invalid')),
    source text,
    created_at timestamptz not null default now()
);

-- Validations
create table if not exists outreach_validations (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    syntax_valid boolean not null,
    mx_found boolean not null,
    is_valid boolean not null,
    checked_at timestamptz not null default now()
);

-- Templates
create table if not exists outreach_templates (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    tier text not null check (tier in ('tier1', 'tier2')),
    stage text not null,
    subject text not null,
    body_text text not null,
    body_html text,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Send queue
create table if not exists outreach_send_queue (
    id uuid primary key default gen_random_uuid(),
    dedupe_key text not null unique,
    creator_id uuid,
    recipient_email text not null,
    tier text not null check (tier in ('tier1', 'tier2')),
    stage text not null,
    template_id uuid,
    subject text not null,
    body_text text not null,
    body_html text,
    priority int not null default 0,
    status text not null default 'queued' check (status in ('queued', 'claimed', 'sending', 'sent', 'failed', 'suppressed', 'invalid')),
    attempts int not null default 0,
    last_error text,
    mailbox_id uuid,
    claimed_at timestamptz,
    claimed_by text,
    scheduled_for timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Outreach log
create table if not exists outreach_log (
    id uuid primary key default gen_random_uuid(),
    queue_id uuid references outreach_send_queue(id),
    mailbox_id uuid references outreach_mailboxes(id),
    tier text not null,
    stage text not null,
    provider text not null,
    creator_id uuid,
    recipient_email text not null,
    subject text,
    provider_message_id text,
    rfc_message_id text,
    thread_id text,
    sent_at timestamptz,
    delivered_at timestamptz,
    replied_at timestamptz,
    reply_is_auto boolean default false,
    form_filled boolean default false,
    form_filled_at timestamptz,
    bounced boolean default false,
    bounce_type text,
    bounce_reason text,
    complaint boolean default false,
    unsubscribed boolean default false,
    created_at timestamptz not null default now()
);

-- Creators
create table if not exists outreach_creators (
    id uuid primary key default gen_random_uuid(),
    external_id text,
    email text not null unique,
    name text,
    niche text,
    size_tier text,
    jurisdiction text,
    source text,
    raw_signals jsonb,
    created_at timestamptz not null default now()
);

-- Creator scores
create table if not exists outreach_creator_scores (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid not null references outreach_creators(id) on delete cascade unique,
    fit_score numeric(6,3) not null default 0,
    reply_likelihood_score numeric(6,3) not null default 0,
    rank bigint,
    scored_at timestamptz not null default now()
);

-- Contactability
create table if not exists outreach_contactability (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid references outreach_creators(id) on delete cascade,
    email text not null unique,
    total_sent int not null default 0,
    total_replies int not null default 0,
    total_bounces int not null default 0,
    total_form_fills int not null default 0,
    last_contacted_at timestamptz,
    last_reply_at timestamptz,
    contactability_score numeric(6,3) not null default 0,
    cadence_tier text not null default 'normal' check (cadence_tier in ('fast', 'normal', 'slow', 'drop')),
    updated_at timestamptz not null default now()
);

-- Replies
create table if not exists outreach_replies (
    id uuid primary key default gen_random_uuid(),
    outreach_log_id uuid references outreach_log(id),
    creator_id uuid references outreach_creators(id),
    from_email text not null,
    subject text,
    body_text text,
    received_at timestamptz not null default now(),
    rfc_in_reply_to text,
    provider_msg_id text,
    raw_headers jsonb,
    is_auto boolean not null default false,
    classified boolean not null default false,
    created_at timestamptz not null default now()
);

create unique index if not exists idx_outreach_replies_provider_msg on outreach_replies(provider_msg_id);

-- Reply classifications
create table if not exists outreach_reply_classifications (
    id uuid primary key default gen_random_uuid(),
    reply_id uuid not null references outreach_replies(id) on delete cascade unique,
    category text not null check (category in ('interested', 'not_interested', 'wrong_person', 'unsubscribe', 'out_of_office', 'question', 'other')),
    confidence numeric(4,3) not null default 0,
    extracted_intent text,
    suggested_action text,
    ooo_return_date date,
    needs_review boolean not null default false,
    model text not null default 'gpt-4o-mini',
    raw_model_output jsonb,
    classified_at timestamptz not null default now()
);

-- Follow-up state
create table if not exists outreach_followup_state (
    id uuid primary key default gen_random_uuid(),
    creator_id uuid not null references outreach_creators(id) on delete cascade unique,
    email text not null,
    first_sent_at timestamptz,
    followups_sent int not null default 0,
    next_followup_due timestamptz,
    status text not null default 'awaiting_reply' check (status in ('awaiting_reply', 'followup_scheduled', 'responded', 'exhausted', 'suppressed')),
    updated_at timestamptz not null default now()
);

-- Ramp state
create table if not exists outreach_ramp_state (
    id uuid primary key default gen_random_uuid(),
    current_step int not null default 0,
    current_daily_budget int not null default 200,
    sent_today_global int not null default 0,
    last_advanced_at timestamptz,
    last_gate_result jsonb,
    updated_at timestamptz not null default now()
);

insert into outreach_ramp_state (current_step, current_daily_budget)
select 0, 200
where not exists (select 1 from outreach_ramp_state);

-- Postmaster metrics
create table if not exists outreach_postmaster_metrics (
    id uuid primary key default gen_random_uuid(),
    domain_id uuid not null references outreach_sending_domains(id) on delete cascade,
    metric_date date not null,
    spam_rate numeric(6,4),
    spf_success_ratio numeric(6,4),
    dkim_success_ratio numeric(6,4),
    dmarc_success_ratio numeric(6,4),
    compliance_status jsonb,
    raw_response jsonb,
    created_at timestamptz not null default now(),
    unique(domain_id, metric_date)
);

-- Mailbox health daily
create table if not exists outreach_mailbox_health_daily (
    id uuid primary key default gen_random_uuid(),
    mailbox_id uuid not null references outreach_mailboxes(id) on delete cascade,
    stat_date date not null,
    sent_count int not null default 0,
    bounce_count int not null default 0,
    complaint_count int not null default 0,
    reply_count int not null default 0,
    bounce_rate numeric(6,4),
    complaint_rate numeric(6,4),
    reply_rate numeric(6,4),
    health_score numeric(6,3),
    action_taken text,
    created_at timestamptz not null default now(),
    unique(mailbox_id, stat_date)
);

-- Alerts
create table if not exists outreach_alerts (
    id uuid primary key default gen_random_uuid(),
    severity text not null check (severity in ('info', 'warning', 'critical')),
    scope text,
    mailbox_id uuid references outreach_mailboxes(id),
    domain_id uuid references outreach_sending_domains(id),
    message text not null,
    sent_via_whatsapp boolean not null default false,
    acknowledged boolean not null default false,
    resolved_at timestamptz,
    created_at timestamptz not null default now()
);

-- Seed accounts
create table if not exists outreach_seed_accounts (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    provider text not null,
    label text,
    active boolean not null default true,
    created_at timestamptz not null default now()
);

-- Seed test results
create table if not exists outreach_seed_test_results (
    id uuid primary key default gen_random_uuid(),
    seed_account_id uuid not null references outreach_seed_accounts(id),
    outreach_log_id uuid references outreach_log(id),
    placement text,
    detected_at timestamptz not null default now(),
    raw_data jsonb,
    created_at timestamptz not null default now()
);
