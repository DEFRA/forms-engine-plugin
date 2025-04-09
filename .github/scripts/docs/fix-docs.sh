#!/bin/bash
# fix-docs.sh - Script to fix documentation issues

echo "🔄 Processing documentation files..."

if sed --version 2>&1 | grep -q GNU; then
  SED_INPLACE=(-i)
else
  SED_INPLACE=(-i "")
fi

# IMPORTANT: Process both current directory AND docs/ directory for root files
echo "🔄 Processing root markdown files..."
for location in "." "docs"; do
  if [ -d "$location" ]; then
    echo "  Checking $location directory"
    for file in "$location"/*.md; do
      if [ -f "$file" ]; then
        echo "  Processing $file"
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

        if [[ "$file" =~ GETTING_STARTED.md ]]; then
          sed "${SED_INPLACE[@]}" 's|\[examples\](test/form/definitions)|\[examples\](https://github.com/DEFRA/forms-engine-plugin/tree/main/test/form/definitions)|g' "$temp_file"
        fi

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

  pushd "$dir_path" > /dev/null || exit 1

  for file in *.md; do
    echo "  Processing $file"

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

    lowercase_file=$(echo "$file" | tr '[:upper:]' '[:lower:]')
    if [ "$file" != "$lowercase_file" ]; then
      echo "  Creating lowercase copy: $lowercase_file"
      cp "$temp_file" "$lowercase_file"
    fi

    mv "$temp_file" "$file"
  done

  popd > /dev/null
done

echo "✅ Documentation fixes applied successfully!"
