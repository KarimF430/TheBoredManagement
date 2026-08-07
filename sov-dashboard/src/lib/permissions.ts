/**
 * Project-level role permissions.
 *
 * Maps each role to the pages/features it can access.
 * Owner can override per-member via page_permissions JSONB column.
 */

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type Feature =
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

export const ALL_FEATURES: Feature[] = [
  'overview', 'leaderboard', 'brand-growth', 'sov-trend', 'keyword-sov',
  'all-brands', 'dropped', 'multi-keyword', 'calendar', 'brands-products',
  'add-edit-keywords', 'add-edit-brands',
  'campaign-control', 'manage-access',
  'api-keys', 'settings', 'delete-project', 'backup',
]

export const FEATURE_LABELS: Record<Feature, string> = {
  'overview': 'Overview Dashboard',
  'leaderboard': 'Top Videos / Leaderboard',
  'brand-growth': 'Brand Growth',
  'sov-trend': 'SOV Trend',
  'keyword-sov': 'Keyword SOV',
  'all-brands': 'All Brands',
  'dropped': 'Dropped Rankings',
  'multi-keyword': 'Multi-Keyword',
  'calendar': 'Calendar',
  'brands-products': 'Brands & Products',
  'add-edit-keywords': 'Add / Edit Keywords',
  'add-edit-brands': 'Add / Edit Brands',
  'campaign-control': 'Campaign Control Center',
  'manage-access': 'Manage Project Access',
  'api-keys': 'Manage API Keys',
  'settings': 'Settings & Alerts',
  'delete-project': 'Delete Project',
  'backup': 'Backup & Sync',
}

const ROLE_PERMISSIONS: Record<ProjectRole, Feature[]> = {
  owner: ALL_FEATURES,
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

/**
 * Check if a role has access to a feature, with optional per-member overrides.
 *
 * @param overrides  JSONB page_permissions from project_members.
 *                   { "feature": true } = grant, { "feature": false } = revoke.
 *                   null = use role defaults only.
 */
export function canAccess(
  role: ProjectRole | null | undefined,
  feature: Feature,
  overrides?: Record<string, boolean> | null
): boolean {
  if (!role) return false

  // Owner always has everything — overrides can't restrict owner
  if (role === 'owner') return true

  // If overrides exist for this feature, use them
  if (overrides && feature in overrides) {
    return overrides[feature]
  }

  // Fall back to role defaults
  return ROLE_PERMISSIONS[role]?.includes(feature) ?? false
}

export function canAccessHref(
  role: ProjectRole | null | undefined,
  href: string,
  overrides?: Record<string, boolean> | null
): boolean {
  const feature = HREF_FEATURE[href]
  if (!feature) return true
  return canAccess(role, feature, overrides)
}

export function getVisibleNavItems(
  items: { href: string; label: string; dot: string }[],
  role: ProjectRole | null | undefined,
  overrides?: Record<string, boolean> | null
) {
  return items.filter(item => canAccessHref(role, item.href, overrides))
}
