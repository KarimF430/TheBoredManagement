/**
 * Project-level role permissions.
 *
 * Maps each role to the pages/features it can access.
 * Used by Sidebar, Settings, and Control Center to show/hide UI elements.
 */

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

type Feature =
  | 'overview'
  | 'leaderboard'
  | 'brand-growth'
  | 'sov-trend'
  | 'keyword-sov'
  | 'all-brands'
  | 'dropped'
  | 'multi-keyword'
  | 'calendar'
  | 'brands-products'
  | 'add-edit-keywords'
  | 'add-edit-brands'
  | 'campaign-control'
  | 'manage-access'
  | 'api-keys'
  | 'settings'
  | 'delete-project'
  | 'backup'

const ROLE_PERMISSIONS: Record<ProjectRole, Feature[]> = {
  owner: [
    'overview', 'leaderboard', 'brand-growth', 'sov-trend', 'keyword-sov',
    'all-brands', 'dropped', 'multi-keyword', 'calendar', 'brands-products',
    'add-edit-keywords', 'add-edit-brands',
    'campaign-control', 'manage-access',
    'api-keys', 'settings', 'delete-project', 'backup',
  ],
  admin: [
    'overview', 'leaderboard', 'brand-growth', 'sov-trend', 'keyword-sov',
    'all-brands', 'dropped', 'multi-keyword', 'calendar', 'brands-products',
    'add-edit-keywords', 'add-edit-brands',
    'campaign-control', 'manage-access',
  ],
  editor: [
    'overview', 'leaderboard', 'brand-growth', 'sov-trend', 'keyword-sov',
    'all-brands', 'dropped', 'multi-keyword', 'calendar', 'brands-products',
    'add-edit-keywords', 'add-edit-brands',
  ],
  viewer: [
    'overview', 'leaderboard', 'brand-growth', 'sov-trend', 'keyword-sov',
    'all-brands', 'dropped', 'multi-keyword', 'calendar', 'brands-products',
  ],
}

const HREF_FEATURE: Record<string, Feature> = {
  '/':                 'overview',
  '/leaderboard':      'leaderboard',
  '/brand-growth':     'brand-growth',
  '/sov-trend':        'sov-trend',
  '/keyword-sov':      'keyword-sov',
  '/keywords':         'add-edit-keywords',
  '/brands':           'all-brands',
  '/dropped':          'dropped',
  '/multi-keyword':    'multi-keyword',
  '/analytic-calendar': 'calendar',
  '/brands-products':  'brands-products',
  '/control':          'campaign-control',
  '/settings':         'settings',
}

export function canAccess(role: ProjectRole | null | undefined, feature: Feature): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(feature) ?? false
}

export function canAccessHref(role: ProjectRole | null | undefined, href: string): boolean {
  const feature = HREF_FEATURE[href]
  if (!feature) return true
  return canAccess(role, feature)
}

export function getVisibleNavItems(
  items: { href: string; label: string; dot: string }[],
  role: ProjectRole | null | undefined
) {
  return items.filter(item => canAccessHref(role, item.href))
}
