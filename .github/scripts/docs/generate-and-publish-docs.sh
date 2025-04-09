#!/bin/bash
set -e

BRANCH_NAME="$1"
VERSION="$2"  # Full version like 2.3.1

npm run generate-schema-docs

mkdir -p ./docs-site
mkdir -p ./docs-site/versions

if [ ! -f ./docs-site/versions/index.md ]; then
  echo "# Documentation Versions" > ./docs-site/versions/index.md
  echo "" >> ./docs-site/versions/index.md
fi

if [[ "$BRANCH_NAME" == "main" ]]; then
  echo "📚 Generating beta documentation (version ${VERSION})"

  mkdir -p "./docs-site/versions/beta"
  cp -r ./docs/* "./docs-site/versions/beta/"

  # Add beta indicator
  sed -i "1s/^/> Beta Version ${VERSION} - Latest development version\n\n/" "./docs-site/versions/beta/INDEX.md"

  # Update versions index to include beta
  if ! grep -q "Beta" ./docs-site/versions/index.md; then
    echo "* [Beta (${VERSION})](./beta/) - Latest development version" >> ./docs-site/versions/index.md
  else
    sed -i "s/Beta ([0-9.]*)/Beta (${VERSION})/g" ./docs-site/versions/index.md
  fi

  # ALSO copy beta to main docs area - this makes beta the default view
  echo "🔄 Setting beta as the default documentation"
  cp -r "./docs-site/versions/beta/"* ./docs-site/

  sed -i "1s/^.*Version.*$/> Using Beta Version ${VERSION} - [View other versions](\/versions\/)\n/" ./docs-site/INDEX.md || \
    sed -i "1s/^/> Using Beta Version ${VERSION} - [View other versions](\/versions\/)\n\n/" ./docs-site/INDEX.md

elif [[ "$BRANCH_NAME" =~ release/v([0-9]+) ]]; then
  MAJOR_VERSION="${BASH_REMATCH[1]}"
  echo "📚 Generating documentation for major version v${MAJOR_VERSION} (${VERSION})"

  mkdir -p "./docs-site/versions/v${MAJOR_VERSION}"
  cp -r ./docs/* "./docs-site/versions/v${MAJOR_VERSION}/"

  sed -i "1s/^/> Version ${VERSION} (v${MAJOR_VERSION} release)\n\n/" "./docs-site/versions/v${MAJOR_VERSION}/INDEX.md"

  if ! grep -q "v${MAJOR_VERSION}" ./docs-site/versions/index.md; then
    echo "* [v${MAJOR_VERSION} (${VERSION})](./v${MAJOR_VERSION}/)" >> ./docs-site/versions/index.md
  else
    sed -i "s/v${MAJOR_VERSION} ([0-9.]*)/v${MAJOR_VERSION} (${VERSION})/g" ./docs-site/versions/index.md
  fi
else
  echo "⚠️ Not processing documentation for branch: ${BRANCH_NAME}"
  exit 0
fi

# Sort the versions in the index file (with beta always at the top)
if [ -f ./docs-site/versions/index.md ]; then
  HEADER=$(head -n 2 ./docs-site/versions/index.md)
  BETA_LINE=$(grep "Beta" ./docs-site/versions/index.md || echo "")
  VERSION_LINES=$(grep -v "Beta" ./docs-site/versions/index.md | grep -v "# Documentation" | grep -v "^$" | sort -Vr)

  echo "$HEADER" > ./docs-site/versions/index.md
  if [ -n "$BETA_LINE" ]; then
    echo "$BETA_LINE" >> ./docs-site/versions/index.md
  fi
  echo "$VERSION_LINES" >> ./docs-site/versions/index.md
fi

# Create .nojekyll file to bypass Jekyll processing
touch ./docs-site/.nojekyll

echo "✅ Documentation generated successfully"
