import express from "ultimate-express";
import { mountDocs } from "./lib/openapi.js";
import registerGreetRoutes from "./routes/greet.routes.js";
import registerEchoRoutes from "./routes/echo.routes.js";

const app = express();
const port = 3000;

app.use(express.json());

// plain hello world (no schema needed)
app.get("/", (req, res) => {
  res.json({ message: "Hello, World!" });
});

registerGreetRoutes(app);
registerEchoRoutes(app);

mountDocs(app, { info: { title: "ulex API", version: "1.0.0" } });

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Docs available at http://localhost:${port}/docs`);
});
