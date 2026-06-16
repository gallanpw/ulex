import { route, z } from "../lib/openapi.js";

export default function registerEchoRoutes(app) {
  route(
    app,
    {
      method: "post",
      path: "/echo",
      summary: "Echo back the request body",
      request: {
        body: {
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
      responses: {
        200: {
          description: "Echoed message",
          content: {
            "application/json": {
              schema: z.object({ message: z.string() }),
            },
          },
        },
      },
    },
    (req, res) => {
      res.json({ message: req.body.message });
    }
  );
}
