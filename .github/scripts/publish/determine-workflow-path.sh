#!/bin/bash
set -e

# Arguments
EVENT_NAME="$1"
INPUT_VERSION_BUMP="$2"
INPUT_NPM_TAG="$3"

# Default values
WORKFLOW_PATH="unknown"
SHOULD_BUILD="false"
VERSION_BUMP="patch"
NPM_TAG=""

if [[ "$EVENT_NAME" == "workflow_dispatch" ]]; then
  echo "🔵 Manual workflow trigger detected"
  WORKFLOW_PATH="manual"
  SHOULD_BUILD="true"
  VERSION_BUMP="$INPUT_VERSION_BUMP"
  NPM_TAG="$INPUT_NPM_TAG"

elif [[ "$EVENT_NAME" == "push" ]]; then
  COMMIT_MSG=$(git log -1 --pretty=%B)
  if [[ "$COMMIT_MSG" == *"#minor"* || "$COMMIT_MSG" == *"#major"* ]]; then
    echo "🟢 Version bump commit detected!"
    WORKFLOW_PATH="version-bump"
    SHOULD_BUILD="true"

    if [[ "$COMMIT_MSG" == *"#minor"* ]]; then
      echo "Minor version bump"
      VERSION_BUMP="minor"
    elif [[ "$COMMIT_MSG" == *"#major"* ]]; then
      echo "Major version bump"
      VERSION_BUMP="major"
    fi

  elif git diff --name-only HEAD^ HEAD | grep -v "\.test\." | grep -q -E "(^\.browserslistrc$|^babel\.config\.|^src/)"; then
    echo "🟠 Relevant file changes detected"
    WORKFLOW_PATH="file-changes"
    SHOULD_BUILD="true"

  else
    echo "⚪ No publishing-relevant changes detected"
    WORKFLOW_PATH="skip"
  fi
fi

echo "workflow-path=$WORKFLOW_PATH" >> $GITHUB_OUTPUT
echo "should-build=$SHOULD_BUILD" >> $GITHUB_OUTPUT
echo "version-bump=$VERSION_BUMP" >> $GITHUB_OUTPUT
echo "npm-tag=$NPM_TAG" >> $GITHUB_OUTPUT

echo "==========================================="
echo "Workflow Path: $WORKFLOW_PATH"
echo "Should Build: $SHOULD_BUILD"
echo "Version Bump: $VERSION_BUMP"
echo "NPM Tag: ${NPM_TAG:-<auto-detect>}"
echo "==========================================="
