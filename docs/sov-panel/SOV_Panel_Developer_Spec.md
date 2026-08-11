# SOV Frontend Panel: Developer Build Guide

Purpose: this document lists every data point and interaction the panel needs, page by page. Use it as the build checklist. Backend note: all fields must map to actual Supabase tables/fields already in the SOV pipeline. Do not build a UI element until the underlying data source is confirmed.

---

## Page 1: Category Overview Dashboard

**Header**
- Last updated (Views data): date + time
- Last updated (Ranking/Frequency data): date + time
(These are two separate refresh jobs, keep as two separate fields, not one combined timestamp.)

**Top-level metric cards**
- Total keywords tracked
- Total videos extracted
- Total viewership (all extracted videos)
- Unique videos count
- Total viewership of unique videos
- Total unique channels (all-time, across all extracted data)
- Most ranking channel (channel with highest cumulative ranking frequency, see Open Question 6)
- New videos extracted in last 7-day update
- Untagged videos count (extracted videos not mapped to any brand)

**Top 5 lists**
- Top 5 brands by viewership
- Top 5 brands by frequency

**Growth snapshot**
- Growth rate: 24h / 7d / 30d (definition to be locked, see Open Question 1)

---

## Page 2: Top Videos Leaderboard

Toggle: Top by Views | Top by Frequency

Table columns: rank, thumbnail, title, channel, brand tag, views, frequency, date extracted

Pagination: 20 rows per page, page navigation 1 to 5, showing top 100 total

---

## Page 3: Brand Growth Leaderboard

Toggle: By viewership growth | By frequency growth
Time filter: 24h / 7d / 30d

Table columns: brand name, current value, % growth, rank movement

---

## Page 4: Brand-wise SOV Trend Graph

- Brand selector dropdown
- Time range toggle: Daily / Monthly / 3-Month / 6-Month / 1-Year
- Line graph: SOV share over selected time range

---

## Page 5: Category Keyword-wise SOV (Interactive Graph)

Two filters, cross-applied together:
- Language: Overall / Tamil / Telugu / Malayalam
- Keyword type: Overall / Generic / Branded

Graph updates dynamically based on the combination selected (e.g. Telugu + Branded shows only that slice).

---

## Page 6: All Brands Overview

- Pie chart 1: share of viewership by brand
- Pie chart 2: share of frequency by brand
- Brand list below both charts, each name clickable, routes to Page 7 for that brand

---

## Page 7: Individual Brand Detail Page

Opens on clicking a brand name from Page 6.

- Number of videos
- Number of unique videos
- Total viewership of total videos
- Total viewership of unique videos
- Growth rate by viewership
- Growth rate by frequency
- Top videos for the brand (table)
- Top keywords for the brand (table)
- Top language for the brand
- Growing market/region for the brand (highest viewership region, flagged as data dependency, see Open Question 3)

---

## Page 8: Dropped Rankings

Videos that were ranking in the previous week and are not ranking in the current week.

Table columns: video title, channel, brand, keyword it was ranking on, last seen rank, last seen date

---

## Page 9: Multi-Keyword Ranking Videos

Filter: minimum keyword count (dropdown: 5+ / 10+ / 15+, not a fixed hardcoded number, see Open Question 4)

Table columns: video title, description, channel, brand, number of keywords ranked on, list of keywords

Summary block: auto-extracted common terms/phrases across the title and description of these videos, explaining why they rank broadly. This needs a text extraction step, not just a display layer (see Open Question 5).

---

## Open Questions to Lock Before Dev Starts

1. **Growth rate definition**: growth of raw view count, or growth of SOV share? Same definition must apply consistently on Pages 1, 3, and 7. Pick one and document it.
2. **Two last-updated timestamps**: confirm these map to two separate n8n/cron jobs (views refresh vs ranking refresh). If they run on the same job, one timestamp is enough.
3. **Region tracking for "growing market" (Page 7)**: confirm geo-level data already exists in the schema. If not, this is a new data pipeline requirement, not just a UI element, and should be scoped separately.
4. **Multi-keyword threshold (Page 9)**: build as a filter dropdown, not a fixed number. Avoids a code change every time the threshold needs to shift.
5. **Common terminology summary (Page 9)**: requires a keyword/phrase extraction step on title + description text. Can likely reuse the existing Gemini transcript analysis pipeline rather than building a new NLP layer.
6. **"Most ranking channel" (Page 1)**: confirm definition, channel with the most videos ranking, or channel with the highest cumulative frequency count across all its videos. These can produce different answers.
