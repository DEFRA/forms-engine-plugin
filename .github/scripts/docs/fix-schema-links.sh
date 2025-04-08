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
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^)]+)\.md(#[^)]+)?\)|\[\1\]\(/forms-engine-plugin/\2\3\)|g' "$file"
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^)]+)\.md\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"
  # Fix plain / roots to include baseurl
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\/([^)]+)\)|\[\1\]\(/forms-engine-plugin/\2\)|g' "$file"
  # Fix relative links to be absolute with baseurl
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
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-schema[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-schema-[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"

    # Handle properties references
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+-properties-[a-zA-Z0-9_-]*)(\.md)?\)/[\1](\2)/g' "$file"

    # Fix references to validation schemas
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((min|max)(-length|-schema|-future|-past)?(\.md)?\)/[\1](\2\3)/g' "$file"

    # Handle other schema patterns
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((search|sorting|query|list)-options-schema(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-options-schema\3)/g' "$file"
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\((page|form|component)-([a-zA-Z0-9_-]+)(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-\3\4)/g' "$file"

    # Extra pass for nested property references
    sed "${SED_INPLACE[@]}" -E 's/\[([^\]]+)\]\(([a-zA-Z0-9_-]+)-schema-properties-([a-zA-Z0-9_-]+)(-[a-zA-Z0-9_-]*)?(\.md)?\)/[\1](\2-schema-properties-\3\4)/g' "$file"
  fi
done

# Fix specific documentation links that are causing issues
echo "🔧 Fixing specific problematic links..."

# 1. Fix PAGE links between documentation sections
if [ -f "./features/code-based/PAGE_VIEWS.md" ]; then
  echo "  Fixing PAGE_VIEWS.md links"
  sed "${SED_INPLACE[@]}" -E 's|\[see our guidance on page events\]([^)]*)/PAGE_EVENTS\.md|\[see our guidance on page events\]\(\.\.\/configuration-based\/PAGE_EVENTS\)|g' "./features/code-based/PAGE_VIEWS.md"
fi

if [ -f "./features/configuration-based/PAGE_TEMPLATES.md" ]; then
  echo "  Fixing PAGE_TEMPLATES.md links"
  sed "${SED_INPLACE[@]}" -E 's|\[see our guidance on page events\]([^)]*)/PAGE_EVENTS\.md|\[see our guidance on page events\]\(\.\.\/configuration-based\/PAGE_EVENTS\)|g' "./features/configuration-based/PAGE_TEMPLATES.md"
fi

# 2. Deep clean schema files - more aggressive approach
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

# Advanced fixing for specific files with code blocks
echo "🔧 Special handling for files with code examples..."
for special_file in "./features/configuration-based/PAGE_TEMPLATES.md" "./CONTRIBUTING.md"; do
  if [ -f "$special_file" ]; then
    echo "  Processing special file: $special_file"

    # Create a temporary file
    temp_file="${special_file}.tmp"
    > "$temp_file" # Create empty temporary file

    # Process the file line-by-line, tracking if we're in a code block
    in_code_block=false
    while IFS= read -r line; do
      # Check if line starts/ends a code block (backticks escaped)
      if [[ "$line" =~ ^\`\`\`.*$ ]]; then
        # Toggle code block state
        if [ "$in_code_block" = true ]; then
          in_code_block=false
        else
          in_code_block=true
        fi
        echo "$line" >> "$temp_file"
      elif [ "$in_code_block" = true ]; then
        # In code block, leave as is
        echo "$line" >> "$temp_file"
      else
        # Outside code block, fix .md links
        fixed_line=$(echo "$line" | sed -E 's/\(([^)]+)\.md\)/(\1)/g' | sed -E 's/\[([^\]]+)\]\(([^)]+)\.md\)/[\1](\2)/g')
        echo "$fixed_line" >> "$temp_file"
      fi
    done < "$special_file"

    # Replace original with fixed version
    mv "$temp_file" "$special_file"
  fi
done

echo "✅ Special file handling complete!"

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

# Fix cross-directory links that are causing issues
echo "🔧 Fixing cross-directory links..."

# 1. Fix specifically PAGE_VIEWS.md linking to PAGE_EVENTS.md
if [ -f "./features/code-based/PAGE_VIEWS.md" ]; then
  echo "  Fixing cross-directory links in PAGE_VIEWS.md"
  # Fix relative path from code-based to configuration-based
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\.\./configuration-based/PAGE_EVENTS\.?m?d?\)|\[\1\]\(\/features\/configuration-based\/PAGE_EVENTS\)|g' "./features/code-based/PAGE_VIEWS.md"
  sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(PAGE_EVENTS\.?m?d?\)|\[\1\]\(\/features\/configuration-based\/PAGE_EVENTS\)|g' "./features/code-based/PAGE_VIEWS.md"
fi

# 2. Completely remove .md from all schema files
echo "  Aggressively cleaning .md from schema files"
find "./schemas" -type f -name "*.md" | while read schema_file; do
  sed "${SED_INPLACE[@]}" -E 's/\.md//g' "$schema_file"
done

# Ensure index.md exists in schemas directory and is properly formatted
if [ -f "./schemas/README.md" ] && [ ! -f "./schemas/index.md" ]; then
  echo "📝 Creating schemas/index.md from README.md..."
  cp "./schemas/README.md" "./schemas/index.md"

  sed "${SED_INPLACE[@]}" '/^---/,/^---/d' "./schemas/index.md"

  # Add new front matter
  front_matter="---\nlayout: default\ntitle: Schema Reference\nnav_order: 5\nhas_children: true\npermalink: /schemas/\n---\n\n"
  sed "${SED_INPLACE[@]}" "1s/^/$front_matter/" "./schemas/index.md"

  echo "✅ Created schemas/index.md with proper front matter"
fi

echo "✅ All schema links fixed and documentation prepared!"
