import { fileRouter } from "@/lib/uploadx";
import { createNextRouteHandler } from "@uploadx-sdk/core/next";

export const { GET, POST } = createNextRouteHandler({ router: fileRouter });
