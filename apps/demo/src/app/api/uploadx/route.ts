import { createNextRouteHandler } from "@uploadx-sdk/core/next";
import { fileRouter } from "@/lib/uploadx";

export const { GET, POST } = createNextRouteHandler({ router: fileRouter });
