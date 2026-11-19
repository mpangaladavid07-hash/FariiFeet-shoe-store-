// Dev-only sanity check: parse every JSX source file with two independent
// parsers (esbuild + @babel/parser) and report unbalanced/malformed JSX.
//   node jsx-check.mjs        (or: npm run check:jsx)
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { transformSync } from 'esbuild'
import { parse } from '@babel/parser'

const files = readdirSync('src', { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.jsx'))
  .map((entry) => join(entry.parentPath ?? entry.path, entry.name))

files.push('lightbox-preview.jsx')

let failed = 0
for (const file of files) {
  const code = readFileSync(file, 'utf8')
  const problems = []

  try {
    transformSync(code, { loader: 'jsx', jsx: 'automatic' })
  } catch (error) {
    for (const err of error.errors || []) {
      problems.push(`esbuild: ${err.text} @ ${err.location?.line}:${err.location?.column}`)
    }
  }

  try {
    parse(code, { sourceType: 'module', plugins: ['jsx'] })
  } catch (error) {
    problems.push(`babel: ${error.message}`)
  }

  if (problems.length) {
    failed += 1
    console.log(`FAIL  ${file}`)
    for (const problem of problems) console.log(`      ${problem}`)
  } else {
    console.log(`OK    ${file}`)
  }
}

console.log(`\n${files.length - failed}/${files.length} files parsed`)
process.exit(failed ? 1 : 0)
