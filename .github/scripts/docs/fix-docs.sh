#!/bin/bash
# fix-docs.sh - Script to fix documentation issues

echo "🔄 Processing documentation files..."

# Set up sed in-place flag based on OS
if sed --version 2>&1 | grep -q GNU; then
  # GNU sed (Linux)
  SED_INPLACE=(-i)
else
  # BSD sed (macOS)
  SED_INPLACE=(-i "")
fi

# IMPORTANT: Process both current directory AND docs/ directory for root files
echo "🔄 Processing root markdown files..."
for location in "." "docs"; do
  if [ -d "$location" ]; then
    echo "  Checking $location directory"
    for file in "$location"/*.md "$location"/GETTING_STARTED.md "$location"/PLUGIN_OPTIONS.md "$location"/CONTRIBUTING.md; do
      if [ -f "$file" ]; then
        echo "  Processing $file"
        temp_file="${file}.tmp"
        
        # IMPROVED: Use awk for better GitHub-style admonition conversion
        awk '
        /^> \[!NOTE\]/ { 
          print "{: .note }"; 
          in_note = 1; 
          next; 
        }
        /^> \[!TIP\]/ { 
          print "{: .highlight }"; 
          in_note = 1; 
          next; 
        }
        /^> \[!IMPORTANT\]/ { 
          print "{: .important }"; 
          in_note = 1; 
          next; 
        }
        /^> \[!WARNING\]/ { 
          print "{: .warning }"; 
          in_note = 1; 
          next; 
        }
        /^> \[!CAUTION\]/ { 
          print "{: .warning }"; 
          in_note = 1; 
          next; 
        }
        /^> / {
          if(in_note) {
            print substr($0, 3);
            next;
          }
        }
        {
          in_note = 0;
          print;
        }
        ' "$file" > "$temp_file"
        
        # Fix examples link in GETTING_STARTED
        if [[ "$file" =~ GETTING_STARTED.md ]]; then
          sed "${SED_INPLACE[@]}" 's|\[examples\](test/form/definitions)|\[examples\](https://github.com/DEFRA/forms-engine-plugin/tree/main/test/form/definitions)|g' "$temp_file"
        fi
        
        # Fix double baseurl prepending for links to PLUGIN_OPTIONS
        sed "${SED_INPLACE[@]}" 's|/forms-engine-plugin/forms-engine-plugin/|/forms-engine-plugin/|g' "$temp_file"
        
        mv "$temp_file" "$file"
      fi
    done
  fi
done

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

    awk '
    /^> \[!NOTE\]/ { 
      print "{: .note }"; 
      in_note = 1; 
      next; 
    }
    /^> \[!TIP\]/ { 
      print "{: .highlight }"; 
      in_note = 1; 
      next; 
    }
    /^> \[!IMPORTANT\]/ { 
      print "{: .important }"; 
      in_note = 1; 
      next; 
    }
    /^> \[!WARNING\]/ { 
      print "{: .warning }"; 
      in_note = 1; 
      next; 
    }
    /^> \[!CAUTION\]/ { 
      print "{: .warning }"; 
      in_note = 1; 
      next; 
    }
    /^> / {
      if(in_note) {
        print substr($0, 3);
        next;
      }
    }
    {
      in_note = 0;
      print;
    }
    ' "$file" > "$temp_file"
    
    # Fix URL paths based on file type
    if [[ "$file" == "PAGE_VIEWS.md" ]]; then
      # Fix links to PAGE_EVENTS in PAGE_VIEWS.md
      sed "${SED_INPLACE[@]}" 's|\(see our guidance on page events\)(\.\./configuration-based/PAGE_EVENTS.md)|\1(/features/configuration-based/PAGE_EVENTS)|g' "$temp_file"
      # Fix links to GitHub repos that shouldn't have baseurl
      sed "${SED_INPLACE[@]}" 's|\[plugin option\](/forms-engine-plugin/https://|[plugin option](https://|g' "$temp_file"
    fi
    
    if [[ "$file" == "PAGE_TEMPLATES.md" ]]; then
      # Fix links to PLUGIN_OPTIONS
      sed "${SED_INPLACE[@]}" 's|\[PLUGIN_OPTIONS.md\](../../PLUGIN_OPTIONS.md#custom-filters)|\[Plugin Options](/PLUGIN_OPTIONS#custom-filters)|g' "$temp_file"
    fi
    
    # Fix double baseurl prepending for all external links
    sed "${SED_INPLACE[@]}" 's|/forms-engine-plugin/forms-engine-plugin/|/forms-engine-plugin/|g' "$temp_file"
    sed "${SED_INPLACE[@]}" 's|/forms-engine-plugin/https://|https://|g' "$temp_file"
    
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

# Fix Liquid syntax in templates
echo "🔄 Fixing Liquid syntax in templates..."
for liquid_file in "$DOCS_PATH/configuration-based/PAGE_EVENTS.md" "$DOCS_PATH/configuration-based/PAGE_TEMPLATES.md" "$DOCS_PATH/code-based/PAGE_VIEWS.md"; do
  if [ -f "$liquid_file" ]; then
    echo "  Fixing Liquid syntax in $liquid_file"
    
    # Create a temporary file
    temp_file="${liquid_file}.tmp"
    > "$temp_file" # Create empty temporary file
    
    # Process line by line to properly wrap Liquid tags in raw tags
    in_code_block=false
    while IFS= read -r line; do
      # Check if line starts/ends a code block
      if [[ "$line" =~ ^\`\`\`.* ]]; then
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
        if [[ "$line" =~ (\{\{|\}\}) ]]; then
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

echo "✅ Documentation fixes applied successfully!"