# Requirements Document: Dashboard Format Filter and Controls Redesign

## Feature Overview

Enhance the SOV Panel dashboard with three coordinated improvements: (1) format filtering capability to segment video content by duration (Long/Short/All), (2) timestamp displays showing data freshness and collection timing, and (3) a redesigned control panel consolidating all filters and actions into a cohesive interface matching modern dashboard patterns.

## Acceptance Criteria

### 1. Format Filter Dropdown Implementation

**Acceptance Criteria 1.1: Format filter dropdown appears in control panel**
- The format filter dropdown is rendered alongside the existing "All Videos" ownership filter
- Dropdown displays three options: "All", "Long Format", "Short Format"
- Long Format is defined as videos with duration > 60 seconds
- Short Format is defined as videos with duration ≤ 60 seconds
- Default selection is "All"
- Visual styling matches the existing ownership filter dropdown

**Acceptance Criteria 1.2: Format filter selection updates dashboard data**
- When user selects a format option, the dashboard query is updated with the format parameter
- Only videos matching the selected format are included in all dashboard displays
- Charts, tables, and metrics recalculate with filtered video set
- Ownership and time range filters continue to work correctly with format filter

**Acceptance Criteria 1.3: Format filter persists across tab navigation**
- Selected format filter remains active when switching between dashboard tabs (Overview, Videos, Rankings, etc.)
- Format filter state is maintained in React component state, not URL parameters (unless explicitly added)
- Changing tabs does not reset format filter to "All"

**Acceptance Criteria 1.4: Format filter works with query parameters**
- When format filter is not "All", the query parameter `format=long` or `format=short` is included in API requests
- When format filter is "All", format parameter is omitted from API requests
- Changing format filter immediately updates React Query query key to trigger refetch

**Acceptance Criteria 1.5: Format filter handles edge cases**
- If a video has null or undefined duration, it is excluded from both Long and Short format results
- If all videos are excluded by format filter, dashboard displays "No videos match this format" message
- Format filter works correctly with empty video sets

### 2. Timestamp Display Below Project Name

**Acceptance Criteria 2.1: Last views update timestamp displays below project name**
- Timestamp showing last updated time for views data appears below campaign name
- Format shows relative time (e.g., "5 minutes ago", "2 hours ago")
- For updates older than 24 hours, shows absolute date and time (e.g., "Jan 15, 3:45 PM")
- Updates are dynamic and refresh every minute

**Acceptance Criteria 2.2: Weekly collection time displays below project name**
- Timestamp showing scheduled weekly run time appears below campaign name
- Format shows day and time (e.g., "Weekly on Monday 11 PM")
- If no weekly schedule is set, displays "No schedule set"
- This information comes from backend data

**Acceptance Criteria 2.3: Timestamps update when dashboard refreshes**
- When Views Update button is clicked and refresh completes, last updated timestamp immediately updates
- Timestamp updates reflect the current time (not a cached value)
- Weekly run time updates if changed via settings (if applicable)

**Acceptance Criteria 2.4: Stale data indicator (optional enhancement)**
- If data is older than 24 hours, last updated timestamp displays in warning color (orange/amber)
- Icon or visual indicator shows "data may be outdated" state
- User can immediately trigger refresh via "Views Update" button

### 3. Control Panel Redesign

**Acceptance Criteria 3.1: Control panel consolidates all filters and actions**
- All dashboard controls are contained in a single control panel row: format filter, ownership filter, time range buttons, and Views Update button
- Controls are arranged logically left-to-right: filters → time range → action button
- Spacing and alignment are consistent with modern dashboard UI patterns
- Control panel does not wrap to multiple lines on standard desktop width (1280px+)

**Acceptance Criteria 3.2: Time range button styling matches reference design**
- Time range buttons display as: "7d", "14d", "30d" followed by "All" and "Custom" (if applicable)
- Active time range button has blue background (#1A73E8) and white text
- Inactive time range buttons have transparent background and gray text (#64748B)
- Buttons use pill-style border radius (borderRadius: 8)
- Currently, only "7d", "14d", "30d" are functional; "All" and "Custom" are NOT implemented

**Acceptance Criteria 3.3: Views Update button replaces Refresh button**
- Button label changes from "Refresh" to "Views Update"
- Button triggers dashboard.refetch() on click
- While loading, button displays "Updating…" with loading spinner
- Button is disabled during refresh to prevent multiple simultaneous requests
- Styling matches control panel aesthetic

**Acceptance Criteria 3.4: Control panel integrates existing ownership filter**
- Existing "All Videos" / "Our Videos" / "Not Our Videos" dropdown is moved into control panel
- Dropdown functionality and styling remain unchanged
- Dropdown appears after format filter in control panel layout

**Acceptance Criteria 3.5: Control panel styling is consistent with existing UI**
- Background color matches existing filter section (#F8FAFC or transparent)
- Border styling matches existing controls (1px solid #E2E8F0)
- Font sizes and weights match existing button styling
- Spacing between controls is consistent (gap: 12)
- Hover states are implemented for all interactive elements

**Acceptance Criteria 3.6: Control panel maintains responsive behavior**
- On tablet width (768px-1024px), controls maintain single-row layout with possible horizontal scroll
- On mobile width (<768px), controls may wrap to multiple rows or use collapsible layout
- All controls remain accessible and functional on mobile

### 4. Filter Integration and Data Flow

**Acceptance Criteria 4.1: Format filter integrates with React Query**
- Format filter state is included in React Query query key: `['dashboard', campaignId, formatFilter, ownershipFilter]`
- Changing format filter automatically triggers data refetch
- Cache invalidation works correctly (new format = new cache entry)

**Acceptance Criteria 4.2: All dashboard data respects format filter**
- Chart data (brand SOV, creator performance, trends) excludes videos not matching format filter
- Table data (top videos, rankings) respects format filter
- Summary metrics (total views, total videos, etc.) recalculate based on filtered video set
- Rankings and scores recompute based on filtered data

**Acceptance Criteria 4.3: Format filter works independently of other filters**
- Format filter can be applied with any ownership filter selection
- Format filter can be applied with any time range selection
- Combining multiple filters produces correctly filtered results
- Removing one filter does not affect other active filters

**Acceptance Criteria 4.4: API calls include format parameter when applicable**
- When format filter is "long" or "short", API request includes `&format=long` or `&format=short`
- When format filter is "all", format parameter is omitted from API URL
- All dashboard endpoints support the format query parameter

### 5. Loading States and User Feedback

**Acceptance Criteria 5.1: Format filter change shows loading state**
- When format filter is changed, loading indicator appears (spinner or skeleton)
- Data area displays loading state while API request is in flight
- User is prevented from changing format filter again until load completes

**Acceptance Criteria 5.2: Views Update button shows loading feedback**
- During refresh, button displays spinner icon next to "Updating…" text
- Button is disabled and not clickable during refresh
- Button text and icon remain visible so user knows operation is in progress

**Acceptance Criteria 5.3: Error states are handled gracefully**
- If format filter change fails, error message displays (e.g., "Failed to load data")
- If Views Update fails, error message displays
- User can retry by clicking Views Update or changing filters again
- Previous valid data remains visible if error occurs

### 6. Browser and Accessibility

**Acceptance Criteria 6.1: Format filter dropdown is keyboard accessible**
- Format filter dropdown can be opened and navigated with Tab, Arrow Keys, and Enter
- Focus indicator is visible when dropdown has focus
- Screen reader announces dropdown label and selected option

**Acceptance Criteria 6.2: Views Update button is keyboard accessible**
- Views Update button can be activated with Tab and Enter
- Focus indicator is visible when button has focus
- Screen reader announces button label and loading state

**Acceptance Criteria 6.3: Timestamps are readable and informative**
- Timestamp text has sufficient color contrast (WCAG AA compliant)
- Timestamps include title attribute or tooltip explaining the meaning
- Relative time format is clear and unambiguous

**Acceptance Criteria 6.4: Control panel has proper ARIA labels**
- Control panel region has aria-label="Dashboard controls" or similar
- All form controls have associated labels or aria-label attributes
- Status messages (loading, error) have appropriate ARIA live regions

### 7. State Management and Consistency

**Acceptance Criteria 7.1: Format filter state is managed in page component**
- useState hook manages formatFilter state in page.tsx
- Format filter state is passed to control panel component
- Change handler updates formatFilter state and triggers refetch

**Acceptance Criteria 7.2: Dashboard context includes format filter**
- Format filter is added to DashboardCtx context value
- Tabs and child components can access current format filter via context
- Context updates whenever format filter changes

**Acceptance Criteria 7.3: Format filter does not cause prop drilling issues**
- Deep child components access format filter via context, not props
- Props are passed only one level deep where necessary
- Component hierarchy remains clean and maintainable

### 8. Performance Requirements

**Acceptance Criteria 8.1: Format filter changes trigger efficient refetch**
- Changing format filter does not trigger unnecessary re-renders of unrelated components
- React Query cache invalidation is minimal and precise
- API response time for filtered queries is < 2 seconds for typical datasets

**Acceptance Criteria 8.2: Timestamp formatting is performant**
- Timestamp formatting function is memoized or pure
- Relative timestamp calculation does not cause excessive re-renders
- Timestamp update loop (every minute) does not cause performance degradation

**Acceptance Criteria 8.3: Control panel rendering is optimized**
- Control panel does not cause cascading re-renders of child components
- Change handlers are memoized with useCallback
- Format filter dropdown rendering is efficient even with many options

### 9. Data Accuracy

**Acceptance Criteria 9.1: Format filter produces correct video subset**
- Every video in filtered results has duration matching the selected format
- No videos are included that don't match the format criteria
- Videos with null/undefined duration are consistently excluded
- Format filter produces same results on repeated calls with same input

**Acceptance Criteria 9.2: Metrics recalculate correctly with format filter**
- Total video count reflects filtered set, not all videos
- Total views sum reflects only filtered videos
- Creator rankings update based on filtered video set
- Brand metrics recalculate based on filtered data

**Acceptance Criteria 9.3: Charts and tables display format-filtered data**
- Bar charts show only brands/creators from filtered videos
- Line charts show trends based on filtered video views
- Data tables show only rows matching format filter
- No data leakage from non-matching videos

### 10. UI/UX Details

**Acceptance Criteria 10.1: Visual hierarchy is clear**
- Format filter is visually distinct but not dominant
- Control panel appears cohesive as single unit
- Controls are easily scannable from left to right

**Acceptance Criteria 10.2: Interactive elements have clear affordances**
- Buttons and dropdowns appear clickable
- Active states are clearly indicated
- Hover states provide visual feedback

**Acceptance Criteria 10.3: Label text is clear and consistent**
- "Long Format" and "Short Format" labels are consistent throughout UI
- "Views Update" button label is clear and distinct from "Refresh"
- Timestamp labels explain their meaning ("Last updated", "Weekly run")

**Acceptance Criteria 10.4: Spacing and alignment are consistent**
- 12px gap between control panel elements
- Vertical alignment of controls is centered
- Padding and margins match existing dashboard styling

## Non-Functional Requirements

**Performance**: Format filter changes complete within 2 seconds including API request
**Accessibility**: WCAG 2.1 AA compliance for keyboard navigation and screen readers
**Browser Support**: Chrome, Firefox, Safari, Edge (latest 2 versions)
**Bundle Size**: Feature implementation < 15KB gzipped
**Test Coverage**: >85% unit test coverage for filter logic and state management
**Code Quality**: No TypeScript errors, ESLint pass on all new code

## Dependencies and Assumptions

- Backend API supports `format` query parameter on `/api/dashboard` and `/api/dashboard/kpis` endpoints
- Video data includes `duration_seconds` field for all videos
- Backend returns `is_short: boolean` or duration field indicating short vs. long format
- React Query is available and properly configured
- Existing dashboard styling (CSS classes and inline styles) can be extended
- Campaign and video data structures remain unchanged

## Out of Scope

- "All" and "Custom" time range options (not implemented in this phase)
- Keyboard shortcuts for format filter selection
- URL parameter persistence for format filter (not required)
- Video format categories beyond Long/Short (e.g., Medium, Ultra-Short)
- API-side format filtering optimization (backend handles with existing indexes)
- Undo/Redo functionality for filter changes
