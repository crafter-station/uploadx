import { Readable } from "node:stream";
import { createMinioClient, getObject, verifyObjectExists } from "../minio/client";
import type { UploadxConfig } from "../shared/types";
import { resolveBucket, resolveMinioConfigAsync } from "./config";

/**
 * Creates a handler that serves files from MinIO by streaming them through
 * the server. Returns stable, permanent URLs (no expiry) — similar to
 * UploadThing's `ufs.sh` CDN URLs.
 *
 * ```ts
 * const serve = createFileServeHandler();
 * const response = await serve("path/to/file.png");
 * ```
 */
export function createFileServeHandler(config?: UploadxConfig) {
  return async (key: string): Promise<Response> => {
    if (!key) {
      return new Response(JSON.stringify({ error: "Missing file key" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const minioConfig = await resolveMinioConfigAsync(config?.minio);
    const client = createMinioClient(minioConfig);
    const bucket = resolveBucket(minioConfig);

    const stat = await verifyObjectExists(client, bucket, key);
    if (!stat) {
      return new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const nodeStream = await getObject(client, bucket, key);

    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
      status: 200,
      headers: {
        "Content-Type": stat.contentType,
        "Content-Length": String(stat.size),
        ETag: stat.etag,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Disposition": "inline",
      },
    });
  };
}
