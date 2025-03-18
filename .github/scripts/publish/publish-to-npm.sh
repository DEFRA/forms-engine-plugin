#!/bin/bash
set -e

BRANCH_NAME="$1"
WORKFLOW_PATH="$2"
NPM_TAG="$3"
DRY_RUN="$4"

NEW_VERSION=$(npm pkg get version | tr -d \")
PUBLISH_ARGS="--access public"

USING_DEFAULT_TAG=false
if [[ "$WORKFLOW_PATH" == "manual" && "$NPM_TAG" == "beta" ]]; then
  USING_DEFAULT_TAG=true
fi

if [[ -n "$NPM_TAG" && "$USING_DEFAULT_TAG" == "false" ]]; then
  DIST_TAG="$NPM_TAG"
  PUBLISH_ARGS="$PUBLISH_ARGS --tag $DIST_TAG"
  echo "Publishing v$NEW_VERSION with custom tag '$DIST_TAG'"
elif [[ "$BRANCH_NAME" == "main" ]]; then
  DIST_TAG="beta"
  PUBLISH_ARGS="$PUBLISH_ARGS --tag $DIST_TAG"
  echo "Publishing v$NEW_VERSION from main -> using 'beta' tag"
elif [[ "$BRANCH_NAME" =~ release/v([0-9]+) ]]; then
  MAJOR_VERSION="${BASH_REMATCH[1]}"
  DIST_TAG="${MAJOR_VERSION}x"
  PUBLISH_ARGS="$PUBLISH_ARGS --tag $DIST_TAG"
  echo "Publishing v$NEW_VERSION from $BRANCH_NAME -> using tag '$DIST_TAG'"
else
  if [[ "$WORKFLOW_PATH" == "manual" && "$USING_DEFAULT_TAG" == "true" ]]; then
    DIST_TAG="beta"
    PUBLISH_ARGS="$PUBLISH_ARGS --tag $DIST_TAG"
    echo "⚠️ WARNING: Publishing from non-standard branch '$BRANCH_NAME' with default 'beta' tag"
  else
    echo "Branch $BRANCH_NAME doesn't match expected patterns, using default publishing"
  fi
fi

if [[ "$DRY_RUN" == "true" ]]; then
  PUBLISH_ARGS="$PUBLISH_ARGS --dry-run"
  echo "DRY RUN MODE - No actual publishing will occur"
fi

# Temporary guards for testing
# PUBLISH_ARGS="$PUBLISH_ARGS --dry-run"
# echo "⚠️ TEST MODE: Force using --dry-run flag. Remove before merging to main! ⚠️"

npm publish $PUBLISH_ARGS
