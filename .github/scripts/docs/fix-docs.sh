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
      
      # Fix the Liquid templates in both files using HTML entities
      for target in "$file" "$lowercase"; do
        # Create a temporary file
        temp_file="${target}.tmp"
        > "$temp_file" # Create empty file
        
        # Process line by line to HTML-encode Liquid tags
        in_code_block=false
        while IFS= read -r line; do
          # Check if line starts/ends a code block
          if [[ "$line" =~ ^\`\`\`.* ]]; then
            in_code_block=!$in_code_block
            echo "$line" >> "$temp_file"
            continue
          fi
          
          if $in_code_block; then
            # Inside code blocks, replace Liquid syntax with HTML entities
            # Replace {{ with &#123;&#123;
            line=$(echo "$line" | sed 's/{{\|{{/\&#123;\&#123;/g')
            # Replace }} with &#125;&#125;
            line=$(echo "$line" | sed 's/}}\|}}/\&#125;\&#125;/g')
            # Replace {% with &#123;%
            line=$(echo "$line" | sed 's/{%\|{%/\&#123;%/g')
            # Replace %} with %&#125;
            line=$(echo "$line" | sed 's/%}\|%}/\%\&#125;/g')
            echo "$line" >> "$temp_file"
          else
            # Outside code blocks, no encoding (use backticks for inline code)
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