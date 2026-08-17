-- ============================================================================
-- OUTREACH CAMPAIGNS
-- Groups of creators targeted with a specific template in a single batch.
-- ============================================================================

create table if not exists outreach_campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    template_id uuid references outreach_templates(id) on delete set null,
    status text not null default 'draft' check (status in ('draft', 'queued', 'sending', 'completed', 'paused', 'cancelled')),
    creator_ids uuid[] not null default '{}',
    total_creators int not null default 0,
    queued_count int not null default 0,
    sent_count int not null default 0,
    delivered_count int not null default 0,
    replied_count int not null default 0,
    bounced_count int not null default 0,
    failed_count int not null default 0,
    settings jsonb not null default '{}',
    launched_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Add campaign_id to send_queue
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where table_name = 'outreach_send_queue' and column_name = 'campaign_id'
    ) then
        alter table outreach_send_queue add column campaign_id uuid references outreach_campaigns(id) on delete set null;
    end if;
end $$;

-- Indexes
create index if not exists idx_campaigns_status on outreach_campaigns(status);
create index if not exists idx_campaigns_created on outreach_campaigns(created_at desc);
create index if not exists idx_queue_campaign on outreach_send_queue(campaign_id);
