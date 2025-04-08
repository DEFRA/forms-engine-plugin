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

# Link handling
relative_links:
  enabled: true
  collections: true

# Default layouts and configurations
defaults:
  - scope:
      path: "assets/js/**/*.js"
    values:
      layout: null
  - scope:
      path: ""
      type: "pages"
    values:
      layout: default
  - scope:
      path: "schemas"
    values:
      layout: default
      parent: "Schema Reference"
  - scope:
      path: "schemas/index.html"
    values:
      nav_order: 5
      has_children: true
  - scope:
      path: "features"
    values:
      parent: "Features"

# Table of contents configuration
toc:
  min_level: 1
  max_level: 2  # Only show h1 and h2 in TOC

assets:
  self_contained: false
  js_directory: /assets/js
  compress:
    js: false

# Custom scripts
head_scripts:
  - /assets/js/fix-links.js

# Handle assets correctly
keep_files:
  - assets

exclude:
  - "/assets/js/just-the-docs.js"  # Exclude from processing, not from output
  - "/assets/js/vendor/lunr.min.js"
  - "vendor"
  - "Gemfile"
  - "Gemfile.lock"

# Explicitly tell Jekyll NOT to process certain file types
keep_files:
  - assets

# Add custom CSS for better styling
echo "📝 Creating custom CSS file..."
mkdir -p site-src/assets/css
cat > site-src/assets/css/custom.scss << 'EOF'
@import "./just-the-docs-default.scss";

// Improve readability
body {
  font-size: 16px;
  line-height: 1.6;
}

// Better code blocks
div.highlighter-rouge {
  padding: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 1rem;
  background-color: #f5f5f5;
  border-radius: 4px;
}

// Fix navigation for nested items
.navigation-list-item {
  margin: 0.5rem 0;
}

// Improve table styling
table {
  width: 100%;
  margin-bottom: 1rem;
  border-collapse: collapse;

  th, td {
    padding: 0.75rem;
    vertical-align: top;
    border: 1px solid #e3e3e3;
  }

  th {
    background-color: #f5f5f5;
  }
}

// Schema documentation styling
.schema-section {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
}

// Custom styles for Just the Docs callouts
.note, .warning, .important, .highlight {
  border-radius: 0.25rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.note {
  background-color: #e6f3ff;
  border-left: 0.25rem solid #2869e6;
}

.warning {
  background-color: #ffeeee;
  border-left: 0.25rem solid #ee0000;
}
EOF

# Add Javascript to fix any remaining links
echo "📝 Creating link-fixer JavaScript..."
mkdir -p site-src/assets/js
cat > site-src/assets/js/fix-links.js << 'EOF'
document.addEventListener('DOMContentLoaded', function() {
  // Fix all links that should have the baseurl
  document.querySelectorAll('a[href^="/"]').forEach(function(link) {
    if (!link.href.includes('/forms-engine-plugin') && 
        !link.href.match(/^https?:\/\//) && a
        !link.getAttribute('href').startsWith('/forms-engine-plugin')) {
      const href = link.getAttribute('href');
      link.href = '/forms-engine-plugin' + href;
    }
  });
});
EOF

# Create custom includes directory to add baseurl meta tag
mkdir -p site-src/_includes
cat > site-src/_includes/head_custom.html << 'EOF'
<meta name="baseurl" content="{{ site.baseurl }}">
EOF

echo "✅ Jekyll configuration files created successfully!"
