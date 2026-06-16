// Minimal "build-your-own" OpenAPI layer for ultimate-express, in the same
// spirit as @hono/zod-openapi: Zod schemas are the single source of truth
// for both runtime request validation and the generated OpenAPI document.
//
// Building blocks used (not full frameworks, just primitives):
// - zod                          -> schema definition + validation
// - @asteasolutions/zod-to-openapi -> Zod schema -> OpenAPI JSON conversion
//
// Everything else (route registration, request validation middleware,
// docs UI) is our own glue code.

import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";

// adds `.openapi({...})` metadata method to zod schemas
extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

/**
 * Converts an OpenAPI-style path ("/users/{id}") to an
 * ultimate-express/Express-style path ("/users/:id").
 */
function toExpressPath(openApiPath) {
  return openApiPath.replace(/\{([^}]+)\}/g, ":$1");
}

/**
 * Builds a middleware that validates one part of the request
 * (params | query | body) against a Zod schema. On failure, responds
 * with 400 + structured issues (similar to FastAPI's 422 behavior).
 * On success, replaces req[part] with the parsed/coerced data.
 */
function validate(part, schema) {
  return (req, res, next) => {
    const data = part === "body" ? req.body : req[part];
    const result = schema.safeParse(data);
    if (!result.success) {
      return res.status(400).json({
        error: "ValidationError",
        part,
        issues: result.error.issues,
      });
    }
    req[part] = result.data;
    next();
  };
}

/**
 * Registers a route on the given app AND records it in the OpenAPI
 * registry, using a single Zod-described config as source of truth.
 *
 * config = {
 *   method: "get" | "post" | ...,
 *   path: "/items/{id}",            // OpenAPI-style path
 *   summary, description, tags,
 *   request: {
 *     params: z.object({...}),
 *     query: z.object({...}),
 *     body: { content: { "application/json": { schema: z.object({...}) } } },
 *   },
 *   responses: {
 *     200: { description, content: { "application/json": { schema } } },
 *   },
 * }
 */
export function route(app, config, ...handlers) {
  registry.registerPath(config);

  const middlewares = [];
  if (config.request?.params) {
    middlewares.push(validate("params", config.request.params));
  }
  if (config.request?.query) {
    middlewares.push(validate("query", config.request.query));
  }
  const bodySchema = config.request?.body?.content?.["application/json"]?.schema;
  if (bodySchema) {
    middlewares.push(validate("body", bodySchema));
  }

  app[config.method](toExpressPath(config.path), ...middlewares, ...handlers);
}

/** Generates the OpenAPI 3.0 document from everything registered so far. */
export function generateSpec(info) {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: "3.0.0",
    info: {
      title: info?.title ?? "API",
      version: info?.version ?? "1.0.0",
      description: info?.description,
    },
  });
}

/**
 * Mounts the JSON spec + Swagger UI docs page on the app.
 * Default: GET /openapi.json, GET /docs
 */
export function mountDocs(app, { specPath = "/openapi.json", docsPath = "/docs", info } = {}) {
  app.get(specPath, (req, res) => {
    res.json(generateSpec(info));
  });

  app.get(docsPath, (req, res) => {
    res.type("html").send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${info?.title ?? "API"} docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        SwaggerUIBundle({ url: "${specPath}", dom_id: "#swagger-ui" });
      };
    </script>
  </body>
</html>`);
  });
}

export { z };
