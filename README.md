# Rsbuild project

## Setup

Install the dependencies:

```bash
bun install
```

## Get started

Start the dev server, and the app will be available at [http://localhost:3000](http://localhost:3000).

```bash
bun run dev
```

## Browser tests

Install the Playwright Chromium browser once on each machine:

```bash
bunx playwright install chromium
```

Run the end-to-end suite:

```bash
bun run test:e2e
```

The suite starts its own Rsbuild development server at `http://127.0.0.1:4173`.
API requests are intercepted and answered with deterministic test fixtures; the
tests do not authenticate against or mutate production data.

For interactive debugging, use `bun run test:e2e:ui` or
`bun run test:e2e:headed`. Open the latest HTML report with
`bun run test:e2e:report`.

Coverage includes login validation and errors, auth/store route guards, catalog
search and category filtering, pagination, item details, bundle component
restrictions and persistence, and API failure/retry behavior.

Build the app for production:

```bash
bun run build
```

Preview the production build locally:

```bash
bun run preview
```

## Learn more

To learn more about Rsbuild, check out the following resources:

- [Rsbuild documentation](https://rsbuild.rs) - explore Rsbuild features and APIs.
- [Rsbuild GitHub repository](https://github.com/web-infra-dev/rsbuild) - your feedback and contributions are welcome!
