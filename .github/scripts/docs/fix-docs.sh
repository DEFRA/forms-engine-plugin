#!/bin/bash
# fix-docs.sh - Script to fix documentation issues

echo "🔄 Processing documentation files..."

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

# Process root markdown files
echo "🔄 Processing root markdown files..."
for file in *.md GETTING_STARTED.md PLUGIN_OPTIONS.md CONTRIBUTING.md; do
  if [ -f "$file" ]; then
    echo "  Processing $file"
    temp_file="${file}.tmp"
    
    # Fix GitHub-style admonitions
    sed -e 's/> \[!NOTE\]/{: .note }/g' \
        -e 's/> \[!WARNING\]/{: .warning }/g' \
        -e 's/> \[!TIP\]/{: .highlight }/g' \
        -e 's/> \[!IMPORTANT\]/{: .important }/g' \
        -e 's/> \[!CAUTION\]/{: .warning }/g' \
        "$file" > "$temp_file"
    
    # Remove the > prefix from content lines immediately after callout class
    sed -i -e '/^{: \./,/^$/s/^> //' "$temp_file"
    
    # Fix examples link in GETTING_STARTED
    if [[ "$file" =~ GETTING_STARTED.md ]]; then
      sed -i 's|\[examples\](test/form/definitions)|\[examples\](https://github.com/DEFRA/forms-engine-plugin/tree/main/test/form/definitions)|g' "$temp_file"
    fi
    
    # Fix double baseurl prepending for links to PLUGIN_OPTIONS
    sed -i 's|/forms-engine-plugin/forms-engine-plugin/|/forms-engine-plugin/|g' "$temp_file"
    
    mv "$temp_file" "$file"
  fi
done

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
    
    # Fix GitHub-style admonitions
    sed -e 's/> \[!NOTE\]/{: .note }/g' \
        -e 's/> \[!WARNING\]/{: .warning }/g' \
        -e 's/> \[!TIP\]/{: .highlight }/g' \
        -e 's/> \[!IMPORTANT\]/{: .important }/g' \
        -e 's/> \[!CAUTION\]/{: .warning }/g' \
        "$file" > "$temp_file"
    
    # Remove the > prefix from content lines immediately after callout class
    sed -i -e '/^{: \./,/^$/s/^> //' "$temp_file"
    
    # Fix URL paths based on file type
    if [[ "$file" == "PAGE_VIEWS.md" ]]; then
      # Fix links to PAGE_EVENTS in PAGE_VIEWS.md
      sed -i 's|\(see our guidance on page events\)(\.\./configuration-based/PAGE_EVENTS.md)|\1(/features/configuration-based/PAGE_EVENTS)|g' "$temp_file"
      # Fix links to GitHub repos that shouldn't have baseurl
      sed -i 's|\[plugin option\](/forms-engine-plugin/https://|[plugin option](https://|g' "$temp_file"
    fi
    
    if [[ "$file" == "PAGE_TEMPLATES.md" ]]; then
      # Fix links to PLUGIN_OPTIONS
      sed -i 's|\[PLUGIN_OPTIONS.md\](../../PLUGIN_OPTIONS.md#custom-filters)|\[Plugin Options](/PLUGIN_OPTIONS#custom-filters)|g' "$temp_file"
    fi
    
    # Fix double baseurl prepending for all external links
    sed -i 's|/forms-engine-plugin/forms-engine-plugin/|/forms-engine-plugin/|g' "$temp_file"
    sed -i 's|/forms-engine-plugin/https://|https://|g' "$temp_file"
    
    # Create lowercase version if needed
    lowercase_file=$(echo "$file" | tr '[:upper:]' '[:lower:]')
    if [ "$file" != "$lowercase_file" ]; then
      echo "  Creating lowercase copy: $lowercase_file"
      cp "$temp_file" "$lowercase_file"
    fi
    
    # Replace original with fixed version
    mv "$temp_file" "$file"
  done
  
  # Return to the original directory
  popd > /dev/null
done

echo "✅ Documentation fixes applied successfully!"