# modelKalshi (Next.js)

The project has been reorganized into a Next.js + React app.

## Current App Stack

- Next.js App Router
- React
- Static export (`next build` with `output: 'export'`)
- GitHub Pages deployment from `out/`

## Routes

- `/` landing page
- `/quiz` input form
- `/dashboard` dynamic contract recommendation from user inputs
- `/live-demo` step-by-step explanation page
- `/documentation` docs page
- `/about` team + contact
- `/paper` embedded PDF

## Unhardcoded Contract Sizing

Contract sizing is input-driven and no longer fixed:

```txt
contracts = salary * 6 / 12
```

This is applied from query/user inputs on `/dashboard` and `/live-demo`.

## Development

```bash
npm install
npm run dev
```

## Build / Export

```bash
npm run build
```

Output is exported to `out/`.

## Legacy Code

The previous Python/Flask + static HTML implementation has been moved to:

- `legacy-python/`
