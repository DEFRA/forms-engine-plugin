#!/bin/bash
# fix-docs.sh - Quick script to fix documentation issues

echo "🔄 Fixing documentation files..."

# Create lowercase copies and fix links
for dir in code-based configuration-based; do
  echo "Processing $dir directory..."
  cd "features/$dir" || exit 1
  
  # Create lowercase versions of all uppercase files
  for file in *.md; do
    if [[ "$file" == *[A-Z]* ]]; then
      lowercase=$(echo "$file" | tr '[:upper:]' '[:lower:]')
      echo "  Creating lowercase copy: $lowercase"
      cp "$file" "$lowercase"
      
      # Fix the Liquid templates in both files
      for target in "$file" "$lowercase"; do
        # Create a temporary file
        temp_file="${target}.tmp"
        > "$temp_file" # Create empty file
        
        # Process line by line to properly wrap Liquid tags
        while IFS= read -r line; do
          if [[ "$line" == *"{{"*"}}"* ]]; then
            # Line contains Liquid syntax, wrap it
            echo "{% raw %}${line}{% endraw %}" >> "$temp_file"
          else
            # No Liquid syntax, keep as is
            echo "$line" >> "$temp_file"
          fi
        done < "$target"
        
        # Replace original with fixed version
        mv "$temp_file" "$target"
      done
    fi
  done
  
  # Fix links to uppercase files
  for file in *.md; do
    # Update links to other docs to use lowercase
    sed -i.bak -E 's/\(([^)]*)(PAGE_[A-Z_]+)(\.md)?\)/(\1\L\2\E\3)/g' "$file"
    sed -i.bak -E 's/\(\.\.\/([^)]*)(PAGE_[A-Z_]+)(\.md)?\)/(\.\.\1\L\2\E\3)/g' "$file"
    rm -f "$file.bak"
  done
  
  cd ../.. || exit 1
done

echo "✅ Documentation files fixed!"