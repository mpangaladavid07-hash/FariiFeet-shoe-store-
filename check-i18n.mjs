import fs from 'node:fs'
import path from 'node:path'

const file = fs.readFileSync('src/lib/i18n.jsx', 'utf8').replace(/\r\n/g, '\n')
const enStart = file.indexOf('const en = {') + 'const en = '.length
const swStart = file.indexOf('const sw = {') + 'const sw = '.length
const enSrc = file.slice(enStart, file.lastIndexOf('\n}', swStart) + 2)
const swSrc = file.slice(swStart, file.indexOf('\n}\n\nconst dictionaries', swStart) + 2)

const en = new Function(`return (${enSrc})`)()
const sw = new Function(`return (${swSrc})`)()

const flatten = (obj, prefix = '', out = {}) => {
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object') flatten(value, next, out)
    else out[next] = value
  }
  return out
}

const enFlat = flatten(en)
const swFlat = flatten(sw)

const missingSw = Object.keys(enFlat).filter((key) => !(key in swFlat))
const extraSw = Object.keys(swFlat).filter((key) => !(key in enFlat))

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return /\.jsx?$/.test(entry.name) ? [full] : []
  })

const used = new Set()
for (const target of walk('src')) {
  const source = fs.readFileSync(target, 'utf8')
  const regex = /\btranslate\(\s*'[a-z]+'\s*,\s*'([^']+)'|\bt\(\s*'([^']+)'/g
  let match
  while ((match = regex.exec(source))) used.add(match[1] || match[2])
}

const missingUsed = [...used].filter((key) => !(key in enFlat)).sort()

console.log('EN keys:', Object.keys(enFlat).length, '| SW keys:', Object.keys(swFlat).length)
console.log('Missing in SW:', missingSw)
console.log('Extra in SW:', extraSw)
console.log('Used but missing in EN:', missingUsed)
