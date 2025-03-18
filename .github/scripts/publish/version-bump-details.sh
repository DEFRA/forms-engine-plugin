#!/bin/bash
set -e

BRANCH_NAME="$1"
VERSION_TYPE="$2"

echo "BRANCH_NAME=$BRANCH_NAME" >> $GITHUB_ENV

if [[ "$BRANCH_NAME" =~ release/v([0-9]+) ]]; then
  MAJOR_VERSION="${BASH_REMATCH[1]}"

  if [[ "$VERSION_TYPE" == "major" ]]; then
    echo "::error::⛔ MAJOR VERSION BUMP NOT ALLOWED ON RELEASE BRANCH"
    echo "::error::Branch release/v${MAJOR_VERSION} is locked to major version ${MAJOR_VERSION}."
    echo "::error::To publish a new major version, create a new branch named release/v$((MAJOR_VERSION+1))."
    exit 1
  fi

  CURRENT_VERSION=$(npm pkg get version | tr -d \")
  CURRENT_MAJOR=$(echo $CURRENT_VERSION | cut -d. -f1)

  if [[ "$CURRENT_MAJOR" != "$MAJOR_VERSION" ]]; then
    echo "::error::🚫 Major version mismatch: package.json version $CURRENT_VERSION does not match release/v${MAJOR_VERSION} branch."
    echo "::error::Please update the package.json manually to match major version ${MAJOR_VERSION}, or rename the branch if you intended a different major."
    exit 1
  fi
fi

echo "VERSION_TYPE=$VERSION_TYPE" >> $GITHUB_ENV
