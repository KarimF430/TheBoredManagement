-- ============================================================================
-- MATERIALIZED VIEWS FOR DASHBOARD
-- Pre-aggregated rollups so the dashboard NEVER hits raw outreach_log at scale.
-- Refreshed by the monitor worker daily (or on-demand).
--
-- CRITICAL: All views use CONCURRENTLY refresh to avoid locking the view
-- while the dashboard is reading it. This requires a UNIQUE INDEX on each view.
-- ============================================================================

-- Daily funnel rollup (sent → delivered → replied)
create materialized view if not exists mv_outreach_daily_funnel as
select
    date(sent_at) as day,
    count(*) as sent,
    count(*) filter (where delivered_at is not null) as delivered,
    count(*) filter (where replied_at is not null and reply_is_auto = false) as replied,
    count(*) filter (where bounced) as bounced,
    count(*) filter (where complaint) as complained,
    count(*) filter (where unsubscribed) as unsubscribed
from outreach_log
group by date(sent_at)
order by day desc;

create unique index if not exists idx_mv_outreach_daily_funnel_day on mv_outreach_daily_funnel(day);

-- Classification breakdown rollup
create materialized view if not exists mv_outreach_classification_summary as
select
    category,
    count(*) as total,
    count(*) filter (where confidence >= 0.7) as high_confidence,
    count(*) filter (where needs_review) as needs_review,
    avg(confidence) as avg_confidence
from outreach_reply_classifications
group by category;

create unique index if not exists idx_mv_outreach_classification_category on mv_outreach_classification_summary(category);

-- Mailbox health snapshot (latest day only)
create materialized view if not exists mv_outreach_mailbox_health as
select
    m.id as mailbox_id,
    m.email,
    m.status,
    m.provider,
    m.warmup_stage,
    m.daily_cap,
    m.sent_today,
    mhd.stat_date,
    mhd.sent_count,
    mhd.bounce_count,
    mhd.complaint_count,
    mhd.reply_count,
    mhd.bounce_rate,
    mhd.complaint_rate,
    mhd.reply_rate,
    mhd.health_score
from outreach_mailboxes m
left join outreach_mailbox_health_daily mhd on mhd.mailbox_id = m.id
  and mhd.stat_date = (select max(stat_date) from outreach_mailbox_health_daily where mailbox_id = m.id);

create unique index if not exists idx_mv_outreach_mailbox_health_id on mv_outreach_mailbox_health(mailbox_id);

-- Domain health snapshot (latest postmaster data)
create materialized view if not exists mv_outreach_domain_health as
select
    sd.id as domain_id,
    sd.domain,
    sd.tier,
    sd.status,
    sd.spf_status,
    sd.dkim_status,
    sd.dmarc_status,
    pm.metric_date,
    pm.spam_rate,
    pm.spf_success_ratio,
    pm.dkim_success_ratio,
    pm.dmarc_success_ratio
from outreach_sending_domains sd
left join outreach_postmaster_metrics pm on pm.domain_id = sd.id
  and pm.metric_date = (select max(metric_date) from outreach_postmaster_metrics where domain_id = sd.id);

create unique index if not exists idx_mv_outreach_domain_health_id on mv_outreach_domain_health(domain_id);

-- Queue backlog summary
create materialized view if not exists mv_outreach_queue_backlog as
select
    status,
    tier,
    count(*) as count,
    min(scheduled_for) as oldest_scheduled,
    max(created_at) as newest_queued
from outreach_send_queue
group by status, tier;

create unique index if not exists idx_mv_outreach_queue_backlog on mv_outreach_queue_backlog(status, tier);

-- Follow-up performance by stage
create materialized view if not exists mv_outreach_followup_performance as
select
    stage,
    count(*) as total_enqueued,
    count(*) filter (where status = 'sent') as sent,
    count(*) filter (where status = 'failed') as failed,
    count(*) filter (where status = 'suppressed') as suppressed
from outreach_send_queue
where stage like 'followup_%'
group by stage;

create unique index if not exists idx_mv_outreach_followup_stage on mv_outreach_followup_performance(stage);

-- Refresh function — uses CONCURRENTLY to avoid locking the view during refresh.
-- Requires unique indexes on each view (created above).
create or replace function refresh_outreach_dashboard_views() returns void as $$
begin
    refresh materialized view concurrently mv_outreach_daily_funnel;
    refresh materialized view concurrently mv_outreach_classification_summary;
    refresh materialized view concurrently mv_outreach_mailbox_health;
    refresh materialized view concurrently mv_outreach_domain_health;
    refresh materialized view concurrently mv_outreach_queue_backlog;
    refresh materialized view concurrently mv_outreach_followup_performance;
end;
$$ language plpgsql;
