# Personnel Tracking System Pro

Personnel Tracking System Pro is a static, offline-ready personnel dashboard designed to be easy to brand, package, and sell as a lightweight HR admin product.

## Highlights

- Modern dashboard layout with professional visual polish
- Personnel editor with department, status, salary, notes, and optional email/start date
- Search, status filtering, department filtering, and sorting
- JSON backup export, filtered CSV export, and JSON import
- Demo dataset for screenshots, previews, and buyer walkthroughs
- PWA manifest, service worker, favicon, and mobile icons
- No backend or database required

## Files Included

- `index.html`: main app shell
- `style.css`: complete responsive UI styling
- `app.js`: state management, filters, import/export, and rendering
- `sw.js`: offline cache support
- `site.webmanifest`: installable app metadata
- `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`: product icons
- `PRODUCT-LISTING.md`: ready-to-adapt product copy for marketplaces
- `CHANGELOG.md`: release notes for the current package
- `scripts/build-product.ps1`: creates the distributable zip

## Quick Start

1. Open `index.html` directly in a browser for a quick preview.
2. Use the VS Code debug profile if you want browser debugging.
3. Load demo data from the hero actions to populate the dashboard.
4. Export JSON to create a portable backup.

## Package Build

Run the checks:

```bash
npm run check
```

Build the sale package:

```bash
npm run build:package
```

The distributable zip is created inside `dist/`.

## GitHub Pages Publish

Prepare the GitHub Pages bundle:

```bash
npm run build:pages
```

This creates a clean publishable site in `dist/pages/`.

For automatic deployment, this repo now includes `.github/workflows/deploy-pages.yml`.
After pushing the project to a GitHub repository:

1. Open the repository on GitHub.
2. Go to `Settings > Pages`.
3. Set `Source` to `GitHub Actions`.
4. Push to `main` or `master` and the site will deploy automatically.

## Customization Ideas

- Replace the product title, colors, and copy with your own brand
- Add company logos or white-label onboarding text
- Change supported currencies in `app.js`
- Extend records with phone number, manager, branch, or employee ID
- Host a live demo on Netlify, Vercel, or GitHub Pages

## Suggested Sales Positioning

This project fits best as:

- A downloadable HR mini-dashboard template
- A local-first admin tool for small teams
- A quick-start personnel tracker for agencies and freelancers
- A white-label operations dashboard starter

## Final Packaging Checklist

- Replace the brand name if you want a unique marketplace identity
- Capture 4 to 6 screenshots using the demo dataset
- Export a clean JSON backup to include as optional sample data
- Upload the generated zip from `dist/`
- Add your preferred commercial terms before publishing
