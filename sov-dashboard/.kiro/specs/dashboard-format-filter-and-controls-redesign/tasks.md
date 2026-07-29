# Tasks: Dashboard Format Filter and Controls Redesign

## Task List

### Phase 1: Data Layer and State Management

- [x] 1.1 Create FormatFilter type and constants
  - Create TypeScript types for `FormatFilter = 'all' | 'long' | 'short'`
  - Export constants for format options with labels and descriptions
  - Add format to existing filter types and state management
  
- [x] 1.2 Add format filter state to page component
  - Add `useState<FormatFilter>` hook in page.tsx
  - Initialize with default value 'all'
  - Create onChange handler that updates state
  - Add to dependency arrays where needed

- [x] 1.3 Update React Query query key with format filter
  - Modify `dashboardQuery` queryKey to include formatFilter
  - Ensure query key includes: `['dashboard', activeCampaignId, formatFilter, ownershipFilter]`
  - Verify cache invalidation occurs when format changes
  - Add type safety to query key

- [x] 1.4 Update API calls to include format parameter
  - Modify fetch URL in dashboardQuery.queryFn to include `&format=${formatFilter}` when format !== 'all'
  - Ensure both `/api/dashboard/kpis` and `/api/dashboard` include format parameter
  - Build query string dynamically based on non-'all' filters

### Phase 2: Components - Format Filter

- [x] 2.1 Create FormatFilter component
  - Create new file: `src/components/FormatFilter.tsx`
  - Implement dropdown UI matching existing "All Videos" dropdown styling
  - Accept props: `value: FormatFilter`, `onChange: (format: FormatFilter) => void`
  - Render three options: "All", "Long Format", "Short Format"
  - Apply styling from existing `.select-filter` CSS class

- [x] 2.2 Add format filter to control panel layout
  - Place FormatFilter component in header/control panel area
  - Position before ownership filter in left-to-right layout
  - Apply 12px gap between format filter and ownership filter
  - Verify styling is consistent with adjacent controls

- [x] 2.3 Connect FormatFilter component to page state
  - Pass `value={formatFilter}` prop to FormatFilter
  - Pass `onChange={setFormatFilter}` handler to FormatFilter
  - Test that selecting a format triggers state update
  - Verify React Query refetch is triggered

### Phase 3: Components - Header and Timestamps

- [x] 3.1 Create TimestampDisplay component
  - Create new file: `src/components/TimestampDisplay.tsx`
  - Accept props: `lastUpdate: Date | null`, `weeklySchedule: Date | null`, `isStale: boolean`
  - Implement relative time formatting (e.g., "5 minutes ago")
  - Show absolute date/time for updates older than 24 hours
  - Apply inline styling consistent with existing text (color: '#94A3B8', fontSize: 12)

- [x] 3.2 Implement time update loop for timestamps
  - Use `setInterval` to update relative timestamps every minute
  - Clean up interval on component unmount with `useEffect` return
  - Prevent unnecessary re-renders with useMemo for formatted timestamps
  - Consider performance impact of frequent updates

- [x] 3.3 Add timestamps below project name in header
  - Integrate TimestampDisplay component into header section
  - Display: "Last updated: {relative time}"
  - Display: "Weekly run: {day time}" or "No schedule set"
  - Position below campaign name and stats line
  - Use existing color scheme for text (#94A3B8 for secondary text)

- [x] 3.4 Add stale data styling (optional)
  - If data > 24 hours old, apply warning color to timestamp
  - Add small warning icon or indicator
  - Ensure stale indicator is not distracting to users

### Phase 4: Components - Control Panel Restructuring

- [x] 4.1 Refactor header layout for control panel
  - Identify current header structure in page.tsx
  - Create horizontal control panel container
  - Group: FormatFilter, OwnershipFilter (ownership filter), TimeRangeButtons, ViewsUpdateButton
  - Apply consistent spacing (gap: 12) and alignment

- [x] 4.2 Migrate time range buttons to control panel
  - Move existing time range button logic into control panel
  - Maintain current styling: active button = blue background
  - Ensure time range selection works correctly
  - Keep buttons as inline button group (background: '#F8FAFC')

- [x] 4.3 Move ownership filter to control panel
  - Move existing `<select>` element for ownership filter into control panel
  - Keep existing styling and functionality
  - Verify onChange handler still works
  - Maintain responsive positioning

- [x] 4.4 Rename and update Refresh button to Views Update button
  - Change button text from "Refresh" to "Views Update"
  - Maintain loading spinner animation
  - Keep disabled state during refresh
  - Update button styling to match control panel aesthetic
  - Keep existing onClick handler that calls `dashboardQuery.refetch()`

### Phase 5: Integration and Testing

- [~] 5.1 Test format filter with dashboard data
  - Verify format filter changes trigger API requests
  - Verify filtered data appears in all charts and tables
  - Test with each format option (all, long, short)
  - Verify metrics (views, counts) recalculate correctly

- [~] 5.2 Test filter combinations
  - Test format filter + ownership filter together
  - Test format filter + time range together
  - Test all three filters combined
  - Verify each filter works independently

- [~] 5.3 Test control panel layout
  - Verify controls appear in correct order
  - Verify spacing and alignment are consistent
  - Test on desktop (1280px+), tablet (768px-1024px), mobile (<768px)
  - Verify no overflow or wrapping issues

- [~] 5.4 Test loading and error states
  - Verify loading spinner shows during format filter change
  - Verify Views Update button shows loading state
  - Verify error message displays if API call fails
  - Verify user can retry on error

- [~] 5.5 Test accessibility
  - Test keyboard navigation (Tab, Arrow Keys, Enter)
  - Test screen reader with format filter dropdown
  - Verify focus indicators are visible
  - Test Views Update button accessibility
  - Verify ARIA labels are present where needed

### Phase 6: UI/UX Refinement

- [~] 6.1 Fine-tune styling and spacing
  - Verify all controls have consistent padding and margins
  - Verify font sizes and weights match existing UI
  - Check color consistency (#64748B for inactive text, #1A73E8 for active)
  - Ensure border styling is consistent (1px solid #E2E8F0)

- [~] 6.2 Implement hover and focus states
  - Add hover styling to format filter dropdown
  - Add hover styling to ownership filter
  - Add focus outlines (visible focus state)
  - Ensure all interactive elements have clear affordances

- [~] 6.3 Optimize performance
  - Use useCallback for onChange handlers
  - Use useMemo for timestamp formatting
  - Verify no unnecessary re-renders with React DevTools Profiler
  - Check bundle size impact of new components

- [~] 6.4 Documentation and code cleanup
  - Add JSDoc comments to new components
  - Ensure TypeScript types are properly defined
  - Remove any debug console logs
  - Follow existing code style and conventions

### Phase 7: Verification and Deployment

- [~] 7.1 Code review and testing
  - Run ESLint and TypeScript compiler
  - Run existing test suite to verify no regressions
  - Perform manual testing of all acceptance criteria
  - Test with real data if available

- [~] 7.2 Browser testing
  - Test on Chrome (latest)
  - Test on Firefox (latest)
  - Test on Safari (latest)
  - Verify responsiveness on different screen sizes

- [~] 7.3 Backend API verification
  - Verify backend API supports `format` parameter
  - Verify API returns correct filtered data
  - Test with various format values (all, long, short)
  - Verify error handling when invalid format is sent

- [~] 7.4 Deploy and monitor
  - Merge code to main branch
  - Deploy to staging environment
  - Monitor for any runtime errors or issues
  - Verify feature works with production data

## Testing Guidelines

### Unit Tests

**Test location**: `src/components/FormatFilter.test.tsx`, `src/components/TimestampDisplay.test.tsx`, etc.

**Test framework**: Vitest (already configured in project)

**Required tests**:
- FormatFilter renders all three options
- FormatFilter calls onChange with correct value when selected
- FormatFilter applies active styling to selected option
- TimestampDisplay formats recent times correctly
- TimestampDisplay formats old times as absolute date
- Relative time formatting produces expected output
- Query key generation includes all filter values

### Integration Tests

**Test approach**: Test format filter with actual React Query setup

**Required tests**:
- Changing format filter updates query key
- Query key change triggers React Query refetch
- Dashboard data updates when format filter changes
- Filters work together without conflicts

### Manual Testing Checklist

- [~] Format filter dropdown opens and closes correctly
- [~] Selecting a format option updates dashboard
- [~] Charts and tables show only videos matching selected format
- [~] Time range buttons still work correctly
- [~] Ownership filter still works correctly
- [~] Views Update button triggers refresh
- [~] Loading spinner shows during refresh
- [~] Timestamps display and update correctly
- [~] Control panel layout looks correct at different screen sizes
- [~] All interactive elements are keyboard accessible
- [~] Screen reader announces control labels and states

## Acceptance Criteria Map

Each task contributes to one or more acceptance criteria:

- 1.1-1.4: AC 4.1, 4.4 (query integration)
- 2.1-2.3: AC 1.1, 1.2, 1.4 (format filter implementation)
- 3.1-3.4: AC 2.1, 2.2, 2.3, 2.4 (timestamps)
- 4.1-4.4: AC 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 (control panel)
- 5.1-5.5: AC 1.2, 1.3, 4.2, 4.3, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 6.4 (integration)
- 6.1-6.4: AC 3.5, 10.1, 10.2, 10.3, 10.4 (refinement)
- 7.1-7.4: Overall feature quality and reliability

## Risk Mitigation

**Risk**: Format parameter not supported by backend API
- **Mitigation**: Verify with backend team before implementation; implement client-side filtering as fallback

**Risk**: Format filter breaks existing charts or calculations
- **Mitigation**: Test with real data early; verify all metrics recalculate correctly

**Risk**: Performance degradation with format filter
- **Mitigation**: Profile performance with React DevTools; optimize query caching

**Risk**: Accessibility issues with new controls
- **Mitigation**: Test with keyboard and screen reader early; follow existing accessibility patterns

## Estimated Effort

- Phase 1 (Data Layer): 2-3 hours
- Phase 2 (Format Filter Component): 2-3 hours
- Phase 3 (Timestamps): 2-3 hours
- Phase 4 (Control Panel): 2-3 hours
- Phase 5 (Integration & Testing): 3-4 hours
- Phase 6 (UI Refinement): 2-3 hours
- Phase 7 (Verification): 2-3 hours
- **Total**: 15-21 hours

## Success Criteria

- All acceptance criteria are met
- All unit and integration tests pass
- No TypeScript errors or ESLint warnings
- Feature works on Chrome, Firefox, Safari, Edge
- Bundle size impact < 15KB gzipped
- Code review approved
- No performance degradation
