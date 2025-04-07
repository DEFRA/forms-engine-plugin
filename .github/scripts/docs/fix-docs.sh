#!/bin/bash
# fix-docs.sh - Quick script to fix documentation issues

echo "🔄 Fixing documentation files..."

# Determine the correct docs path
if [ -d "docs/features" ]; then
  DOCS_PATH="docs/features"
elif [ -d "../docs/features" ]; then
  DOCS_PATH="../docs/features"
elif [ -d "features" ]; then
  DOCS_PATH="features"
else
  echo "❌ Cannot find docs/features directory!"
  exit 1
fi

echo "Using docs path: $DOCS_PATH"

# Process each directory
for dir in code-based configuration-based; do
  dir_path="$DOCS_PATH/$dir"
  echo "Processing $dir_path directory..."
  
  if [ ! -d "$dir_path" ]; then
    echo "❌ Directory $dir_path not found!"
    continue
  fi
  
  # Change to the directory
  pushd "$dir_path" > /dev/null || exit 1
  
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
  
  # Return to the original directory
  popd > /dev/null
done

echo "✅ Documentation files fixed!"