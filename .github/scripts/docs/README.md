# Documentation Scripts

## Developer Guide to Creating and Running the Docs Locally

### Prerequisites
- Ruby and Bundler installed
- Node.js installed
- macOS users need to use Rosetta for Jekyll (x86_64 emulation)

### Steps

1. **Create and prepare the site-src directory:**
```bash
mkdir -p site-src
cp -r docs/* site-src/
cd site-src
```

2. **Run the documentation processing scripts:**
```bash
chmod +x ../.github/scripts/docs/process-docs.sh
../.github/scripts/docs/process-docs.sh

chmod +x ../.github/scripts/docs/fix-docs.sh
../.github/scripts/docs/fix-docs.sh

cd ..
chmod +x .github/scripts/docs/create-jekyll-config.sh
.github/scripts/docs/create-jekyll-config.sh
cd site-src
```

3. **Install Jekyll dependencies:**
```bash
sudo bundle install
```

4. **Start the Jekyll server:**
```bash
arch -x86_64 bundle exec jekyll serve
```

5. **View the documentation:**
Open your browser and go to: http://127.0.0.1:4000/forms-engine-plugin/

To stop the server: Press `Ctrl+C`
