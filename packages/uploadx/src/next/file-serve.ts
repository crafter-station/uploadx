import { createFileServeHandler } from "../server/file-serve";
import type { UploadxConfig } from "../shared/types";

/**
 * Creates a Next.js App Router handler that serves files from MinIO.
 *
 * Mount as a catch-all route: `app/api/uploadx/f/[...key]/route.ts`
 *
 * ```ts
 * import { createNextFileServeHandler } from "@uploadx-sdk/core/next";
 * export const { GET } = createNextFileServeHandler();
 * ```
 */
export function createNextFileServeHandler(config?: UploadxConfig) {
  const serve = createFileServeHandler(config);

  return {
    GET: async (
      _req: Request,
      { params }: { params: Promise<{ key: string[] }> },
    ): Promise<Response> => {
      const { key } = await params;
      const fileKey = key.join("/");
      return serve(fileKey);
    },
  };
}
