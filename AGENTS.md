# Documentation

## What is generated vs hand-written

Before modifying anything under `docs/`, read the scripts in the `scripts/` directory to determine whether the target file is generated. Generated files are overwritten on every script run; edits to them will be lost. If a file is generated, modify the relevant script or its data sources instead of editing the output directly, then re-run the script to rebuild.

## Preview wrapper classes

All generated component and page previews include `app-no-prose` on their wrapper `<div>` by default. This prevents Docusaurus prose CSS from interfering with GOV.UK component styles. Do not remove it.
