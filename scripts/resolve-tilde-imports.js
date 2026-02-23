import { cp, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, sep } from 'node:path'
import { glob } from 'node:fs/promises'

/**
 * Copies `src` to `.src` and resolves `~/src/...` path aliases to relative
 * paths. This is needed because the `src` directory is shipped in the npm
 * package and consumers cannot resolve the `~` alias.
 */

// Copy src to .src
await cp('src', '.src', { recursive: true })

for await (const entry of glob('.src/**/*.{ts,js}')) {
  const content = await readFile(entry, 'utf-8')

  // Match from '~/src/...' and from "~/src/..."
  if (!content.includes("'~/") && !content.includes('"~/')) {
    continue
  }

  const updated = content.replace(
    /(from\s+['"])~\/src\/(.*?)(['"])/g,
    (match, prefix, importPath, suffix) => {
      // .src mirrors src, so resolve relative to .src
      const fileDir = dirname(entry)
      const targetPath = `.src/${importPath}`
      let relativePath = relative(fileDir, targetPath)

      // Ensure it starts with ./ or ../
      if (!relativePath.startsWith('.')) {
        relativePath = `./${relativePath}`
      }

      // Normalise path separators for Windows compatibility
      relativePath = relativePath.split(sep).join('/')

      return `${prefix}${relativePath}${suffix}`
    }
  )

  if (updated !== content) {
    await writeFile(entry, updated)
  }
}
