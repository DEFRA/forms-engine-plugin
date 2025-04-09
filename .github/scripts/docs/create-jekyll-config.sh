#!/bin/bash
# Script to create Jekyll configuration files
# This script creates the Gemfile and _config.yml for the Jekyll site

echo "📝 Creating Jekyll configuration files..."

# Set up sed in-place flag based on OS
if sed --version 2>&1 | grep -q GNU; then
  # GNU sed (Linux)
  SED_INPLACE=(-i)
else
  # BSD sed (macOS)
  SED_INPLACE=(-i "")
fi

# Create Gemfile
echo "📄 Creating Gemfile..."
cat > site-src/Gemfile << EOF
source 'https://rubygems.org'

gem 'jekyll', '~> 4.3.2'
gem 'just-the-docs', '~> 0.5.3'
gem 'jekyll-seo-tag'
gem 'jekyll-remote-theme'
gem 'jekyll-relative-links'
gem 'webrick' # required for Ruby 3.x
EOF

# Create _config.yml
echo "📄 Creating _config.yml..."
cat > site-src/_config.yml << EOF
title: DXT Documentation
description: Documentation for the DEFRA Forms Engine Plugin

# Theme configuration
remote_theme: just-the-docs/just-the-docs@v0.5.3
# Use this instead of remote_theme when running locally
# theme: just-the-docs

# URL configuration - ensure these are correct for GitHub Pages
url: ""
baseurl: "/forms-engine-plugin"  # Use repo name for GitHub Pages

# Search and heading configuration
search_enabled: true
heading_anchors: true
search:
  heading_level: 2
  previews: 3
  preview_words_before: 5
  preview_words_after: 10
  rel_url: true

# Navigation configuration
nav_external_links:
  - title: GitHub
    url: https://github.com/DEFRA/forms-designer
    hide_icon: false

# Auxiliary links
aux_links:
  "DXT on GitHub":
    - "https://github.com/DEFRA/forms-designer"

# Include all necessary file types
include:
  - "**/*.html"
  - "**/*.json"
  - "**/*.schema.json"
  - "schemas/**/*"
  - "assets/js/*.js"

# Tell Jekyll to EXCLUDE these directories completely
exclude:
  - "vendor"
  - "vendor/bundle/"
  - "vendor/cache/"
  - "vendor/gems/"
  - "vendor/ruby/"
  - "Gemfile"
  - "Gemfile.lock"

# Markdown processing
markdown: kramdown
kramdown:
  input: GFM
  syntax_highlighter: rouge
  syntax_highlighter_opts:
    block:
      line_numbers: false

# Color scheme
color_scheme: light

# Plugin configuration
plugins:
  - jekyll-remote-theme
  - jekyll-relative-links
  - jekyll-seo-tag

# Asset configuration
assets:
  self_contained: false
  js_directory: /assets/js
  compress:
    js: false

# Link handling
relative_links:
  enabled: true
  collections: true

# Default layouts and configurations
defaults:
  # Process JS files with Liquid but no layout
  - scope:
      path: "assets/js"
    values:
      layout: null
      sitemap: false
      render_with_liquid: true
  # Then define all other defaults below
  - scope:
      path: "assets/css"
    values:
      layout: null
      render_with_liquid: true
  - scope:
      path: ""
      type: "pages"
    values:
      layout: default
      render_with_liquid: false
  - scope:
      path: "schemas"
    values:
      layout: default
      parent: "Schema Reference"


# Table of contents configuration
toc:
  min_level: 1
  max_level: 2  # Only show h1 and h2 in TOC

# Custom scripts
head_scripts:
  - /assets/js/fix-links.js

# Handle assets correctly
keep_files:
  - assets
EOF

echo "📝 Copying link-fixer JavaScript..."
mkdir -p site-src/assets/js
cp .github/scripts/docs/assets/js/fix-links.js site-src/assets/js/

mkdir -p site-src/_includes
cat > site-src/_includes/head_custom.html << 'EOF'
<meta name="baseurl" content="{{ site.baseurl }}">
EOF

echo "📝 Copying custom SCSS styling overrides..."
mkdir -p site-src/_sass/custom
cp .github/scripts/docs/assets/scss/custom.scss site-src/_sass/custom/custom.scss

# Features section - explicit configuration
- scope:
    path: "features"
  values:
    nav_exclude: false

- scope:
    path: "features/index.md"
  values:
    layout: default
    title: "Features"
    nav_order: 4
    has_children: true
    permalink: /features/
    nav_exclude: false

- scope:
    path: "features/code-based/index.md"
  values:
    layout: default
    title: "Code-based Features"
    parent: "Features"
    has_children: true
    nav_order: 1
    nav_exclude: false

- scope:
    path: "features/configuration-based/index.md"
  values:
    layout: default
    title: "Configuration-based Features"
    parent: "Features"
    has_children: true
    nav_order: 2
    nav_exclude: false

echo "✅ Jekyll configuration files created successfully!"
