#!/bin/bash
# fix-docs.sh - Simplified script to create lowercase copies for GitHub Pages

echo "🔄 Creating lowercase versions of documentation files..."

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
  
  # Process each file to create lowercase versions
  for file in *.md; do
    # Create lowercase version if needed
    lowercase_file=$(echo "$file" | tr '[:upper:]' '[:lower:]')
    if [ "$file" != "$lowercase_file" ]; then
      echo "  Creating lowercase copy: $lowercase_file"
      cp "$file" "$lowercase_file"
    fi
  done
  
  # Return to the original directory
  popd > /dev/null
done

echo "✅ Lowercase copies created successfully!"