# ulex

Node.js API project on **`ultimate-express`** (drop-in Express-compatible
framework backed by `uWebSockets.js` for performance). Name "ulex" =
**ul**timate-**ex**press.

This file exists so any contributor (human or AI) picking up this repo has
context without re-deriving past decisions.

## Stack

- **Runtime**: Node.js (ESM, `"type": "module"`)
- **Package manager**: pnpm (pinned via `devEngines.packageManager`, exact
  version, no range — pnpm requires exact semver there)
- **Web framework**: `ultimate-express` (Express-compatible API)
- **Schema/validation**: `zod`
- **OpenAPI docs**: `@asteasolutions/zod-to-openapi` (Zod schema is the
  single source of truth for both request validation and the generated
  OpenAPI spec — same idea as `@hono/zod-openapi`, but built in-house here
  as `lib/openapi.js` instead of pulling a framework)

## Project structure

```
index.js                  # bootstrap: app, global middleware, mount routers, listen
lib/openapi.js              # custom schema-driven route + OpenAPI docs layer
routes/*.routes.js          # one file per domain/resource, registers its own routes
pnpm-workspace.yaml          # pnpm project-level settings (see below)
```

### Adding a new route

Create `routes/<name>.routes.js`:

```js
import { route, z } from "../lib/openapi.js";

export default function registerXRoutes(app) {
  route(
    app,
    {
      method: "get",          // get | post | put | delete | patch ...
      path: "/things/{id}",    // OpenAPI-style path (auto-converted to :id for express)
      summary: "...",
      request: {
        params: z.object({ id: z.string() }),
        query: z.object({ ... }),   // optional
        body: { content: { "application/json": { schema: z.object({...}) } } }, // optional
      },
      responses: {
        200: {
          description: "...",
          content: { "application/json": { schema: z.object({...}) } },
        },
      },
    },
    (req, res) => { /* handler */ }
  );
}
```

Then register it in `index.js`:

```js
import registerXRoutes from "./routes/x.routes.js";
registerXRoutes(app);
```

`route()` does three things from one config: registers the express route,
validates params/query/body at runtime (400 on failure), and adds the
endpoint to the generated OpenAPI doc. No manual spec writing.

## Scripts

```bash
pnpm start   # node index.js (plain, no watch)
pnpm dev     # nodemon index.js (auto-reload on file change)
```

⚠️ **Do not use `node --watch index.js`.** `ultimate-express` spawns
internal `worker_threads` (e.g. for static file serving); `node --watch`'s
reload mechanism races with that worker's message handling and crashes
with `TypeError: Cannot read properties of undefined (reading 'resolve')`.
Confirmed: same code runs fine with plain `node index.js`, only crashes
with `--watch`. Use `nodemon` instead (full process restart, no race).

## Endpoints (once running)

- `GET /` — plain hello world (no schema)
- `GET /greet/{name}` — schema-validated example
- `POST /echo` — schema-validated body example
- `GET /openapi.json` — generated OpenAPI 3.0 spec
- `GET /docs` — Swagger UI, reads from `/openapi.json`

## Known project-level quirks

- **`pnpm-workspace.yaml` has `blockExoticSubdeps: false`.** pnpm 11
  defaults to blocking transitive dependencies resolved from git/tarball
  URLs (supply-chain hardening). `ultimate-express` depends on
  `uWebSockets.js`, which is distributed via git tag (not npm registry) —
  this is normal for that package, not a red flag. Disabling the check
  was a deliberate, scoped trade-off to allow installing it. If adding
  other packages later trips the same `ERR_PNPM_EXOTIC_SUBDEP` error,
  evaluate each case before assuming it's safe to keep this off long-term.
- **`devEngines.packageManager.version` must be an exact version**
  (`"11.4.0"`), not a range (`"^11.4.0"`) — pnpm rejects ranges there.

## Token-optimized commands (RTK)

This environment proxies common shell commands through `rtk` for reduced
token usage (configured in `~/.claude/CLAUDE.md` / project `CLAUDE.md`).
Prefix dev commands accordingly, e.g. `rtk pnpm add <pkg>`, `rtk git status`.
