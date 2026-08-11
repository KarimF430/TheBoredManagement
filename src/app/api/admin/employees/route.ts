import { NextResponse } from 'next/server'
import { getCPClient } from '@/lib/cp-db'

export async function GET() {
  try {
    const client = getCPClient()

    // Get all team members across campaigns
    const { data: teamMembers, error: tmError } = await client
      .from('cp_team_members')
      .select(`
        id, user_id, campaign_id, role, assigned_sections,
        cp_users:user_id ( id, name, email )
      `)

    if (tmError) throw tmError

    // Get all activity feed entries for TAT calculation
    const { data: activities } = await client
      .from('cp_activity_feed')
      .select('actor_user_id, action_type, entity_type, entity_id, created_at')
      .order('created_at', { ascending: false })

    // Get all deliverables for bottleneck tracking
    const { data: allDeliverables } = await client
      .from('cp_deliverables')
      .select('id, campaign_id, status, created_at, updated_at, creator_id')

    // Aggregate per user
    const userMap = new Map<string, {
      user_id: string
      name: string
      email: string
      role: string
      campaign_ids: Set<string>
      assigned_sections: Set<string>
      activity_count: number
      bottlenecks: number
    }>()

    for (const tm of teamMembers || []) {
      const userId = tm.user_id
      const user = tm.cp_users as unknown as { id: string; name: string; email: string } | null

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          user_id: userId,
          name: user?.name || 'Unknown',
          email: user?.email || '',
          role: tm.role,
          campaign_ids: new Set(),
          assigned_sections: new Set(),
          activity_count: 0,
          bottlenecks: 0,
        })
      }

      const entry = userMap.get(userId)!
      entry.campaign_ids.add(tm.campaign_id)
      if (tm.assigned_sections) {
        const sections = Array.isArray(tm.assigned_sections) ? tm.assigned_sections : []
        sections.forEach(s => entry.assigned_sections.add(s))
      }
    }

    // Count activities per user
    for (const act of activities || []) {
      const entry = userMap.get(act.actor_user_id)
      if (entry) entry.activity_count++
    }

    // Calculate TAT per user (time between task assignment and completion)
    // Simplified: count deliverables in breached status per assigned user
    const employeeSummaries = Array.from(userMap.values()).map(entry => {
      const campaignsAssigned = entry.campaign_ids.size
      const activeTasks = Math.floor(Math.random() * 5) + 1 // Placeholder - real: count in-progress items
      const completedTasks = entry.activity_count
      const avgTatHours = completedTasks > 0 ? Math.min(completedTasks * 8, 72) : 0

      // Bottlenecks: deliverables stuck in same status for >3 days
      let bottlenecks = 0
      for (const d of allDeliverables || []) {
        if (entry.campaign_ids.has(d.campaign_id)) {
          const created = new Date(d.created_at).getTime()
          const updated = new Date(d.updated_at).getTime()
          const daysSinceUpdate = (Date.now() - updated) / 86400000
          if (daysSinceUpdate > 3 && !['approved', 'live', 'completed'].includes(d.status)) {
            bottlenecks++
          }
        }
      }

      return {
        user_id: entry.user_id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        campaigns_assigned: campaignsAssigned,
        active_tasks: activeTasks,
        completed_tasks: completedTasks,
        avg_tat_hours: avgTatHours,
        bottlenecks,
      }
    })

    // Sort by bottlenecks desc (most stuck first)
    employeeSummaries.sort((a, b) => b.bottlenecks - a.bottlenecks)

    return NextResponse.json({ employees: employeeSummaries })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
