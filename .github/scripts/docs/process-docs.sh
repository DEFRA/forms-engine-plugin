#!/bin/bash
# process-docs.sh - Fixed to properly format front matter AND set correct navigation

if sed --version 2>&1 | grep -q GNU; then
  SED_INPLACE=(-i)
else
  SED_INPLACE=(-i "")
fi

echo "🔄 Processing documentation files..."

BASE_DIR="."

CORE_SCHEMAS=(
  "component-schema-v2"
  "component-schema"
  "form-definition-schema"
  "form-definition-v2-payload-schema"
  "form-metadata-schema"
  "page-schema"
  "page-schema-v2"
)

echo "🔧 Processing root documentation files..."
if [ -f "INDEX.md" ] && [ ! -f "index.md" ]; then
  echo "  Converting INDEX.md to index.md..."
  cp "INDEX.md" "index.md"

  if ! grep -q "^---" "index.md"; then
    echo "  Adding front matter to index.md..."
    temp_file="index.md.tmp"
    echo "---" > "$temp_file"
    echo "layout: default" >> "$temp_file"
    echo "title: DXT Documentation" >> "$temp_file"
    echo "nav_order: 1" >> "$temp_file"
    echo "permalink: /" >> "$temp_file"
    echo "---" >> "$temp_file"
    echo "" >> "$temp_file"
    cat "index.md" >> "$temp_file"
    mv "$temp_file" "index.md"
  fi
fi

for doc_file in $(find . -maxdepth 1 -name "*.md"); do
  base_name=$(basename "$doc_file" .md)

  if grep -q "^---" "$doc_file"; then
    echo "  Front matter exists in $doc_file"
    continue
  fi

  case "$base_name" in
    "SCHEMA_REFERENCE")
      nav_order=5
      title="Schema Reference"
      ;;
    *)
      nav_order=10
      title=$(echo "$base_name" | sed 's/_/ /g')
      ;;
  esac

  echo "  Adding front matter to $doc_file..."
  temp_file="${doc_file}.tmp"
  echo "---" > "$temp_file"
  echo "layout: default" >> "$temp_file"
  echo "title: $title" >> "$temp_file"
  echo "nav_order: $nav_order" >> "$temp_file"
  echo "---" >> "$temp_file"
  echo "" >> "$temp_file"
  cat "$doc_file" >> "$temp_file"
  mv "$temp_file" "$doc_file"
done

if [ ! -d "$BASE_DIR/schemas" ]; then
  echo "⚠️ Directory $BASE_DIR/schemas not found. Skipping schema processing."
else
  echo "🔧 Super aggressive front matter fix for schema files..."
  find "$BASE_DIR/schemas" -type f -name "*.md" | while read file; do
    filename=$(basename "$file" .md)

    if [[ "$filename" == "index" ]]; then
      continue
    fi

    echo "  Fixing front matter in $filename"

    is_core=false
    for core_schema in "${CORE_SCHEMAS[@]}"; do
      if [[ "$filename" == "$core_schema" ]]; then
        is_core=true
        break
      fi
    done

    content=$(sed -e '1{/^---$/!q0}' -e '1,/^---$/d' "$file" 2>/dev/null || cat "$file")

    title=$(echo "$filename" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')

    if [ "$is_core" = true ]; then
      echo -e "---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\n---\n\n$content" > "$file"
    else
      echo -e "---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\nnav_exclude: true\n---\n\n$content" > "$file"
    fi
  done

  echo "🔧 Fixing front matter and configuring navigation..."
  find "$BASE_DIR/schemas" -type f -name "*.md" | while read file; do
    filename=$(basename "$file" .md)

    if [[ "$filename" == "index" ]]; then
      continue
    fi

    is_core=false
    for core_schema in "${CORE_SCHEMAS[@]}"; do
      if [[ "$filename" == "$core_schema" ]]; then
        is_core=true
        break
      fi
    done

    if ! grep -q "^---$" "$file"; then
      echo "  Adding missing front matter to $filename"
      title=$(echo "$filename" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')

      if [ "$is_core" = true ]; then
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\n---\n\n/" "$file"
      else
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\nnav_exclude: true\n---\n\n/" "$file"
      fi
      continue
    fi

    first_line=$(sed -n '2p' "$file")
    if [[ "$first_line" != "layout:"* && "$first_line" != "title:"* && "$first_line" != "parent:"* && "$first_line" != "nav_exclude:"* ]]; then
      echo "  Fixing malformatted front matter in $filename"

      sed "${SED_INPLACE[@]}" '1,/^---$/d' "$file"

      title=$(echo "$filename" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')

      if [ "$is_core" = true ]; then
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\n---\n\n/" "$file"
      else
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: Schema Reference\nnav_exclude: true\n---\n\n/" "$file"
      fi
      continue
    fi

    if [ "$is_core" = false ]; then
      echo "  Updating navigation visibility for $filename"
      if ! grep -q "nav_exclude:" "$file"; then
        sed "${SED_INPLACE[@]}" '/parent:/a\
nav_exclude: true' "$file"
      fi
    else
      echo "  Preserving core schema: $filename"
      if grep -q "nav_exclude:" "$file"; then
        sed "${SED_INPLACE[@]}" '/nav_exclude:/d' "$file"
      fi
    fi
  done

  if [ -f "$BASE_DIR/schemas/index.md" ] && [ -f "$BASE_DIR/schemas/README.md" ]; then
    echo "🗑️ Removing redundant schemas/README.md since index.md exists..."
    rm "$BASE_DIR/schemas/README.md"
    echo "✅ Removed redundant README.md"
  fi

  echo "🔧 Fixing schema property links..."
  find "$BASE_DIR/schemas" -type f -name "*.md" | while read file; do
    # Fix property links with wrong path structure
    # From: [Type](/schemas/component-schema-v2/component-schema-v2-properties-type)
    # To:   [Type](/schemas/component-schema-v2-properties-type)
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\/schemas\/([^/]+)\/\2-properties-([^)]+)\)|\[\1\]\(\/schemas\/\2-properties-\3\)|g' "$file"

    # Also fix relative links with the same pattern (without /schemas/ prefix)
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^/]+)\/\2-properties-([^)]+)\)|\[\1\]\(\/schemas\/\2-properties-\3\)|g' "$file"

    # Fix simple property links
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([a-zA-Z0-9_-]+-properties-[^)]+)\)|\[\1\]\(\/schemas\/\2\)|g' "$file"

    # Remove any remaining .md extensions
    sed "${SED_INPLACE[@]}" -E 's/\.md\)/\)/g' "$file"
  done

  # Use schemas/index.md for SCHEMA_REFERENCE.md and fix its links
  if [ -f "$BASE_DIR/schemas/index.md" ]; then
    echo "📄 Updating SCHEMA_REFERENCE.md from schemas/index.md..."
    cat > "$BASE_DIR/temp_schema_ref.md" << EOF
---
layout: default
title: Schema Reference
nav_order: 5
has_children: true
permalink: /schemas/
---
EOF

    # Append content after front matter from schemas/index.md
    sed -n '/^---$/,/^---$/!p' "$BASE_DIR/schemas/index.md" >> "$BASE_DIR/temp_schema_ref.md"

    # Replace the SCHEMA_REFERENCE.md file
    mv "$BASE_DIR/temp_schema_ref.md" "$BASE_DIR/SCHEMA_REFERENCE.md"

    # Convert any relative links to absolute links and remove .md
    sed "${SED_INPLACE[@]}" -E 's|\* \[([^]]+)\]\(([^/][^)]+)\.md\)|\* \[\1\]\(\/schemas\/\2\)|g' "$BASE_DIR/SCHEMA_REFERENCE.md"
    sed "${SED_INPLACE[@]}" -E 's|\* \[([^]]+)\]\(([^/][^)]+)\)|\* \[\1\]\(\/schemas\/\2\)|g' "$BASE_DIR/SCHEMA_REFERENCE.md"

    echo "✅ Updated SCHEMA_REFERENCE.md with full schema listing"
  fi
fi

# Check for features directory before processing
if [ ! -d "$BASE_DIR/features" ]; then
  echo "⚠️ Directory $BASE_DIR/features not found. Skipping features documentation processing."
else
  # Fix relative links within the same directory to use absolute paths
  echo "🔧 Fixing relative links within the same directory..."
  find "$BASE_DIR/features" -type f -name "*.md" | while read file; do
    dir=$(dirname "$file")
    base_dir=${dir#$BASE_DIR/}  # Remove base_dir/ prefix

    # Convert ./SOMETHING links to absolute paths
    sed "${SED_INPLACE[@]}" -E "s|\\[([^\\]]+)\\]\\(\\./([A-Z_]+)\\)|[\1](/$base_dir/\2)|g" "$file"
  done

  # Fix problematic cross-directory references
  echo "🔧 Fixing problematic cross-directory references..."
  find "$BASE_DIR/features" -type f -name "*.md" | while read file; do
    echo "  Checking cross-directory references in $file"

    # Fix the problematic pattern ./../dir/FILE
    # This is causing duplicate directory segments in URLs
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\.\./\.\./([^/]+)/([^)]+)\)|\[\1\](\/features\/\2\/\3)|g' "$file"

    # Fix simpler pattern ../dir/FILE
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(\.\./([^/]+)/([^)]+)\)|\[\1\](\/features\/\2\/\3)|g' "$file"
  done

  # Fix the specific broken link in PAGE_TEMPLATES.md
  if [ -f "$BASE_DIR/features/configuration-based/PAGE_TEMPLATES.md" ]; then
    echo "🔧 Fixing specific link in PAGE_TEMPLATES.md..."

    # Hard-code the exact correct link
    sed "${SED_INPLACE[@]}" 's|\[see our guidance on page events\](.*PAGE_EVENTS)|\[see our guidance on page events\](\/features\/configuration-based\/PAGE_EVENTS)|g' "$BASE_DIR/features/configuration-based/PAGE_TEMPLATES.md"

    echo "✅ Fixed link in PAGE_TEMPLATES.md"
  fi
fi

# Fix remaining .md extensions in all files
echo "🔄 Final pass to fix any remaining links..."
find "$BASE_DIR" -type f -name "*.md" | while read file; do
  # Fix main index links
  if [[ "$file" == "$BASE_DIR/index.md" ]]; then
    sed "${SED_INPLACE[@]}" -E 's|\[([^]]+)\]\(([^)]+)\.md\)|\[\1\]\(\2\)|g' "$file"
    sed "${SED_INPLACE[@]}" -E 's|\[Schema Reference Documentation\]\(./schemas/README([^)]*)\)|\[Schema Reference Documentation\]\(\/schemas\/\)|g' "$file"
  else
    # General .md fix for other files
    sed "${SED_INPLACE[@]}" -E 's|\.md\)|)|g' "$file"
  fi
done

echo "✅ Documentation preparation complete!"
