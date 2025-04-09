#!/bin/bash

if sed --version 2>&1 | grep -q GNU; then
  SED_INPLACE=(-i)
else
  SED_INPLACE=(-i "")
fi

# Working directly in the site-src directory
BASE_DIR="."
echo "Working from $(pwd) - processing files in $BASE_DIR"

echo "🔍 Starting comprehensive schema link fixing process..."

# 1. Process all files recursively, with special handling for schema files
find "$BASE_DIR" -type f -name "*.md" | grep -v "node_modules" | while read file; do
  if [[ "$file" == *"/schemas/"* ]]; then
    echo -n "."
  else
    echo "Processing: $file"
  fi

  # === Fix all .md links to match Jekyll's pretty permalinks AND add baseurl ===
  # Examples:
  # [Link Text](some-page.md) becomes [Link Text](/forms-engine-plugin/some-page)
  # [Link Text](some-page.md#section) becomes [Link Text](/forms-engine-plugin/some-page#section)
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^)]+)\.md(#[^)]+)?\)|\[\1\]\(/forms-engine-plugin/\2\3\)|g' "$file"

  # [Link Text](some-page.md) becomes [Link Text](/forms-engine-plugin/some-page)
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^)]+)\.md\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"

  # Fix plain / roots to include baseurl EXCEPT for external https/http links
  # [Link Text](/some-path) becomes [Link Text](/forms-engine-plugin/some-path)
  # [Link Text](https://github.com/...) remains unchanged
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\/(?!https?:\/\/)([^)]+)\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"

  # Fix relative links to be absolute with baseurl
  # [Link Text](./some-path) becomes [Link Text](/forms-engine-plugin/some-path)
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\./([^)]+)\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"

  # === Specific handling for schema files ===
  if [[ "$file" == *"/schemas/"* ]]; then
    if grep -q "^---" "$file" && ! grep -q "parent:" "$file" && [[ "$file" != *"/schemas/index.md" ]]; then
      sed "${SED_INPLACE[@]}" '/^layout:/a\
parent: Schema Reference' "$file"
    fi

    # Make case consistent in existing parent references (Schema Reference -> Schema Reference)
    if grep -q "parent: Schema Reference" "$file"; then
      sed "${SED_INPLACE[@]}" 's/parent: Schema Reference/parent: Schema Reference/g' "$file"
    fi

    # Fix common schema reference patterns
    # This removes .md extensions from schema links and standardizes paths
    # Example: [Component Schema](component-schema.md) → [Component Schema](component-schema)
    # Example: [Form Schema](form-schema) → [Form Schema](form-schema)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-schema[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-schema-[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"

    # This handles schemas with a hyphen in the middle of the name pattern
    # Example: [Page Schema V2](page-schema-v2.md) → [Page Schema V2](page-schema-v2)
    # Example: [Component Schema V2](component-schema-v2) → [Component Schema V2](component-schema-v2)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-properties-[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"

    # Fix references to validation-related schemas
    # Example: [Min Length](min-length.md) → [Min Length](min-length)
    # Example: [Max Schema](max-schema.md) → [Max Schema](max-schema)
    # Example: [Min Future](min-future.md) → [Min Future](min-future)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((min|max)(-length|-schema|-future|-past)?(\.md)?\)/[\1](\2\3)/g' "$file"

    # Handle other schema patterns
    # Example: [Search Options](search-options-schema.md) → [Search Options](search-options-schema)
    # Example: [Query Options Schema V2](query-options-schema-v2.md) → [Query Options Schema V2](query-options-schema-v2)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((search|sorting|query|list)-options-schema(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-options-schema\3)/g' "$file"

    # Fix references to page, form, and component documentation
    # Example: [Page Config](page-config.md) → [Page Config](page-config)
    # Example: [Form Definition](form-definition-v2.md) → [Form Definition](form-definition-v2)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((page|form|component)-([a-zA-Z0-9_-]+)(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-\3\4)/g' "$file"

    # Extra pass for nested property references
    # Example: [Nested Property](nested-property.md) → [Nested Property](nested-property)
    # Example: [Nested Property V2](nested-property-v2.md) → [Nested Property V2](nested-property-v2)
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+)-schema-properties-([a-zA-Z0-9_-]+)(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-schema-properties-\3\4)/g' "$file"
  fi
done

# Fix specific documentation links that are causing issues
echo "🔧 Fixing specific problematic links..."

# Deep clean schema files - more aggressive approach
echo "  Deep cleaning schema files to remove all .md references"
find "./schemas" -type f -name "*.md" | while read schema_file; do
  # Super aggressive - just remove .md from the entire file
  sed "${SED_INPLACE[@]}" -E 's/\.md//g' "$schema_file"
done

echo -e "\n✅ Processed all files and fixed schema links!"

# 2. Summary of processing
schema_count=$(find ./schemas -type f -name "*.md" | wc -l | tr -d ' ')
echo "📊 Total schema files processed: $schema_count"

# 3. Check for any remaining .md references
remaining=$(grep -l "\.md" $(find . -type f -name "*.md") 2>/dev/null | wc -l | tr -d ' ')
if [ "$remaining" -gt "0" ]; then
  echo "⚠️ Found $remaining files that might still have .md references"
  echo "   Sample files with remaining .md references:"
  grep -l "\.md" $(find . -type f -name "*.md") 2>/dev/null | head -n 5
else
  echo "✨ No remaining .md references found. All links appear to be fixed!"
fi


# Create a root-level SCHEMA_REFERENCE.md file if it doesn't exist
if [ ! -f "./SCHEMA_REFERENCE.md" ]; then
  echo "📝 Creating root-level SCHEMA_REFERENCE.md for navigation..."
  cat > "./SCHEMA_REFERENCE.md" << EOF
---
layout: default
title: Schema Reference
nav_order: 5
has_children: true
permalink: /schemas/
---

# Defra Forms Model Schema Reference

The schema reference documentation is available in the [schemas directory](/schemas/).
EOF
  echo "✅ Created SCHEMA_REFERENCE.md for left navigation"
fi

echo "✅ All schema links fixed and documentation prepared!"

# Special fix for schema links
echo "🔧 Fixing schema links to ensure they have the correct prefix..."
find "$BASE_DIR" -type f -name "*.md" | while read file; do
  # Fix schema links by ensuring they have the /forms-engine-plugin prefix
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\((/schemas/[^)]+)\)|\[\1\]\(/forms-engine-plugin\2\)|g' "$file"
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\((schemas/[^)]+)\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"

  # Also catch schema links that might appear in full URL form but incorrectly
  sed "${SED_INPLACE[@]}" -E 's|https://defra.github.io/schemas/|https://defra.github.io/forms-engine-plugin/schemas/|g' "$file"
done
