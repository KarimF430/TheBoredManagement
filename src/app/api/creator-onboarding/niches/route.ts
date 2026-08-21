import { NextResponse } from 'next/server'
import { getNicheTaxonomy } from '@/lib/creator-onboarding'
import { NICHE_CLUSTERS } from '@/lib/creator-onboarding-taxonomy'

interface NicheItem {
  id: string
  niche_name: string
  icon: string | null
  sub_niches: string[]
  content_types: string[]
  display_order: number
  category: string
}

interface CategoryGroup {
  category: string
  niches: NicheItem[]
}

export async function GET() {
  try {
    const niches = await getNicheTaxonomy()

    // Group niches by category (legacy support)
    const categoryMap = new Map<string, NicheItem[]>()
    for (const niche of niches) {
      const cat = (niche as any).category || 'Other'
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, [])
      }
      categoryMap.get(cat)!.push({
        id: niche.id,
        niche_name: niche.niche_name,
        icon: niche.icon,
        sub_niches: niche.sub_niches,
        content_types: niche.content_types,
        display_order: niche.display_order,
        category: cat,
      })
    }

    const categories: CategoryGroup[] = Array.from(categoryMap.entries())
      .map(([category, items]) => ({
        category,
        niches: items.sort((a, b) => a.display_order - b.display_order),
      }))

    return NextResponse.json({
      niches,
      categories,
      // New: 6-cluster taxonomy (used by NicheSelector two-tap flow)
      clusters: NICHE_CLUSTERS,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
