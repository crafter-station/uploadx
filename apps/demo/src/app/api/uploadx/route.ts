import { createNextRouteHandler } from "uploadx/next";
import { fileRouter } from "@/lib/uploadx";

export const { GET, POST } = createNextRouteHandler({ router: fileRouter });
