#!/bin/bash
# fix-docs.sh - Quick script to fix documentation issues

echo "🔄 Fixing documentation files..."

# Process each directory
for dir in docs/features/code-based docs/features/configuration-based; do
  echo "Processing $dir directory..."
  cd "$dir" || exit 1
  
  # Process each file
  for file in *.md; do
    echo "  Processing $file"
    
    # Create a temporary file
    temp_file="${file}.tmp"
    > "$temp_file" # Create empty file
    
    # Create lowercase version if needed
    lowercase_file=$(echo "$file" | tr '[:upper:]' '[:lower:]')
    if [ "$file" != "$lowercase_file" ]; then
      echo "  Creating lowercase copy: $lowercase_file"
    fi
    
    # Process line by line to handle both code blocks and Liquid tags
    in_code_block=false
    while IFS= read -r line || [ -n "$line" ]; do
      # Check if line starts/ends a code block
      if [[ "$line" =~ ^\`\`\`.* ]]; then
        # Toggle the in_code_block flag properly
        if $in_code_block; then
          in_code_block=false
        else
          in_code_block=true
        fi
        echo "$line" >> "$temp_file"
        continue
      fi
      
      if $in_code_block; then
        # Inside code blocks, replace Liquid syntax with HTML entities
        # Replace {{ with &#123;&#123;
        line="${line//\{\{/&#123;&#123;}"
        # Replace }} with &#125;&#125;
        line="${line//\}\}/&#125;&#125;}"
        # Replace {% with &#123;%
        line="${line//\{%/&#123;%}"
        # Replace %} with %&#125;
        line="${line//%\}/%&#125;}"
        echo "$line" >> "$temp_file"
      else
        # Outside code blocks, keep as is
        echo "$line" >> "$temp_file"
      fi
    done < "$file"
    
    # Replace original with fixed version
    mv "$temp_file" "$file"
    
    # Create lowercase version if needed
    if [ "$file" != "$lowercase_file" ]; then
      cp "$file" "$lowercase_file"
    fi
  done
  
  # Go back to original directory
  cd - > /dev/null || exit 1
done

echo "✅ Documentation files fixed!"