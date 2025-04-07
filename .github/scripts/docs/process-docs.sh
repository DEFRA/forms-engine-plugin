#!/bin/bash
# process-docs.sh - Fixed to properly format front matter AND set correct navigation

# Set up sed in-place flag based on OS
if sed --version 2>&1 | grep -q GNU; then
  # GNU sed (Linux)
  SED_INPLACE=(-i)
else
  # BSD sed (macOS)
  SED_INPLACE=(-i "")
fi

echo "🔄 Processing documentation files..."

# Set the correct base path
BASE_DIR="site-src"

# Define core schemas - these will be shown in navigation
CORE_SCHEMAS=(
  "component-schema-v2"
  "component-schema"
  "form-definition-schema"
  "form-definition-v2-payload-schema"
  "form-metadata-schema"
  "page-schema"
  "page-schema-v2"
)

# Check if directories exist and display useful messages
if [ ! -d "$BASE_DIR/schemas" ]; then
  echo "⚠️ Directory $BASE_DIR/schemas not found. Skipping schema processing."
else
  # Fix broken front matter AND set navigation visibility
  echo "🔧 Fixing front matter and configuring navigation..."
  find "$BASE_DIR/schemas" -type f -name "*.md" | while read file; do
    filename=$(basename "$file" .md)
    
    # Skip index.md
    if [[ "$filename" == "index" ]]; then
      continue
    fi
    
    # Check if this is a core schema
    is_core=false
    for core_schema in "${CORE_SCHEMAS[@]}"; do
      if [[ "$filename" == "$core_schema" ]]; then
        is_core=true
        break
      fi
    done
    
    # STEP 1: Fix completely missing front matter
    if ! grep -q "^---$" "$file"; then
      echo "  Adding missing front matter to $filename"
      title=$(echo "$filename" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
      
      if [ "$is_core" = true ]; then
        # Core schema - visible in navigation
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: SCHEMA REFERENCE\n---\n\n/" "$file"
      else
        # Non-core schema - hidden from navigation
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: SCHEMA REFERENCE\nnav_exclude: true\n---\n\n/" "$file"
      fi
      continue
    fi
    
    # STEP 2: Fix malformatted front matter (all on one line)
    first_line=$(sed -n '2p' "$file")
    if [[ "$first_line" != "layout:"* && "$first_line" != "title:"* && "$first_line" != "parent:"* && "$first_line" != "nav_exclude:"* ]]; then
      echo "  Fixing malformatted front matter in $filename"
      
      # Remove existing front matter
      sed "${SED_INPLACE[@]}" '1,/^---$/d' "$file"
      
      # Extract the title from the filename
      title=$(echo "$filename" | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++)sub(/./,toupper(substr($i,1,1)),$i)}1')
      
      # Add proper front matter with correct line breaks
      if [ "$is_core" = true ]; then
        # Core schema - visible in navigation
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: SCHEMA REFERENCE\n---\n\n/" "$file"
      else
        # Non-core schema - hidden from navigation
        sed "${SED_INPLACE[@]}" "1s/^/---\nlayout: default\ntitle: \"$title\"\nparent: SCHEMA REFERENCE\nnav_exclude: true\n---\n\n/" "$file"
      fi
      continue
    fi
    
    # STEP 3: Handle files with properly formatted front matter
    # For non-core schemas, add nav_exclude if missing
    if [ "$is_core" = false ]; then
      echo "  Updating navigation visibility for $filename"
      if ! grep -q "nav_exclude:" "$file"; then
        # Find the line with 'parent:' and add nav_exclude after it
        sed "${SED_INPLACE[@]}" '/parent:/a\
nav_exclude: true' "$file"
      fi
    else
      echo "  Preserving core schema: $filename"
      # For core schemas, remove nav_exclude if present
      if grep -q "nav_exclude:" "$file"; then
        sed "${SED_INPLACE[@]}" '/nav_exclude:/d' "$file"
      fi
    fi
  done

  # Remove redundant README.md if index.md exists
  if [ -f "$BASE_DIR/schemas/index.md" ] && [ -f "$BASE_DIR/schemas/README.md" ]; then
    echo "🗑️ Removing redundant schemas/README.md since index.md exists..."
    rm "$BASE_DIR/schemas/README.md"
    echo "✅ Removed redundant README.md"
  fi

  # Fix property links in schema files
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
    # Create temporary file with the right front matter
    cat > "$BASE_DIR/temp_schema_ref.md" << EOF
---
layout: default
title: SCHEMA REFERENCE
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

  # Modify permalink in schemas/index.md to avoid conflict
  if [ -f "$BASE_DIR/schemas/index.md" ]; then
    echo "  Updating permalink in schemas/index.md"
    sed "${SED_INPLACE[@]}" 's|permalink: /schemas/|permalink: /schemas/index/|g' "$BASE_DIR/schemas/index.md"
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

  # Fix Liquid syntax errors by using raw tags
  echo "🔄 Fixing Liquid syntax in templates..."
  for liquid_file in "$BASE_DIR/features/configuration-based/PAGE_EVENTS.md" "$BASE_DIR/features/configuration-based/PAGE_TEMPLATES.md" "$BASE_DIR/features/code-based/PAGE_VIEWS.md"; do
    if [ -f "$liquid_file" ]; then
      echo "  Fixing Liquid syntax in $liquid_file"
      
      # Create a temporary file
      temp_file="${liquid_file}.tmp"
      > "$temp_file" # Create empty temporary file
      
      # Process line by line to properly wrap Liquid tags in raw tags
      in_code_block=false
      while IFS= read -r line; do
        # Check if line starts/ends a code block
        if [[ "$line" =~ ^```.*$ ]]; then
          # Toggle code block state
          if $in_code_block; then
            in_code_block=false
          else
            in_code_block=true
          fi
          echo "$line" >> "$temp_file"
          continue
        fi
        
        if $in_code_block; then
          # Inside code blocks, wrap any {{ }} in raw tags
          if [[ "$line" =~ \{\{ || "$line" =~ \}\} ]]; then
            # Replace any existing escape sequences
            line=$(echo "$line" | sed 's/\\{{ /{{ /g' | sed 's/ \\}}/ }}/g' | sed 's/\\{{/{{/g' | sed 's/\\}}/}}/g')
            # Wrap the entire line in raw tags if it contains liquid syntax
            echo "{% raw %}${line}{% endraw %}" >> "$temp_file"
          else
            echo "$line" >> "$temp_file"
          fi
        else
          # Outside code blocks, just write the line
          echo "$line" >> "$temp_file"
        fi
      done < "$liquid_file"
      
      # Replace original with fixed version
      mv "$temp_file" "$liquid_file"
    fi
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