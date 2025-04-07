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

# URL configuration
url: ""
baseurl: ""
permalink: pretty

# Search and heading configuration
search_enabled: true
heading_anchors: true
search:
  heading_level: 3

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
      path: ""
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
EOF

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
EOF

echo "✅ Jekyll configuration files created successfully!"