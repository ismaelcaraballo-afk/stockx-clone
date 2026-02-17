import { readdirSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../client/public')
const outputDir = join(__dirname, '../client/src/data')

const BRAND_FOLDERS = ['ALL', 'NIKE', 'ADIDAS', 'NEWBALANCE']
const BRAND_LABELS = { ALL: 'All', NIKE: 'Nike', ADIDAS: 'Adidas', NEWBALANCE: 'New Balance' }

function filenameToName(filename) {
  return filename
    .replace(/\.(avif|jpg|jpeg|png|webp)$/i, '')
    .replace(/[-_]/g, ' ')
    .replace(/Product$/i, '')
    .trim()
}

function srcToSlug(src) {
  return src.replace(/^\//, '').replace(/\.(avif|jpg|jpeg|png|webp)$/i, '').replace(/\//g, '---')
}

// Ensure output dir exists
try {
  readdirSync(outputDir)
} catch {
  const { mkdirSync } = await import('fs')
  mkdirSync(outputDir, { recursive: true })
}

// === SHOES ===
const shoesDir = join(publicDir, 'Shoes')
const shoesManifest = {}

for (const folder of BRAND_FOLDERS) {
  const folderPath = join(shoesDir, folder)
  try {
    const files = readdirSync(folderPath)
      .filter((f) => /\.(avif|jpg|jpeg|png|webp)$/i.test(f))
      .map((f) => {
        const src = `/Shoes/${folder}/${f}`
        return { src, name: filenameToName(f), brand: BRAND_LABELS[folder] || folder, slug: srcToSlug(src) }
      })
    shoesManifest[folder] = files
  } catch (err) {
    shoesManifest[folder] = []
  }
}

writeFileSync(join(outputDir, 'shoes.json'), JSON.stringify(shoesManifest, null, 2), 'utf8')
const publicDataDir = join(publicDir, 'data')
try { readdirSync(publicDataDir) } catch { const { mkdirSync } = await import('fs'); mkdirSync(publicDataDir, { recursive: true }) }
const shoesFlat = Object.values(shoesManifest).flat()
writeFileSync(join(publicDataDir, 'shoes.json'), JSON.stringify(shoesFlat, null, 2), 'utf8')
console.log('Generated shoes.json:', Object.keys(shoesManifest).map((k) => `${k}: ${shoesManifest[k].length}`).join(', '))

// === CLOTHING ===
const clothingDir = join(publicDir, 'Clothing')
const clothingItems = []

if (existsSync(clothingDir)) {
  const entries = readdirSync(clothingDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPath = join(clothingDir, entry.name)
      const files = readdirSync(subPath)
        .filter((f) => /\.(avif|jpg|jpeg|png|webp)$/i.test(f))
        .map((f) => {
          const src = `/Clothing/${entry.name}/${f}`
          return { src, name: filenameToName(f), brand: entry.name, slug: srcToSlug(src) }
        })
      clothingItems.push(...files)
    } else if (/\.(avif|jpg|jpeg|png|webp)$/i.test(entry.name)) {
      const src = `/Clothing/${entry.name}`
      clothingItems.push({ src, name: filenameToName(entry.name), brand: 'Clothing', slug: srcToSlug(src) })
    }
  }
}

writeFileSync(join(outputDir, 'clothing.json'), JSON.stringify(clothingItems, null, 2), 'utf8')
writeFileSync(join(publicDataDir, 'clothing.json'), JSON.stringify(clothingItems, null, 2), 'utf8')
console.log('Generated clothing.json:', clothingItems.length, 'items')
