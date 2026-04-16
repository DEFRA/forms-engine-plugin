import { cp, glob, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, relative, sep } from 'node:path'

/**
 * Copies `src` to `.src`, removes test files (which reference `~/test/...`
 * fixtures that are not shipped) and resolves `~/src/...` path aliases to
 * relative paths. This is needed because the `src` directory is shipped in
 * the npm package and consumers cannot resolve the `~` alias.
 */

// Copy src to .src
await cp('src', '.src', { recursive: true })

// Remove test files from the shipped source. Test files reference
// `~/test/...` fixtures that live outside `src` and are not shipped, so
// leaving them in would result in unresolvable imports for consumers.
for await (const testEntry of glob('.src/**/*.test.{ts,js,cjs,mjs}')) {
  await rm(testEntry)
}

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
