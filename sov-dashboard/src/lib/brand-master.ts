/**
 * The Amazon India brand master, bundled at build time.
 *
 * This is a STATIC import on purpose. Reading the JSON with fs.readFileSync at
 * runtime works locally but is invisible to Next's dependency tracer, so the file
 * is not guaranteed to be included in a serverless bundle — on Vercel the brand
 * list would silently come back empty and every brand/channel match would degrade.
 * A static import makes the data part of the bundle, and removes the "whole
 * project was traced unintentionally" warning that dynamic fs access produces.
 *
 * Regenerate the JSON from the CSV with: npm run build:gazetteer
 */
import gazetteerData from '../../data/brand-gazetteer.json'

export interface BrandMasterEntry {
  canonical: string
  aliases: string[]
  category: string
  subCategory: string
  parentBrand?: string
}

const entries = (gazetteerData as { brands: BrandMasterEntry[] }).brands ?? []

/** Every brand in the master, canonical brands before sub-brands. */
export const BRAND_MASTER: BrandMasterEntry[] = [...entries].sort((a, b) => {
  if (!a.parentBrand && b.parentBrand) return -1
  if (a.parentBrand && !b.parentBrand) return 1
  return 0
})

/** Canonical names only — never aliases. */
export const BRAND_MASTER_NAMES: string[] = Array.from(
  new Set(BRAND_MASTER.map(b => (b.canonical ?? '').trim()).filter(n => n.length >= 2))
)
