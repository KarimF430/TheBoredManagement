# GO-LIVE RUNBOOK — Prove the Loop

**Owner:** TheBoredMonkey engineering
**Status:** Pre-flight
**Goal:** Turn the machine on small, produce three real numbers (reply rate, completion rate, data-trust %), and decide whether to scale, fix the form, or change the channel.

---

## PREREQUISITES

Before touching any of these steps, confirm:

1. **Supabase** — all migrations (018–022) applied, tables exist
2. **Environment** — `.env.local` has all required vars (see `.env.cp.example`)
3. **Gmail OAuth** — at least one mailbox authorized (or SES credentials configured)
4. **Legal** — Step 0 cleared (see below)

---

## STEP 0 — Legal Pre-Flight

**This is a hard gate. Do not send a single email until this is cleared.**

### What needs review

The Instagram data was gathered by cookie-rotated GraphQL scraping (against Instagram's ToS), and you intend to cold-email individuals whose emails were harvested without prior consent. Under India's DPDP Act, personal data collected and used for marketing without a lawful basis is exposed.

### What to decide

1. **Lawful basis** — legitimate interest? consent? Is there a difference for B2B creator marketing under DPDP?
2. **Notice/consent posture** — does the cold email itself constitute sufficient notice? Do you need a privacy policy link in the email?
3. **EU/UK creators** — any creators in the pilot who are EU/UK residents need GDPR-level handling (stronger than DPDP)
4. **Unsubscribe** — confirm it's working end-to-end (tested in Step 1)

### Minimum in-product safeguards (verify before send)

- [ ] Every email has a working one-click unsubscribe (List-Unsubscribe header)
- [ ] Suppression is honored instantly and permanently (unsubscribe → suppressed → never emailed again)
- [ ] The email states who you are and why you're contacting them
- [ ] A creator can opt out without filling anything (GET /api/outreach/unsubscribe?email=X)

### How to verify

```bash
# Test unsubscribe endpoint
curl "http://localhost:3000/api/outreach/unsubscribe?email=test@verify.com"
# Should return "You have been unsubscribed."

# Verify it's in suppressions
curl "http://localhost:3000/api/outreach/smoke-test?check=suppressions"
# Should pass
```

---

## STEP 1 — Technical Smoke Test

**Goal:** Prove the machine can physically send and receive before any human is involved.

### 1.1 Run the smoke test

```bash
curl "http://localhost:3000/api/outreach/smoke-test"
```

Every check should pass. If any fail, fix that specific component before continuing.

Expected output:
```json
{
  "summary": "12/12 passed",
  "passed": 12,
  "failed": 0,
  "results": [...]
}
```

### 1.2 Verify critical fixes

**Provider logging bug** (was: `mailboxId ? 'ses' : 'gmail'`):
```bash
curl "http://localhost:3000/api/outreach/smoke-test?check=provider_log"
# Must return: "provider reads from mailbox row (bug fixed)"
```

**List-Unsubscribe on Gmail** (was: missing):
```bash
curl "http://localhost:3000/api/outreach/smoke-test?check=mime"
# Must return: "List-Unsubscribe=true, List-Unsubscribe-Post=true"
```

### 1.3 Send test emails

You need:
- One Gmail mailbox authorized
- One SES domain configured (or skip if not using SES)
- Three test inboxes you control (Gmail, Yahoo, Outlook)

**Option A: Manual send via API**

Create a test campaign entry and enqueue one email to each test inbox:

```bash
# Enqueue a test email to your Gmail inbox
curl -X POST "http://localhost:3000/api/outreach/enqueue" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OUTREACH_ENQUEUE_API_KEY" \
  -d '{
    "items": [{
      "creator_id": null,
      "recipient_email": "your-gmail-inbox@gmail.com",
      "tier": "tier1",
      "stage": "opener",
      "template_id": null,
      "subject": "Smoke test from TheBoredMonkey",
      "body_text": "This is a technical smoke test. If you received this, the plumbing works. You can ignore this email.",
      "priority": 100000
    }]
  }'
```

Then trigger the processor:
```bash
curl "http://localhost:3000/api/outreach/cron/processor?batch=1"
```

**What to verify:**
1. `outreach_log` has the row with correct `provider` field (gmail or ses)
2. The email lands in inbox (not spam/Promotions)
3. The email has `List-Unsubscribe` header (check email headers)

### 1.4 Test reply capture

Reply to one of the test emails from the test inbox.

Wait for the reply-capture cycle (runs every 5 min), or trigger manually:
```bash
curl "http://localhost:3000/api/outreach/cron/reply-capture"
```

Then trigger classification:
```bash
curl "http://localhost:3000/api/outreach/cron/reply-classifier"
```

**Verify:**
1. `outreach_replies` has a row with `provider_msg_id` matching the Gmail message ID
2. `outreach_log.replied_at` is set on the original send
3. `outreach_reply_classifications` has a row with category and confidence

### 1.5 Run all workers once

```bash
# Processor
curl "http://localhost:3000/api/outreach/cron/processor?batch=1"

# Reply capture
curl "http://localhost:3000/api/outreach/cron/reply-capture"

# Reply classifier
curl "http://localhost:3000/api/outreach/cron/reply-classifier"

# Ramp governor
curl "http://localhost:3000/api/outreach/cron/ramp-governor"

# Monitor (daily — force run)
curl "http://localhost:3000/api/outreach/cron/monitor"
```

All should return `{ "ok": true }` or result objects without errors.

### 1.6 Verify ramp state

```bash
curl "http://localhost:3000/api/outreach/smoke-test?check=ramp"
```

Must show `budget=200` (starting point, not 2500).

### Gate: Step 1 complete when

- [ ] All 12 smoke tests pass
- [ ] Test email sends from both providers (Gmail + SES)
- [ ] Email lands in inbox, not spam
- [ ] List-Unsubscribe header present on both providers
- [ ] Reply is captured and classified
- [ ] Every worker runs without error
- [ ] Ramp budget starts at 200

---

## STEP 2 — One Real Profile, End-to-End

**Goal:** Prove the integration join works on ONE creator you control.

### 2.1 Create test profile

```bash
curl -X POST "http://localhost:3000/api/outreach/e2e-test" \
  -H "Content-Type: application/json" \
  -d '{
    "creatorEmail": "your-test-email@gmail.com",
    "creatorName": "Your Test Name",
    "creatorHandle": "@your_test_handle"
  }'
```

This creates an onboarding session, fills all 6 steps with realistic data, completes it, and writes `raw_signals`.

### 2.2 Run E2E checks

```bash
curl "http://localhost:3000/api/outreach/e2e-test"
```

Every check should pass.

### 2.3 Verify each link in the chain

**Identity resolution:**
```bash
curl "http://localhost:3000/api/outreach/e2e-test?check=identity_resolve"
```
Must show `orphans=0` and `onboarding_linked≥1`.

**Raw signals contract:**
```bash
curl "http://localhost:3000/api/outreach/e2e-test?check=raw_signals"
```
Must show a non-generic `specificity_hook` and valid `metrics.provenance`.

**Verified metrics:**
```bash
curl "http://localhost:3000/api/outreach/e2e-test?check=verified_metrics"
```
If YouTube channel is real, `provenance=verified`. Tier must NOT be based on self-reported numbers.

**Personalizer output:**
```bash
curl "http://localhost:3000/api/outreach/e2e-test?check=personalizer"
```
Read the `concreteDetails` — if 0, the personalizer has nothing to work with. Fix `raw_signals` before proceeding.

### 2.4 Manually verify the personalizer produces a specific email

Create a test template and run personalization:

```bash
# Create a test template
curl -X POST "http://localhost:3000/api/outreach/templates" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Smoke Test Opener",
    "stage": "opener",
    "tier": "tier1",
    "subject": "Collab opportunity for {{name}}",
    "body_text": "Hey {{name}}, I came across your content and loved your recent video about {{specific_topic}}. We are working with creators in the {{niche}} space and think you would be a great fit. Would you be open to a quick chat about a paid collaboration? Here is our intake form: {{form_url}}"
  }'
```

Then, in your code or via the campaign launch endpoint, run the personalizer against the test creator and **read the output email**.

**The critical question:** Does the email reference something specific about this creator's actual content, or is it a generic "Hey {name}, love your content!"?

If generic → the `raw_signals` → personalizer read is broken. Fix before proceeding.

### Gate: Step 2 complete when

- [ ] `outreach_creators` row linked (no orphan `cp_creator_pool` row)
- [ ] `raw_signals` populated with full contract
- [ ] `specificity_hook` is specific (not generic)
- [ ] Verified metrics tagged correctly, tier not from self-reported
- [ ] Personalizer produces genuinely specific email
- [ ] Zero manual steps needed

---

## STEP 3 — Ten Warm Creators

**Goal:** Find the breaks cheaply on 10 people who will forgive issues.

### 3.1 Choose 10 warm creators

These should be people you or TBM already have a relationship with. Their reply/completion won't be representative — that's fine. This is for break-finding, not statistics.

### 3.2 Create a small campaign

```bash
# Create campaign
curl -X POST "http://localhost:3000/api/outreach/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "warm-10-smoke",
    "template_id": "YOUR_TEMPLATE_ID",
    "status": "draft"
  }'
```

### 3.3 Enqueue and send

```bash
# Enqueue the 10 creators
curl -X POST "http://localhost:3000/api/outreach/enqueue" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_OUTREACH_ENQUEUE_API_KEY" \
  -d '{
    "items": [
      { "creator_id": "...", "recipient_email": "creator1@gmail.com", "tier": "tier1", "stage": "opener", "template_id": "...", "subject": "...", "body_text": "..." },
      ...
    ]
  }'

# Let processor send (or trigger manually)
curl "http://localhost:3000/api/outreach/cron/processor?batch=10"
```

### 3.4 Watch the full loop for each

For each of the 10 creators, verify:

1. **Delivered** — `outreach_log` row exists with `provider_message_id`
2. **Opened** — if tracking enabled, or wait for reply
3. **Clicked** — onboarding link visited
4. **OTP** — email received, code verified
5. **Form completed** — all 6 screens filled, `status=completed`
6. **raw_signals written** — `outreach_creators.raw_signals` populated
7. **Next email personalized** — run personalizer, verify specificity

### 3.5 Log every break

| Creator | Deliver? | Open? | OTP? | Form? | raw_signals? | Personalized? | Break |
|---------|----------|-------|------|-------|--------------|---------------|-------|
| 1 | | | | | | | |
| 2 | | | | | | | |
| ... | | | | | | | |

Fix breaks as found. Re-run until all 10 flow clean.

### Gate: Step 3 complete when

- [ ] All 10 warm creators flow end-to-end
- [ ] No silent failures (worker didn't fire, data lost, etc.)
- [ ] Every break found is fixed and re-verified

---

## STEP 4 — The 500 Pilot

**Goal:** Get the real numbers on cold creators.

### 4.1 Select pilot cohort

```bash
curl -X POST "http://localhost:3000/api/creator-onboarding/pilot" \
  -H "Content-Type: application/json" \
  -d '{ "action": "select", "batchName": "pilot-500" }'
```

This selects the top-500 ranked creators from `outreach_creator_scores`.

### 4.2 Launch campaign

```bash
# Create campaign
curl -X POST "http://localhost:3000/api/outreach/campaigns" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pilot-500",
    "template_id": "YOUR_OPENER_TEMPLATE_ID",
    "target_count": 500,
    "status": "draft"
  }'

# Launch (enqueues all 500 with personalized emails)
curl -X POST "http://localhost:3000/api/outreach/campaigns/YOUR_CAMPAIGN_ID/launch" \
  -H "Content-Type: application/json"
```

### 4.3 Let it run

- Do NOT override the ramp governor
- Do NOT manually increase send volume
- Let follow-ups run on normal cadence (3-day gaps)
- Monitor daily

### 4.4 Watch the three headline numbers

```bash
curl "http://localhost:3000/api/creator-onboarding/analytics?batch=pilot-500"
```

Response:
```json
{
  "headline": {
    "replyRate": 0.0234,
    "replyRateFormatted": "2.34%",
    "creatorsEmailed": 500,
    "realReplies": 12,
    "completionRate": 0.32,
    "completionRateFormatted": "32.00%",
    "openedSessions": 45,
    "completedSessions": 14,
    "dataTrustRate": 0.71,
    "dataTrustRateFormatted": "71.00%",
    "verifiedProfiles": 10
  },
  "goNogo": {
    "status": "go",
    "reason": "All metrics within acceptable range"
  }
}
```

### 4.5 Watch per-step drop-off

The `stepDropoff` array shows which of the 6 screens loses people:

```json
"stepDropoff": [
  { "step": 1, "completed": 45 },
  { "step": 2, "completed": 42 },
  { "step": 3, "completed": 38 },
  { "step": 4, "completed": 35 },
  { "step": 5, "completed": 20 },
  { "step": 6, "completed": 14 }
]
```

If step 5 (willingness) drops from 35→20, that screen is the problem.

### 4.6 Watch personalizer health

```bash
curl "http://localhost:3000/api/outreach/summary"
```

Check `today.sent` vs the fallback rate in personalizer logs. If >15% fallback, the emails are generic — fix before scaling.

---

## STEP 5 — Read the Numbers and Decide

### Go / No-Go Table

| Signal | Healthy | Stop | Action |
|--------|---------|------|--------|
| Reply rate ≥ 2% | ✅ Go | — | Scale with ramp governor |
| Reply rate 1-2% | ⚠️ Hold | — | Investigate targeting/message |
| Reply rate < 1% (on 50+) | — | 🛑 Stop | Fix message/targeting, or change channel |
| Completion rate ≥ 30% | ✅ Go | — | Form works |
| Completion rate 15-30% | ⚠️ Hold | — | Simplify form |
| Completion rate < 15% (on 20+) | — | 🛑 Stop | Form too long/unclear |
| Data-trust ≥ 70% | ✅ Good | — | Verified metrics flowing |
| Data-trust < 50% | ⚠️ Low | — | More YouTube OAuth, less self-report |

### Decision matrix

| Reply | Completion | Decision |
|-------|------------|----------|
| ✅ | ✅ | **SCALE.** Let ramp climb 6-8 weeks. Build deferred backlog. |
| ✅ | ❌ | **FIX FORM.** Email works, onboarding doesn't. Do not touch targeting. |
| ❌ | ✅ | **FIX MESSAGE.** Infrastructure works, content doesn't convert. |
| ❌ | ❌ | **CHANGE CHANNEL.** Cold email may not work for this creator segment. Try DMs, warm intros. |

### Whatever the numbers say

A "stop" result is the pilot working, not the project failing. 500 cold emails cost almost nothing. The information is worth far more than the cost of finding out.

---

## STEP 6 — Deferred Backlog (ONLY after Step 5 is green)

Do not build any of these before the pilot produces healthy numbers:

1. **YouTube discovery + enrichment** via official Data API (cleaner, more defensible than scraping)
2. **Correction loop** (performance overrides self-declared niche)
3. **Language/vernacular layer**
4. **Internal search/shortlist UI**
5. **Real seed-placement testing**

---

## Quick Reference — All Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/outreach/smoke-test` | GET | 12-point plumbing check |
| `/api/outreach/e2e-test` | GET/POST | Full loop validation on one profile |
| `/api/outreach/cron/processor` | GET | Send queued emails |
| `/api/outreach/cron/reply-capture` | GET | Pull new replies |
| `/api/outreach/cron/reply-classifier` | GET | Classify pending replies |
| `/api/outreach/cron/ramp-governor` | GET | Evaluate + advance/cut budget |
| `/api/outreach/cron/monitor` | GET | Daily health + counter reset |
| `/api/outreach/summary` | GET | Real-time dashboard tiles |
| `/api/outreach/health` | GET | Mailbox + domain health |
| `/api/outreach/unsubscribe` | GET/POST | One-click unsubscribe |
| `/api/creator-onboarding/analytics` | GET | Three headline numbers |
| `/api/creator-onboarding/pilot` | POST | Select/status/gate_check |
| `/api/outreach/enqueue` | POST | Enqueue recipients to send queue |
| `/api/outreach/campaigns` | GET/POST | Campaign CRUD |
| `/api/outreach/campaigns/:id/launch` | POST | Launch campaign |
