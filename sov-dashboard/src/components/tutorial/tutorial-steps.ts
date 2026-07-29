'use client'

export interface TutorialStep {
  id: string
  target: string
  title: string
  tip: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  tab?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'campaign-selector',
    target: '[data-tutorial="campaign-selector"]',
    title: 'Switch Campaigns',
    tip: 'Change the active campaign to view different product lines or markets.',
    placement: 'bottom',
  },
  {
    id: 'filter-bar',
    target: '[data-tutorial="filter-bar"]',
    title: 'Filters',
    tip: 'Narrow data by format, ownership, date range, or language. Filters apply across all tabs.',
    placement: 'bottom',
  },
  {
    id: 'overview-tab',
    target: '[data-tab="overview"]',
    title: 'Overview',
    tip: 'KPIs, brand SOV chart, top videos, and daily trend — your campaign pulse.',
    placement: 'bottom',
    tab: 'overview',
  },
  {
    id: 'brands-tab',
    target: '[data-tab="brands"]',
    title: 'Brand SOV',
    tip: 'Compare brand visibility and SOV percentages across tracked keywords.',
    placement: 'bottom',
    tab: 'brands',
  },
  {
    id: 'creators-tab',
    target: '[data-tab="creators"]',
    title: 'Creators',
    tip: 'Top channels by views — see who covers your brands and their format mix.',
    placement: 'bottom',
    tab: 'creators',
  },
  {
    id: 'rankings-tab',
    target: '[data-tab="rankings"]',
    title: 'Rankings',
    tip: 'Track search rank positions for each keyword. Higher rank = more visibility.',
    placement: 'bottom',
    tab: 'rankings',
  },
  {
    id: 'videos-tab',
    target: '[data-tab="videos"]',
    title: 'Videos',
    tip: 'Full video leaderboard sorted by views. Click any row for details.',
    placement: 'bottom',
    tab: 'videos',
  },
  {
    id: 'keywords-tab',
    target: '[data-tab="keywords"]',
    title: 'Keywords',
    tip: 'SOV breakdown per keyword — spot opportunities and competition gaps.',
    placement: 'bottom',
    tab: 'keywords',
  },
  {
    id: 'trends-tab',
    target: '[data-tab="trends"]',
    title: 'Trends',
    tip: 'Daily SOV trends over time. Correlate spikes with campaign activity.',
    placement: 'bottom',
    tab: 'trends',
  },
  {
    id: 'growth-tab',
    target: '[data-tab="growth"]',
    title: 'Growth',
    tip: 'Compare two periods to measure brand momentum — who gained, who lost.',
    placement: 'bottom',
    tab: 'growth',
  },
  {
    id: 'views-update',
    target: '[data-tutorial="views-update"]',
    title: 'Refresh Views',
    tip: 'Pull latest view counts from YouTube. Use before reports or meetings.',
    placement: 'bottom',
  },
  {
    id: 'sidebar-nav',
    target: '[data-tutorial="sidebar-nav"]',
    title: 'Sidebar',
    tip: 'Quick-access pages: Brand Growth, SOV Trend, Keyword SOV, and more.',
    placement: 'right',
  },
  {
    id: 'complete',
    target: '',
    title: 'All Set!',
    tip: 'You know the essentials. Hit the "i" button anytime to replay.',
    placement: 'bottom',
  },
]
