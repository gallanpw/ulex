import { route, z } from "../lib/openapi.js";

export default function registerGreetRoutes(app) {
  route(
    app,
    {
      method: "get",
      path: "/greet/{name}",
      summary: "Greet someone by name",
      request: {
        params: z.object({
          name: z.string().min(1).openapi({ example: "Gallan" }),
        }),
      },
      responses: {
        200: {
          description: "Greeting message",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (req, res) => {
      res.json({ message: `Hello, ${req.params.name}!` });
    }
  );
}
