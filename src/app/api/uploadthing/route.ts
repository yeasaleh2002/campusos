import { createRouteHandler } from "uploadthing/next";
import { env } from "@/lib/env";
import { uploadRouter } from "./core";

// Runs on the Node.js runtime (Next 16 default; `export const runtime` is disallowed with Cache Components).

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
  config: { token: env.UPLOADTHING_TOKEN },
});
