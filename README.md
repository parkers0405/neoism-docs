# Neoism documentation

One public source for the Neoism handbook, Agent OpenAPI reference, offline documentation website, and agent Docs tool. Both the application and public website pin this repository as `vendor/neoism-docs`.

## Edit and verify

Use Node.js 22.18+ or 24+. Edit Markdown under `content/`, preserve the exact legacy paths in `manifest.json`, and update `reference/openapi.json` when the Agent contract changes. Titles in the manifest must match each page's h1. The manifest version identifies the pinned documentation, not necessarily the consuming application version.

```sh
node scripts/content-bundle.mjs        # regenerate committed bundle, no dependencies
node scripts/content-bundle.mjs --check
npm ci
npm test
npm run build
npm run test:e2e                      # needs Playwright Chromium installed
```

Install the headless browser with `npx playwright install chromium` when necessary. Browser tests serve only the built artifact on loopback, reject external requests, and cover static/no-JS reading, legacy links, search, Scalar, and machine-bundle identity. `npm run dev` runs the renderer's development server. To preview the exact packaged output, run `node scripts/serve.mjs` and open <http://127.0.0.1:43181/api/docs/>. Stop that preview with Ctrl+C.

`npm run build` produces `dist/`: handbook and Scalar under `/api/docs/`, bundled JS/CSS/fonts under `/docs-assets/`, the exact committed machine bundle at `/content.json`, the source inventory at `/manifest.json`, and the OpenAPI contract at `/reference/openapi.json`. `artifact.json` inventories every other file with sizes and SHA-256 hashes. No external CDN, analytics, font service, hosted API, or online runtime is required. Serve the entire directory over HTTP; do not open it with `file://`.

## Consume

See [CONTRACT.md](CONTRACT.md) for the stable source, machine bundle, route, hashing, and runtime contracts. Rust embeds `bundle/content.json` directly, without Node during Cargo compilation. Packaging runs `npm ci && npm run build` and stages `dist/` under application `resources/docs/`. The website imports the exact same artifact into its Vite output while retaining its own marketing and artwork. No production deployment is performed by this repository's build.

Publish a reviewed docs commit, update both consuming submodule pins to it, and rebuild their artifacts. A fresh recursive checkout is sufficient; no sibling checkout or automatic source snapshot is used. CI rejects a stale generated bundle and runs unit, build, and offline browser checks.

[SOURCES.md](SOURCES.md) records migration origins and verification limits. [LICENSE](LICENSE), [NOTICE](NOTICE), and `legal/` retain applicable notices. The generator is dependency-light; the renderer intentionally reuses the existing website design and Scalar foundation.
